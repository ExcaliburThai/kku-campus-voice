import 'dotenv/config';

import express from 'express';

import cors from 'cors';

import helmet from 'helmet';

import rateLimit from 'express-rate-limit';

import mysql from 'mysql2/promise';

import crypto from 'node:crypto';

import jwt from 'jsonwebtoken';

import bcrypt from 'bcryptjs';

import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

import path from 'node:path';

import fs from 'node:fs';

import {fileURLToPath} from 'node:url';

import { z } from 'zod';

const app=express();

// Render forwards requests through a trusted reverse proxy.
app.set('trust proxy', 1);

// Friendly root endpoint. Database connectivity is checked separately at /api/health.
app.get('/', (req, res) => res.json({
  ok: true,
  message: 'KKU Campus Voice API is running',
  health: '/api/health'
}));

const uploadsDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../uploads');

fs.mkdirSync(uploadsDir,{recursive:true});

// Keep uploads in memory: Render's local filesystem is not persistent.
const allowedImages=['image/jpeg','image/png','image/webp'];
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1},fileFilter:(req,file,cb)=>cb(null,allowedImages.includes(file.mimetype))});

cloudinary.config({
 cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
 api_key:process.env.CLOUDINARY_API_KEY,
 api_secret:process.env.CLOUDINARY_API_SECRET,
 secure:true
});
const cloudFolder='kku-campus-voice-sc69';
function validImage(buf,mime){
 if(!buf)return false;
 return (mime==='image/jpeg'&&buf[0]===255&&buf[1]===216&&buf[2]===255)||
  (mime==='image/png'&&buf.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))||
  (mime==='image/webp'&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP');
}
function cloudUpload(buf,kind){
 if(!process.env.CLOUDINARY_CLOUD_NAME||!process.env.CLOUDINARY_API_KEY||!process.env.CLOUDINARY_API_SECRET)
  throw Error('Cloudinary credentials are missing');
 const publicId=`${cloudFolder}/${kind}/${crypto.randomUUID()}`;
 return new Promise((resolve,reject)=>{
  const stream=cloudinary.uploader.upload_stream({public_id:publicId,resource_type:'image',overwrite:false},(err,result)=>err?reject(err):resolve(result));
  stream.end(buf);
 });
}
function cloudPath(result){return '/uploads/cloudinary/'+result.public_id;}
function cloudIdFromPath(value){
 const prefix='/uploads/cloudinary/';
 if(typeof value!=='string'||!value.startsWith(prefix))return null;
 const id=value.slice(prefix.length);
 return /^kku-campus-voice-sc69\/(issues|progress|avatars)\/[0-9a-f-]{36}$/.test(id)?id:null;
}
async function removeCloudImage(publicId){
 try{await cloudinary.uploader.destroy(publicId,{resource_type:'image'});}catch(e){console.warn('Cloudinary cleanup failed:',e.message);}
}

const rawPool=mysql.createPool({

 host:process.env.MYSQL_HOST||'127.0.0.1',

 port:Number(process.env.MYSQL_PORT||3306),

 user:process.env.MYSQL_USER||'root',

 password:process.env.MYSQL_PASSWORD||'',

 database:process.env.MYSQL_DATABASE||'kku_campus_voice',

 waitForConnections:true,connectionLimit:10,decimalNumbers:true,

 timezone:'+07:00',
 // TiDB Cloud public endpoints require encrypted connections.
 ssl: process.env.MYSQL_SSL === 'false' ? undefined : { minVersion: 'TLSv1.2', rejectUnauthorized: true }

});

// Adapter สำหรับรักษารูปแบบ result.rows ที่ใช้ใน API เดิม

function mysqlQuery(db, sql, params = []) {

  const values = [];

  const statement = sql.replace(/\$(\d+)/g, (_, index) => {

    values.push(params[Number(index) - 1]);

    return '?';

  });

  return db.execute(statement, values).then(([rows]) => ({

    rows: Array.isArray(rows) ? rows : [],

    rowCount: rows.affectedRows || 0,

    insertId: rows.insertId

  }));

}

const pool={

 query:(sql,params)=>mysqlQuery(rawPool,sql,params),

 connect:async()=>{

  const conn=await rawPool.getConnection();

  return {query:(sql,params)=>{

    if(sql==='BEGIN')return conn.beginTransaction();

    if(sql==='COMMIT')return conn.commit();

    if(sql==='ROLLBACK')return conn.rollback();

    return mysqlQuery(conn,sql,params);

  },release:()=>conn.release()};

 }

};

app.use(

  helmet({

    crossOriginResourcePolicy: {

      policy: "cross-origin"

    }

  })

);

app.use(cors({origin:(process.env.FRONTEND_ORIGIN||'http://localhost:5173').split(',')}));

app.use(express.json({limit:'30kb'}));

// Preserve existing frontend /uploads/... URL convention; redirect to Cloudinary CDN.
app.get('/uploads/cloudinary/:project/:kind/:imageId',(req,res)=>{
 const {project,kind,imageId}=req.params;
 const id=`${project}/${kind}/${imageId}`;
 if(!cloudIdFromPath('/uploads/cloudinary/'+id))return res.sendStatus(404);
 res.redirect(302,cloudinary.url(id,{resource_type:'image',secure:true}));
});
app.use('/uploads',express.static(uploadsDir,{dotfiles:'deny',setHeaders:(res)=>res.setHeader('X-Content-Type-Options','nosniff')}));

const limiter=rateLimit({windowMs:15*60*1000,limit:100,standardHeaders:'draft-7',legacyHeaders:false});

app.use('/api',limiter);

const submitLimiter=rateLimit({windowMs:60*60*1000,limit:12});

const statusValues=['pending','accepted','in_progress','forwarded','resolved','rejected'];

const publicFields=`i.id,i.tracking_code,i.title,i.description,i.status,i.latitude,i.longitude,i.created_at,i.updated_at,c.name AS category,c.icon,l.name AS location_name,i.image_path,i.accepted_at,i.forwarded_at,i.started_at,i.resolved_at,i.assigned_to,i.forwarded_to,(SELECT h.note FROM issue_history h WHERE h.issue_id=i.id ORDER BY h.changed_at DESC LIMIT 1) AS latest_note, (SELECT COUNT(*) FROM issue_confirmations ic WHERE ic.issue_id=i.id) AS confirmation_count`;

const joins='FROM issues i JOIN categories c ON c.id=i.category_id LEFT JOIN locations l ON l.id=i.location_id';

const fail=(res,e)=>{
  console.error('[API ERROR]', {code:e?.code, errno:e?.errno, sqlMessage:e?.sqlMessage, message:e?.message});
  res.status(500).json({error:'เกิดข้อผิดพลาดของเซิร์ฟเวอร์'});
};

const parseId=v=>/^\d+$/.test(String(v))?Number(v):null;

const issueSchema=z.object({

 title:z.string().trim().min(5).max(160),description:z.string().trim().min(10).max(4000),

 categoryId:z.number().int().positive(),locationId:z.number().int().positive().nullable().optional(),

 latitude:z.number().min(-90).max(90).nullable().optional(),longitude:z.number().min(-180).max(180).nullable().optional(),

 visibility:z.enum(['public','private']).default('public'),

 contactEmail:z.union([z.literal(''),z.string().email().max(200)]).optional(),

 contactPhone:z.string().max(30).optional()

}).refine(v=>(v.latitude==null)===(v.longitude==null),{message:'กรุณาระบุพิกัดทั้งคู่'});

app.get('/api/health',async(req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true});}catch(e){fail(res,e);}});

app.get('/api/categories',async(req,res)=>{try{res.json((await pool.query('SELECT * FROM categories ORDER BY id')).rows);}catch(e){fail(res,e);}});

app.get('/api/locations',async(req,res)=>{try{res.json((await pool.query('SELECT * FROM locations ORDER BY id')).rows);}catch(e){fail(res,e);}});

app.get('/api/public/dashboard',async(req,res)=>{try{

 const [s,c,items]=await Promise.all([

 pool.query(`SELECT COUNT(*) total,SUM(status='pending') pending,SUM(status='accepted') accepted,SUM(status='in_progress') inProgress,SUM(status='forwarded') forwarded,SUM(status='resolved') resolved,SUM(status='rejected') rejected FROM issues WHERE visibility='public'`),

 pool.query(`SELECT c.name,COUNT(*) count FROM issues i JOIN categories c ON c.id=i.category_id WHERE i.visibility='public' GROUP BY c.id,c.name ORDER BY count DESC`),

 pool.query(`SELECT ${publicFields} ${joins} WHERE i.visibility='public' ORDER BY i.created_at DESC LIMIT 6`)

 ]);

 res.json({updatedAt:new Date().toISOString(),summary:Object.fromEntries(Object.entries(s.rows[0]).map(([key,value])=>[key,Number(value||0)])),categories:c.rows,recentIssues:items.rows});

 }catch(e){fail(res,e);}});

app.get('/api/public/issues', async (req, res) => {

  try {

    const status = statusValues.includes(req.query.status) ? req.query.status : null;

    const categoryId = parseId(req.query.categoryId);

    const limit = Math.min(Math.max(parseId(req.query.limit) || 100, 1), 500);

    const q = String(req.query.q || '').trim().slice(0, 100);

    const conditions = ["i.visibility='public'"];

    const values = [];

    if (status) { values.push(status); conditions.push(`i.status=$${values.length}`); }

    if (categoryId) { values.push(categoryId); conditions.push(`i.category_id=$${values.length}`); }

    if (q) {

      values.push(`%${q}%`);

      conditions.push(`(i.title LIKE $${values.length} OR l.name LIKE $${values.length})`);

    }

    // LIMIT is a validated integer, not user-supplied SQL text.

    const result = await pool.query(

      `SELECT ${publicFields} ${joins} WHERE ${conditions.join(' AND ')} ORDER BY i.created_at DESC LIMIT ${limit}`,

      values

    );

    res.json(result.rows);

  } catch (e) { fail(res, e); }

});

app.get('/api/public/issues/:id',async(req,res)=>{

  try {

    const id=parseId(req.params.id);

    if(!id)return res.status(400).json({error:'รหัสเรื่องไม่ถูกต้อง'});

    const result=await pool.query(`SELECT ${publicFields} ${joins} WHERE i.id=$1 AND i.visibility='public'`,[id]);

    if(!result.rows.length)return res.status(404).json({error:'ไม่พบเรื่องร้องเรียนสาธารณะ'});

    const history=(await pool.query('SELECT status,note,changed_at FROM issue_history WHERE issue_id=$1 ORDER BY changed_at DESC',[id])).rows;

    res.json({...result.rows[0],history});

  }catch(e){fail(res,e);}

});

app.post('/api/issues',submitLimiter,async(req,res)=>{

 const parsed=issueSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'ข้อมูลไม่ถูกต้อง',details:parsed.error.flatten()});

 const v=parsed.data;const token=crypto.randomBytes(24).toString('hex');const hash=crypto.createHash('sha256').update(token).digest('hex');

 const code='KKU-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();

 const client=await pool.connect();try{

 await client.query('BEGIN');

 const result=await client.query(`INSERT INTO issues(tracking_code,category_id,location_id,title,description,latitude,longitude,visibility,contact_email,contact_phone,private_token_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[code,v.categoryId,v.locationId??null,v.title,v.description,v.latitude??null,v.longitude??null,v.visibility,v.contactEmail||null,v.contactPhone||null,hash]);

 await client.query('INSERT INTO issue_history(issue_id,status,note) VALUES($1,$2,$3)',[result.insertId,'pending','รับเรื่องเข้าสู่ระบบ']);

 await client.query('COMMIT');res.status(201).json({id:result.insertId,tracking_code:code,status:'pending',created_at:new Date().toISOString(),trackingToken:token});

 }catch(e){await client.query('ROLLBACK');if(e.code==='ER_NO_REFERENCED_ROW_2')return res.status(400).json({error:'หมวดหมู่หรือพื้นที่ไม่ถูกต้อง'});fail(res,e);}finally{client.release();}

});

app.post('/api/issues/:id/image',upload.single('image'),async(req,res)=>{
 let uploaded=null;
 try{
  const id=parseId(req.params.id),token=String(req.body?.token||'');
  if(!id||!req.file||!token)return res.status(400).json({error:'กรุณาเลือกรูปและระบุรหัสติดตาม'});
  const hash=crypto.createHash('sha256').update(token).digest('hex');
  const issue=(await pool.query('SELECT private_token_hash,image_path FROM issues WHERE id=$1',[id])).rows[0];
  if(!issue||issue.image_path||issue.private_token_hash!==hash)return res.status(403).json({error:'ไม่อนุญาตให้อัปโหลด หรือเรื่องนี้มีรูปแล้ว'});
  if(!validImage(req.file.buffer,req.file.mimetype))return res.status(400).json({error:'ไฟล์ไม่ใช่รูปภาพที่รองรับ'});
  uploaded=await cloudUpload(req.file.buffer,'issues');
  const imagePath=cloudPath(uploaded);
  const saved=await pool.query('UPDATE issues SET image_path=$1 WHERE id=$2 AND image_path IS NULL',[imagePath,id]);
  if(!saved.rowCount){await removeCloudImage(uploaded.public_id);return res.status(409).json({error:'เรื่องนี้มีรูปแล้ว'});}
  res.json({image_path:imagePath});
 }catch(e){if(uploaded)await removeCloudImage(uploaded.public_id);fail(res,e);}
});

app.post('/api/public/issues/:id/confirm',async(req,res)=>{try{

 const id=parseId(req.params.id),key=String(req.body?.deviceKey||'');

 if(!id||!/^[-_a-zA-Z0-9]{32,128}$/.test(key))return res.status(400).json({error:'ข้อมูลยืนยันไม่ถูกต้อง'});

 const existing=await pool.query("SELECT id FROM issues WHERE id=$1 AND visibility='public'",[id]);

 if(!existing.rows.length)return res.status(404).json({error:'ไม่พบเรื่องสาธารณะ'});

 const voterHash=crypto.createHash('sha256').update(key).digest('hex');

 await pool.query('INSERT IGNORE INTO issue_confirmations(issue_id,voter_hash) VALUES($1,$2)',[id,voterHash]);

 const count=await pool.query('SELECT COUNT(*) AS count FROM issue_confirmations WHERE issue_id=$1',[id]);

 res.json({count:Number(count.rows[0].count)});

 }catch(e){fail(res,e);}});

app.post('/api/track',async(req,res)=>{try{

 const code=String(req.body?.code||'').trim().slice(0,80);

 const token=String(req.body?.token||'').trim().slice(0,100);

 if(!code||!token)return res.status(400).json({error:'กรุณาระบุรหัสเรื่องและรหัสติดตาม'});

 const result=await pool.query(`SELECT i.*,c.name category,l.name location_name FROM issues i JOIN categories c ON c.id=i.category_id LEFT JOIN locations l ON l.id=i.location_id WHERE i.tracking_code=$1`,[code]);

 const issue=result.rows[0];const digest=crypto.createHash('sha256').update(token).digest('hex');

 if(!issue||!crypto.timingSafeEqual(Buffer.from(digest,'hex'),Buffer.from(issue.private_token_hash,'hex')))return res.status(404).json({error:'ไม่พบเรื่องหรือรหัสติดตามไม่ถูกต้อง'});

 const history=(await pool.query('SELECT status,note,changed_at FROM issue_history WHERE issue_id=$1 ORDER BY changed_at DESC',[issue.id])).rows;

 const {private_token_hash,contact_email,contact_phone,...safe}=issue;res.json({issue:safe,history});

 }catch(e){fail(res,e);}});

const jwtSecret=process.env.JWT_SECRET;

function requireAdmin(req,res,next){try{if(!jwtSecret)throw Error('not configured');const token=(req.headers.authorization||'').replace(/^Bearer /,'');const data=jwt.verify(token,jwtSecret);if(!['admin','staff'].includes(data.role)||!Number.isInteger(data.id))throw Error('role');req.staffId=data.id;next();}catch{return res.status(401).json({error:'ไม่ได้รับอนุญาตหรือเซสชันหมดอายุ'});}}

async function loadStaff(req,res,next){try{const rows=(await pool.query('SELECT id,full_name,email,department,role,is_active,avatar_path FROM staff_users WHERE id=$1',[req.staffId])).rows;const u=rows[0];if(!u||!u.is_active)return res.status(401).json({error:'บัญชีถูกปิดใช้งาน'});req.staff=u;next();}catch(e){fail(res,e)}}

function requireSuperAdmin(req,res,next){if(req.staff?.role!=='admin')return res.status(403).json({error:'เฉพาะผู้ดูแลระบบ'});next()}

app.post('/api/admin/login',rateLimit({windowMs:15*60*1000,limit:10}),async(req,res)=>{

 try{const {email,password}=req.body||{};if(typeof email!=='string'||typeof password!=='string')return res.status(400).json({error:'ข้อมูลไม่ถูกต้อง'});

 const users=(await pool.query('SELECT * FROM staff_users WHERE email=$1 AND is_active=1',[email.trim().toLowerCase()])).rows;

 const user=users[0];if(!user||!(await bcrypt.compare(password,user.password_hash)))return res.status(401).json({error:'อีเมลหรือรหัสผ่านไม่ถูกต้อง'});

 res.json({token:jwt.sign({id:user.id,role:user.role},jwtSecret,{expiresIn:'2h'}),user:{id:user.id,full_name:user.full_name,email:user.email,department:user.department,role:user.role}});

 }catch(e){fail(res,e)}

});

app.get('/api/admin/me',requireAdmin,loadStaff,(req,res)=>res.json(req.staff));

// Profile: staff/admin may edit their own name, department and password only.
app.patch('/api/admin/me',requireAdmin,loadStaff,async(req,res)=>{
 try {
  const parsed=z.object({fullName:z.string().trim().min(2).max(120),department:z.string().trim().max(160)}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'ข้อมูลโปรไฟล์ไม่ถูกต้อง'});
  await pool.query('UPDATE staff_users SET full_name=$1,department=$2 WHERE id=$3',[parsed.data.fullName,parsed.data.department||null,req.staff.id]);
  res.json({ok:true});
 }catch(e){fail(res,e)}
});
app.patch('/api/admin/me/password',requireAdmin,loadStaff,async(req,res)=>{
 try {
  const parsed=z.object({currentPassword:z.string().min(1),newPassword:z.string().min(12).max(128)}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัวอักษร'});
  const user=(await pool.query('SELECT password_hash FROM staff_users WHERE id=$1',[req.staff.id])).rows[0];
  if(!user||!await bcrypt.compare(parsed.data.currentPassword,user.password_hash))return res.status(400).json({error:'รหัสผ่านปัจจุบันไม่ถูกต้อง'});
  await pool.query('UPDATE staff_users SET password_hash=$1 WHERE id=$2',[await bcrypt.hash(parsed.data.newPassword,12),req.staff.id]);
  res.json({ok:true});
 }catch(e){fail(res,e)}
});
const avatarUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:1},fileFilter:(req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))});
app.post('/api/admin/me/avatar',requireAdmin,loadStaff,avatarUpload.single('avatar'),async(req,res)=>{
 let uploaded=null;
 try{
  if(!req.file)return res.status(400).json({error:'กรุณาเลือกรูป JPG PNG หรือ WEBP ขนาดไม่เกิน 2 MB'});
  if(!validImage(req.file.buffer,req.file.mimetype))return res.status(400).json({error:'ไฟล์รูปภาพไม่ถูกต้อง'});
  uploaded=await cloudUpload(req.file.buffer,'avatars');
  const newPath=cloudPath(uploaded);
  await pool.query('UPDATE staff_users SET avatar_path=$1 WHERE id=$2',[newPath,req.staff.id]);
  const old=req.staff.avatar_path;
  const oldCloudId=cloudIdFromPath(old);
  if(oldCloudId)removeCloudImage(oldCloudId);
  else if(old&&/^\/uploads\/avatar-[a-f0-9-]+\.(jpg|png|webp)$/.test(old))fs.promises.unlink(path.join(uploadsDir,path.basename(old))).catch(()=>{});
  res.json({avatar_path:newPath});
 }catch(e){if(uploaded)await removeCloudImage(uploaded.public_id);fail(res,e);}
});

// Only admins can edit another account. Never allow removing the last active admin.
app.patch('/api/admin/staff/:id',requireAdmin,loadStaff,requireSuperAdmin,async(req,res)=>{
 const id=parseId(req.params.id);
 const parsed=z.object({fullName:z.string().trim().min(2).max(120),email:z.string().trim().email().max(190),department:z.string().trim().max(160),role:z.enum(['admin','staff']),isActive:z.boolean(),newPassword:z.union([z.literal(''),z.string().min(12).max(128)]).optional()}).safeParse(req.body);
 if(!id||!parsed.success)return res.status(400).json({error:'ข้อมูลเจ้าหน้าที่ไม่ถูกต้อง'});
 const v=parsed.data,conn=await pool.connect();
 try{
  await conn.query('BEGIN');
  const found=(await conn.query('SELECT id,role,is_active FROM staff_users WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!found){await conn.query('ROLLBACK');return res.status(404).json({error:'ไม่พบเจ้าหน้าที่'});}
  if(id===req.staff.id&&(v.role!=='admin'||!v.isActive)){
   await conn.query('ROLLBACK');return res.status(400).json({error:'ไม่สามารถลดสิทธิ์หรือปิดบัญชีตัวเองได้'});
  }
  if(found.role==='admin'&&found.is_active&&(v.role!=='admin'||!v.isActive)){
   const admins=(await conn.query("SELECT COUNT(*) AS total FROM staff_users WHERE role='admin' AND is_active=1")).rows[0];
   if(Number(admins.total)<=1){await conn.query('ROLLBACK');return res.status(400).json({error:'ต้องมีผู้ดูแลระบบที่เปิดใช้งานอย่างน้อยหนึ่งบัญชี'});}
  }
  const hash=v.newPassword?await bcrypt.hash(v.newPassword,12):null;
  await conn.query('UPDATE staff_users SET full_name=$1,email=$2,department=$3,role=$4,is_active=$5,password_hash=COALESCE($6,password_hash) WHERE id=$7',
   [v.fullName,v.email.toLowerCase(),v.department||null,v.role,v.isActive?1:0,hash,id]);
  await conn.query('COMMIT');res.json({ok:true});
 }catch(e){try{await conn.query('ROLLBACK')}catch{};if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'อีเมลนี้มีบัญชีอยู่แล้ว'});fail(res,e)}finally{conn.release()}
});
app.get('/api/admin/staff',requireAdmin,loadStaff,async(req,res)=>{try{res.json((await pool.query('SELECT id,full_name,email,department,role,is_active,avatar_path FROM staff_users ORDER BY full_name')).rows)}catch(e){fail(res,e)}});

app.post('/api/admin/staff',requireAdmin,loadStaff,requireSuperAdmin,async(req,res)=>{try{

 const v=z.object({fullName:z.string().trim().min(2).max(120),email:z.string().email().max(190),password:z.string().min(12).max(128),department:z.string().max(160).optional(),role:z.enum(['admin','staff'])}).safeParse(req.body);

 if(!v.success)return res.status(400).json({error:'ข้อมูลเจ้าหน้าที่ไม่ถูกต้อง'});

 const d=v.data;const hash=await bcrypt.hash(d.password,12);

 const r=await pool.query('INSERT INTO staff_users(full_name,email,password_hash,department,role) VALUES($1,$2,$3,$4,$5)',[d.fullName,d.email.toLowerCase(),hash,d.department||null,d.role]);

 res.status(201).json({id:r.insertId});

 }catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'อีเมลนี้มีบัญชีอยู่แล้ว'});fail(res,e)}});


app.get('/api/admin/issues', requireAdmin, loadStaff, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        i.id,
        i.tracking_code,
        i.title,
        i.description,
        i.status,
        i.visibility,
        i.created_at,
        i.updated_at,
        i.assigned_department,
        i.assigned_to,
        i.forwarded_to,
        i.accepted_at,
        i.forwarded_at,
        i.started_at,
        i.resolved_at,
        i.image_path,
        c.name AS category,
        l.name AS location_name,

        (
          SELECT s.full_name
          FROM issue_history h
          JOIN staff_users s ON s.id = h.actor_staff_id
          WHERE h.issue_id = i.id
            AND h.status = 'accepted'
          ORDER BY h.changed_at DESC, h.id DESC
          LIMIT 1
        ) AS accepted_by_name,

        (
          SELECT s.email
          FROM issue_history h
          JOIN staff_users s ON s.id = h.actor_staff_id
          WHERE h.issue_id = i.id
            AND h.status = 'accepted'
          ORDER BY h.changed_at DESC, h.id DESC
          LIMIT 1
        ) AS accepted_by_email,

        (
          SELECT s.full_name
          FROM issue_history h
          JOIN staff_users s ON s.id = h.actor_staff_id
          WHERE h.issue_id = i.id
            AND h.status = 'forwarded'
          ORDER BY h.changed_at DESC, h.id DESC
          LIMIT 1
        ) AS forwarded_by_name,

        (
          SELECT s.email
          FROM issue_history h
          JOIN staff_users s ON s.id = h.actor_staff_id
          WHERE h.issue_id = i.id
            AND h.status = 'forwarded'
          ORDER BY h.changed_at DESC, h.id DESC
          LIMIT 1
        ) AS forwarded_by_email

      FROM issues i
      JOIN categories c ON c.id = i.category_id
      LEFT JOIN locations l ON l.id = i.location_id
      ORDER BY i.created_at DESC
      LIMIT 300
    `);

    res.json(result.rows.map(issue => ({
      ...issue,
      accepted_by: issue.accepted_by_name
        ? {
            name: issue.accepted_by_name,
            email: issue.accepted_by_email
          }
        : null,
      forwarded_by: issue.forwarded_by_name
        ? {
            name: issue.forwarded_by_name,
            email: issue.forwarded_by_email
          }
        : null
    })));
  } catch (error) {
    fail(res, error);
  }
});

app.patch('/api/admin/issues/:id',requireAdmin,loadStaff,async(req,res)=>{

  const id=parseId(req.params.id);

  const parsed=z.object({

    status:z.enum(statusValues),

    note:z.string().max(1000).optional(),

    assignedDepartment:z.string().max(160).optional(),

    assignedTo:z.string().max(160).optional(),

    forwardedTo:z.string().max(160).optional(),
    forwarded_to:z.string().max(160).optional(),
    destination_status:z.enum(['waiting','accepted','working','done']).optional()

  }).safeParse(req.body);

  if(!id||!parsed.success)return res.status(400).json({error:'ข้อมูลไม่ถูกต้อง'});

  const v=parsed.data;

  const client=await pool.connect();

  try{

    await client.query('BEGIN');

    const current=await client.query('SELECT status,assigned_to,forwarded_to FROM issues WHERE id=$1 FOR UPDATE',[id]);

    if(!current.rows.length){

      await client.query('ROLLBACK');

      return res.status(404).json({error:'ไม่พบเรื่อง'});

    }

    const previous=current.rows[0];

    const assignedTo=v.assignedTo!==undefined?v.assignedTo:(v.assignedDepartment!==undefined?v.assignedDepartment:previous.assigned_to);

    const forwardedTo=v.forwardedTo!==undefined?v.forwardedTo:(v.forwarded_to!==undefined?v.forwarded_to:previous.forwarded_to);

    const changed=v.status!==previous.status||assignedTo!==previous.assigned_to||forwardedTo!==previous.forwarded_to;

    if(changed||v.note){

      await client.query(`UPDATE issues SET

        status=$1,assigned_department=COALESCE($2,assigned_department),

        assigned_to=$3,forwarded_to=$4,

        accepted_at=CASE WHEN $1='accepted' AND accepted_at IS NULL THEN NOW() ELSE accepted_at END,

        forwarded_at=CASE WHEN $1='forwarded' AND forwarded_at IS NULL THEN NOW() ELSE forwarded_at END,

        started_at=CASE WHEN $1='in_progress' AND started_at IS NULL THEN NOW() ELSE started_at END,

        resolved_at=CASE WHEN $1='resolved' AND resolved_at IS NULL THEN NOW()

                         WHEN $1<>'resolved' THEN NULL ELSE resolved_at END,

        updated_at=NOW() WHERE id=$5`,

        [v.status,v.assignedDepartment??null,assignedTo||null,forwardedTo||null,id]);

      const note=v.note||(v.status==='forwarded'&&forwardedTo?'ส่งต่อให้ '+forwardedTo:

        v.status==='accepted'&&assignedTo?'รับเรื่องโดย '+assignedTo:'อัปเดตสถานะ');

      await client.query('INSERT INTO issue_history(issue_id,status,note,actor_staff_id) VALUES($1,$2,$3,$4)',[id,v.status,note,req.staff.id]);

    }

    await client.query('COMMIT');

    res.json({id,status:v.status});

  }catch(e){
    try { await client.query('ROLLBACK'); } catch (rollbackError) { console.error('[ROLLBACK ERROR]', rollbackError); }
    console.error('[ISSUE PATCH ERROR]', {issueId:id, requestedStatus:v.status, code:e?.code, sqlMessage:e?.sqlMessage, message:e?.message});
    fail(res,e);
  }

  finally{client.release();}

});

app.get('/api/admin/issues/:id/history',requireAdmin,loadStaff,async(req,res)=>{try{

 const id=parseId(req.params.id);if(!id)return res.status(400).json({error:'รหัสไม่ถูกต้อง'});

 res.json((await pool.query(`SELECT h.id,h.status,h.note,h.changed_at,h.image_path,s.full_name actor_name,s.email actor_email FROM issue_history h LEFT JOIN staff_users s ON s.id=h.actor_staff_id WHERE h.issue_id=$1 ORDER BY h.changed_at DESC,h.id DESC`,[id])).rows);

 }catch(e){fail(res,e)}});

app.post('/api/admin/issues/:id/progress-image',requireAdmin,loadStaff,upload.single('image'),async(req,res)=>{
 let uploaded=null;
 try{
  const id=parseId(req.params.id);
  if(!id||!req.file)return res.status(400).json({error:'กรุณาเลือกรูปภาพที่ถูกต้อง'});
  const issue=(await pool.query('SELECT status FROM issues WHERE id=$1',[id])).rows[0];
  if(!issue)return res.status(404).json({error:'ไม่พบเรื่อง'});
  if(!validImage(req.file.buffer,req.file.mimetype))return res.status(400).json({error:'ไฟล์ไม่ใช่รูปภาพที่รองรับ'});
  uploaded=await cloudUpload(req.file.buffer,'progress');
  const imagePath=cloudPath(uploaded);
  await pool.query('INSERT INTO issue_history(issue_id,status,note,actor_staff_id,image_path) VALUES($1,$2,$3,$4,$5)',[id,issue.status,'แนบรูปภาพความคืบหน้า',req.staff.id,imagePath]);
  res.status(201).json({image_path:imagePath});
 }catch(e){if(uploaded)await removeCloudImage(uploaded.public_id);fail(res,e);}
});

async function bootstrapAdmin(){

 const email=process.env.ADMIN_EMAIL?.trim().toLowerCase(),password=process.env.ADMIN_PASSWORD;

 if(!email||!password)return;

 if(password.length<12){console.warn('ADMIN_PASSWORD ต้องมีอย่างน้อย 12 ตัวอักษร เพื่อสร้างบัญชีเริ่มต้น');return;}

 const existing=(await pool.query('SELECT id FROM staff_users WHERE email=$1',[email])).rows;

 if(existing.length)return;

 const count=(await pool.query('SELECT COUNT(*) AS n FROM staff_users')).rows[0].n;

 if(Number(count)>0)return;

 const hash=await bcrypt.hash(password,12);

 await pool.query('INSERT INTO staff_users(full_name,email,password_hash,department,role) VALUES($1,$2,$3,$4,$5)', ['ผู้ดูแลระบบ',email,hash,'ผู้ดูแลระบบ','admin']);

 console.log('สร้างบัญชีผู้ดูแลระบบเริ่มต้นแล้ว');

}

app.use((err,req,res,next)=>{if(err instanceof multer.MulterError)return res.status(400).json({error:'รูปภาพมีขนาดใหญ่เกินที่กำหนด'});next(err);});

const port=Number(process.env.PORT||4000);bootstrapAdmin().then(()=>app.listen(port,()=>console.log(`Campus Voice API: http\://localhost:${port}`))).catch(e=>{console.error('Database setup error:',e);process.exit(1)});
