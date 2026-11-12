import React, { useCallback, useEffect, useMemo, useState } from 'react';

import './styles/AdminPage.css';

import AdminLogin from './components/AdminLogin.jsx';

import { request } from './api.js';





const ISSUE_STATUS = {

  pending: 'รอรับเรื่อง', accepted: 'รับเรื่องแล้ว',

  forwarded: 'ส่งต่อแล้ว', in_progress: 'กำลังดำเนินการ',

  resolved: 'เสร็จสิ้น', rejected: 'ไม่รับดำเนินการ',

};

const DESTINATION_STATUS = {

  waiting: 'รอการตอบรับ', accepted: 'รับเรื่องแล้ว',

  working: 'กำลังดำเนินการ', done: 'ดำเนินการเสร็จแล้ว',

};



function dateLabel(value) {

  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('th-TH', {

    day: 'numeric', month: 'short', year: 'numeric',

    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',

    timeZone: 'Asia/Bangkok',

  }).format(date);

}

function durationLabel(from, to) {

  if (!from) return '—';

  const start = new Date(from).getTime();

  const end = to ? new Date(to).getTime() : Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end)) return '—';

  const total = Math.max(0, Math.floor((end - start) / 60000));

  const days = Math.floor(total / 1440);

  const hours = Math.floor((total % 1440) / 60);

  const minutes = total % 60;

  if (days) return `${days} วัน ${hours} ชม.`;

  if (hours) return `${hours} ชม. ${minutes} นาที`;

  return `${minutes} นาที`;

}

function StaffRow({ title, date, from, staff, waitPrefix }) {

  if (!date) return null;

  return (

    <div className="kku-step">

      <div className="kku-step-info">

        <div className="kku-step-line"><strong>{title}</strong><span>{dateLabel(date)}</span></div>

        {from && <small>{waitPrefix} {durationLabel(from, date)}</small>}

      </div>

      <div className="kku-staff">

        <strong>{staff?.name || 'ไม่พบข้อมูลผู้ดำเนินการ'}</strong>

        <small>{staff?.email || '—'}</small>

      </div>

    </div>

  );

}



function getImageUrl(issue) {
  const image = issue?.image_path || issue?.image_url;
  if (!image) return '';
  if (/^https?:\/\//i.test(image)) return image;
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
  return `${baseUrl}/${String(image).replace(/^\//, '')}`;
}

function IssueCard({ issue, onEdit, now }) {

  return (

    <article className="kku-card">

      <div className="kku-issue-head">

<div className="kku-photo">

  {getImageUrl(issue) ? (

    <img

      src={getImageUrl(issue)}

      alt={`ภาพประกอบ ${issue.title}`}

      loading="lazy"

    />

  ) : (

    <span>ไม่มีรูปภาพ</span>

  )}

</div>

        <div className="kku-issue-info">

          <div className="kku-title-line"><small>{issue.id}</small><span className={`kku-badge ${issue.status}`}>{ISSUE_STATUS[issue.status] || issue.status}</span></div>

          <h3>{issue.title}</h3>

          <p>แจ้ง {dateLabel(issue.created_at)} · ผ่านมา {durationLabel(issue.created_at, issue.resolved_at || now)}</p>

          <p>📍 {(issue.location_name || issue.location || "—")}</p>

        </div>

      </div>

      <div className="kku-divider" />

      <StaffRow title="รับเรื่อง" date={issue.accepted_at} from={issue.created_at} waitPrefix="รอรับเรื่อง" staff={issue.accepted_by} />

      {issue.accepted_at && issue.forwarded_at && <div className="kku-divider" />}

      <StaffRow title="ส่งต่อ" date={issue.forwarded_at} from={issue.accepted_at} waitPrefix="หลังรับเรื่อง" staff={issue.forwarded_by} />

      {issue.forwarded_at && <div className="kku-divider" />}

      <div className="kku-destination"><span>ส่งไปยัง</span><strong>{issue.forwarded_to || '—'}</strong></div>

      <div className="kku-card-actions">

<div
  className="kku-status-readonly"
  aria-label="สถานะหน่วยงานปลายทาง"
>
  {DESTINATION_STATUS[issue.destination_status || "waiting"] ||
    "รอการตอบรับ"}
</div>

        <button type="button" className="kku-primary" onClick={() => onEdit(issue)}>จัดการเรื่อง</button>

      </div>

    </article>

  );

}

function IssueModal({ issue, onClose, onSave, saving }) {

  const [form, setForm] = useState({

    status: issue.status, destination_status: issue.destination_status,

    forwarded_to: issue.forwarded_to || '', note: issue.note || '',

  });

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (

    <div className="kku-overlay" onMouseDown={e => { if (!saving && e.target === e.currentTarget) onClose(); }}>

      <section className="kku-modal" role="dialog" aria-modal="true" aria-labelledby="kku-modal-title">

        <header className="kku-modal-head"><div><small>{issue.id}</small><h2 id="kku-modal-title">จัดการเรื่องร้องเรียน</h2></div><button className="kku-close" onClick={() => { if (!saving) onClose(); }} disabled={saving} aria-label="ปิด">×</button></header>

        <div className="kku-modal-body">

          <div className="kku-modal-summary kku-modal-summary-with-image">
            {getImageUrl(issue) && (
              <a href={getImageUrl(issue)} target="_blank" rel="noopener noreferrer" title="คลิกดูรูปภาพขนาดเต็ม" className="kku-modal-photo-link">
                <img className="kku-modal-photo" src={getImageUrl(issue)} alt={`ภาพประกอบ ${issue.title}`} />
              </a>
            )}
            <div className="kku-modal-summary-copy">
              <strong>{issue.title}</strong>
              <p>{issue.description}</p>
              <small>แจ้งครั้งแรก: {dateLabel(issue.created_at)} · {issue.location_name || issue.location || '—'}</small>
            </div>
          </div>
          <div className="kku-form-grid">

            <label>สถานะเรื่องร้องเรียน<select value={form.status} onChange={e => set('status', e.target.value)}>{Object.entries(ISSUE_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>

            <label>สถานะหน่วยงานปลายทาง<select value={form.destination_status} onChange={e => set('destination_status', e.target.value)}>{Object.entries(DESTINATION_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>

          </div>

          <label>ส่งต่อไปยัง<input value={form.forwarded_to} onChange={e => set('forwarded_to', e.target.value)} placeholder="ชื่อหน่วยงาน" /></label>

          <label>หมายเหตุ / ความคืบหน้า<textarea rows="4" value={form.note} onChange={e => set('note', e.target.value)} placeholder="บันทึกรายละเอียดการดำเนินงาน" /></label>

          <div className="kku-modal-history"><h3>ประวัติการดำเนินงาน</h3><StaffRow title="รับเรื่อง" date={issue.accepted_at} from={issue.created_at} waitPrefix="รอรับเรื่อง" staff={issue.accepted_by}/><div className="kku-divider"/><StaffRow title="ส่งต่อ" date={issue.forwarded_at} from={issue.accepted_at} waitPrefix="หลังรับเรื่อง" staff={issue.forwarded_by}/></div>

        </div>

<footer className="kku-modal-footer">
  <button
    type="button"
    className="kku-secondary"
    disabled={saving}
    onClick={onClose}
  >
    ยกเลิก
  </button>

  <button
    type="button"
    className="kku-primary"
    disabled={saving}
    onClick={() => onSave(issue.id, form)}
  >
    {saving ? "กำลังบันทึก..." : "บันทึกลงฐานข้อมูล"}
  </button>
</footer>

      </section>

    </div>

  );

}

// API ต้องคืนรายการเรื่องร้องเรียนเป็น array หรือ { issues: [...] } / { data: [...] }

function extractIssues(payload) {

  const rows = Array.isArray(payload) ? payload :

    Array.isArray(payload?.issues) ? payload.issues :

    Array.isArray(payload?.data) ? payload.data :

    Array.isArray(payload?.data?.issues) ? payload.data.issues : null;

  if (!rows) throw new Error('รูปแบบข้อมูลจาก /api/admin/issues ไม่ถูกต้อง');

  return rows;

}



const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
function Avatar({ person, large = false }) {
  const src = person?.avatar_path && /^\/uploads\/avatar-[a-f0-9-]+\.(jpg|png|webp)$/.test(person.avatar_path) ? API_ORIGIN + person.avatar_path : '';
  return <span className={'kku-avatar' + (large ? ' large' : '')}>{src ? <img src={src} alt="รูปโปรไฟล์" /> : (person?.full_name || '?').slice(0, 1)}</span>;
}
function StaffEditModal({ person, headers, onClose, onSaved }) {
  const [form, setForm] = useState({ fullName: person.full_name, email: person.email, department: person.department || '', role: person.role, isActive: Boolean(person.is_active), newPassword: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const save = async e => {
    e.preventDefault();setBusy(true);setError('');
    try {
      await request(`/api/admin/staff/${person.id}`, {method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(form)});
      onSaved();
    } catch(err){setError(err.message || 'บันทึกไม่สำเร็จ')} finally {setBusy(false)}
  };
  return <div className="kku-overlay" onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}>
    <section className="kku-modal kku-profile-modal" role="dialog" aria-modal="true" aria-label="แก้ไขข้อมูลเจ้าหน้าที่">
      <header className="kku-modal-head"><h2>แก้ไขข้อมูลเจ้าหน้าที่</h2><button className="kku-close" onClick={onClose} disabled={busy}>×</button></header>
      <form className="kku-profile-form" onSubmit={save}>
        <div className="kku-profile-heading"><Avatar person={person} large /><strong>{person.full_name}</strong></div>
        <label>ชื่อ–นามสกุล<input required minLength={2} maxLength={120} value={form.fullName} onChange={e=>set('fullName',e.target.value)} /></label>
        <label>อีเมลสำหรับ Login<input type="email" required maxLength={190} value={form.email} onChange={e=>set('email',e.target.value)} /></label>
        <label>หน่วยงาน<input maxLength={160} value={form.department} onChange={e=>set('department',e.target.value)} /></label>
        <label>สิทธิ์<select value={form.role} onChange={e=>set('role',e.target.value)}><option value="staff">เจ้าหน้าที่</option><option value="admin">ผู้ดูแลระบบ</option></select></label>
        <label className="kku-check"><input type="checkbox" checked={form.isActive} onChange={e=>set('isActive',e.target.checked)} /> เปิดใช้งานบัญชี</label>
        <label>ตั้งรหัสผ่านใหม่ (ไม่เปลี่ยนให้เว้นว่าง)<input type="password" minLength={6} maxLength={128} autoComplete="new-password" value={form.newPassword} onChange={e=>set('newPassword',e.target.value)} /></label>
        {error && <p role="alert" className="kku-staff-error">{error}</p>}
        <div className="kku-profile-actions"><button type="button" className="kku-secondary" onClick={onClose}>ยกเลิก</button><button type="submit" className="kku-primary" disabled={busy}>{busy?'กำลังบันทึก...':'บันทึกข้อมูล'}</button></div>
      </form>
    </section>
  </div>;
}
function ProfilePage({ me, headers, onRefresh }) {
  const [form,setForm] = useState({fullName:me.full_name,department:me.department||''});
  const [password,setPassword] = useState({currentPassword:'',newPassword:''});
  const [busy,setBusy] = useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  useEffect(()=>setForm({fullName:me.full_name,department:me.department||''}),[me.id,me.full_name,me.department]);
  const perform = async fn => {setBusy(true);setError('');setMessage('');try{await fn();setMessage('บันทึกข้อมูลสำเร็จ');await onRefresh()}catch(e){setError(e.message||'บันทึกไม่สำเร็จ')}finally{setBusy(false)}};
  const saveInfo=e=>{e.preventDefault();perform(()=>request('/api/admin/me',{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(form)}))};
  const savePassword=e=>{e.preventDefault();perform(async()=>{await request('/api/admin/me/password',{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(password)});setPassword({currentPassword:'',newPassword:''})})};
  const upload=async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>2*1024*1024){setError('รูปต้องไม่เกิน 2 MB');return}const data=new FormData();data.append('avatar',file);await perform(async()=>{const response=await fetch(API_ORIGIN+'/api/admin/me/avatar',{method:'POST',headers,body:data});const result=await response.json();if(!response.ok)throw new Error(result.error||'อัปโหลดรูปไม่สำเร็จ')});e.target.value=''};
  return <section className="kku-profile-page">
    <div className="kku-page-heading"><h1>โปรไฟล์ของฉัน</h1><p>ข้อมูลบัญชีและรูปโปรไฟล์ของคุณ</p></div>
    <div className="kku-profile-panel"><div className="kku-profile-heading"><div className="kku-avatar-edit-wrap"><Avatar person={me} large/><label className="kku-avatar-pencil" title="เปลี่ยนรูปโปรไฟล์" aria-label="เปลี่ยนรูปโปรไฟล์"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/></svg><input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy}/></label></div><div><h2>{me.full_name}</h2><p>{me.email}</p><small>{me.role==='admin'?'ผู้ดูแลระบบ':'เจ้าหน้าที่'}</small></div></div>
      <p className="kku-avatar-hint">กดไอคอนปากกาที่รูปเพื่อเปลี่ยนรูปโปรไฟล์ (JPG, PNG, WEBP ไม่เกิน 2 MB)</p>
      {error && <p className="kku-staff-error" role="alert">{error}</p>}{message && <p className="kku-staff-success" role="status">{message}</p>}
    </div>
    <div className="kku-profile-columns"><form className="kku-profile-panel" onSubmit={saveInfo}><h2>ข้อมูลส่วนตัว</h2><label>ชื่อ–นามสกุล<input required minLength={2} maxLength={120} value={form.fullName} onChange={e=>setForm(p=>({...p,fullName:e.target.value}))}/></label><label>อีเมลสำหรับ Login<input value={me.email} disabled /></label><label>หน่วยงาน<input maxLength={160} value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}/></label><button className="kku-primary" disabled={busy}>บันทึกโปรไฟล์</button></form>
    <form className="kku-profile-panel" onSubmit={savePassword}><h2>เปลี่ยนรหัสผ่าน</h2><label>รหัสผ่านปัจจุบัน<input required type="password" autoComplete="current-password" value={password.currentPassword} onChange={e=>setPassword(p=>({...p,currentPassword:e.target.value}))}/></label><label>รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)<input required type="password" minLength={6} maxLength={128} autoComplete="new-password" value={password.newPassword} onChange={e=>setPassword(p=>({...p,newPassword:e.target.value}))}/></label><button className="kku-primary" disabled={busy}>เปลี่ยนรหัสผ่าน</button></form></div>
  </section>;
}

function StaffManagement({ headers, onUnauthorized }) {
  const [staff, setStaff] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', department: '', role: 'staff' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const rows = await request('/api/admin/staff', { headers });
      setStaff(Array.isArray(rows) ? rows : []);
    } catch (err) {
      if (/\b401\b/.test(String(err.message))) onUnauthorized();
      setError(err.message || 'ไม่สามารถโหลดรายชื่อเจ้าหน้าที่');
    }
  }, [headers, onUnauthorized]);
  useEffect(() => { refresh(); }, [refresh]);
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setMessage(''); setError('');
    try {
      await request('/api/admin/staff', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, email: form.email.trim().toLowerCase(), fullName: form.fullName.trim() })
      });
      setMessage(`เพิ่มบัญชี ${form.email} สำเร็จ`);
      setForm({ fullName: '', email: '', password: '', department: '', role: 'staff' });
      await refresh();
    } catch (err) {
      if (/\b401\b/.test(String(err.message))) onUnauthorized();
      setError(err.message || 'เพิ่มเจ้าหน้าที่ไม่สำเร็จ');
    } finally { setBusy(false); }
  };
  return (
    <section className="kku-staff-management">
      <div className="kku-page-heading"><h1>จัดการเจ้าหน้าที่</h1><p>เพิ่มบัญชีเจ้าหน้าที่และตรวจสอบรายชื่อในระบบ</p></div>
      <div className="kku-staff-layout">
        <form className="kku-staff-panel" onSubmit={submit}>
          <h2>เพิ่มเจ้าหน้าที่ใหม่</h2>
          <label>ชื่อ–นามสกุล<input required minLength={2} maxLength={120} value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="นายสมชาย ใจดี" /></label>
          <label>อีเมล<input type="email" required maxLength={190} value={form.email} onChange={e => update('email', e.target.value)} placeholder="somchai@example.com" autoComplete="off" /></label>
          <label>รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)<input type="password" required minLength={6} maxLength={128} value={form.password} onChange={e => update('password', e.target.value)} autoComplete="new-password" /></label>
          <label>หน่วยงาน<input maxLength={160} value={form.department} onChange={e => update('department', e.target.value)} placeholder="กองบริหารงานทั่วไป" /></label>
          <label>สิทธิ์<select value={form.role} onChange={e => update('role', e.target.value)}><option value="staff">เจ้าหน้าที่ (staff)</option><option value="admin">ผู้ดูแลระบบ (admin)</option></select></label>
          {error && <p className="kku-staff-error" role="alert">{error}</p>}
          {message && <p className="kku-staff-success" role="status">{message}</p>}
          <button className="kku-primary" type="submit" disabled={busy}>{busy ? 'กำลังเพิ่ม...' : 'เพิ่มเจ้าหน้าที่'}</button>
        </form>
        <div className="kku-staff-panel">
          <div className="kku-staff-list-head"><h2>รายชื่อเจ้าหน้าที่ ({staff.length})</h2><button className="kku-secondary" type="button" onClick={refresh}>รีเฟรช</button></div>
          <div className="kku-staff-list">{staff.map(person => (
            <div className="kku-staff-person" key={person.id}>
              <Avatar person={person} />
              <strong>{person.full_name}</strong><span>{person.email}</span>
              <small>{person.department || 'ไม่ระบุหน่วยงาน'} · {person.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'} · {person.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}</small>
              <button className="kku-secondary" type="button" onClick={() => setEditing(person)}>แก้ไข</button>
            </div>
          ))}</div>
        </div>
      </div>
      {editing && <StaffEditModal person={editing} headers={headers} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
    </section>
  );
}

function AdminDashboard({ token, onUnauthorized }) {

  const [issues, setIssues] = useState([]);
  const [activeTab, setActiveTab] = useState('issues');
  const [me, setMe] = useState(null);

  const [filter, setFilter] = useState('all');

  const [query, setQuery] = useState('');

  const [selectedId, setSelectedId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const [now] = useState(() => new Date().toISOString());



  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const handleError = useCallback((err) => {

    const message = err?.message || String(err);

    if (/\b(401|403)\b/.test(message)) onUnauthorized();

    setError(message);

  }, [onUnauthorized]);



  const loadIssues = useCallback(async () => {

    setLoading(true);

    setError('');

    try {

      const result = await request('/api/admin/issues', { headers });

      setIssues(extractIssues(result));

    } catch (err) {

      handleError(err);

    } finally {

      setLoading(false);

    }

  }, [headers, handleError]);



  useEffect(() => { loadIssues(); }, [loadIssues]);
  const refreshMe = useCallback(async () => { const user = await request('/api/admin/me', { headers }); setMe(user); }, [headers]);
  useEffect(() => { refreshMe().catch(handleError); }, [refreshMe, handleError]);



const saveIssue = async (id, form) => {
  setSaving(true);
  setError("");

  try {
    const payload = {
      status: form.status,
      note: form.note || "",
      forwardedTo: form.forwarded_to || "",
    };

    await request(
      `/api/admin/issues/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    setSelectedId(null);
    await loadIssues();
  } catch (err) {
    handleError(err);
  } finally {
    setSaving(false);
  }
};


  const selected = issues.find(x => x.id === selectedId);

  const filtered = useMemo(() => issues.filter(x =>

    (filter === 'all' || x.status === filter) &&

    `${x.id} ${x.tracking_code || ""} ${x.title} ${x.location_name || x.location || ""}`.toLowerCase().includes(query.toLowerCase())

  ), [issues, filter, query]);

  const counts = [

    ['เรื่องทั้งหมด', issues.length],

    ['รอรับเรื่อง', issues.filter(x => x.status === 'pending').length],

    ['ส่งต่อแล้ว', issues.filter(x => x.status === 'forwarded').length],

    ['เสร็จสิ้น', issues.filter(x => x.status === 'resolved').length],

  ];



  return (

    <main className="kku-admin">

      <div className="kku-shell">

        <header className="kku-header"><div className="kku-brand"><div className="kku-logo">✓</div><div><strong>KKU Campus Voice</strong><small>ระบบจัดการเรื่องร้องเรียน · เจ้าหน้าที่</small></div></div><button type="button" className="kku-header-account" onClick={() => setActiveTab('profile')} title="เปิดโปรไฟล์ของฉัน"><Avatar person={me}/><span className="kku-header-account-text"><strong>{me?.full_name || 'กำลังโหลดข้อมูล...'}</strong><small>{me?.email || ''}</small><small>{me?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}</small></span></button></header>

        <nav className="kku-admin-tabs" aria-label="เมนูผู้ดูแลระบบ">
          <button type="button" className={activeTab === 'issues' ? 'active' : ''} onClick={() => setActiveTab('issues')}>เรื่องร้องเรียน</button>
          {me?.role === 'admin' && <button type="button" className={activeTab === 'staff' ? 'active' : ''} onClick={() => setActiveTab('staff')}>จัดการเจ้าหน้าที่</button>}
          <button type="button" className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>โปรไฟล์ของฉัน</button>
        </nav>
        {activeTab === 'profile' && me ? <ProfilePage me={me} headers={headers} onRefresh={refreshMe} /> : activeTab === 'staff' && me?.role === 'admin' ? <StaffManagement headers={headers} onUnauthorized={onUnauthorized} /> : <>
        <div className="kku-page-heading"><h1>ภาพรวมเรื่องร้องเรียน</h1><p>ข้อมูลเรื่องร้องเรียนจาก Backend</p></div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>

          <button type="button" className="kku-secondary" disabled={loading || saving} onClick={loadIssues}>รีเฟรชข้อมูล</button>

          {loading && <span>กำลังโหลดข้อมูล...</span>}

        </div>

        {error && <p role="alert" style={{ color: '#b42318' }}>เกิดข้อผิดพลาด: {error}</p>}

        <section className="kku-stats">{counts.map(([label, count]) => <div className="kku-stat" key={label}><span>{label}</span><strong>{count}</strong></div>)}</section>

        <div className="kku-toolbar"><input aria-label="ค้นหาเรื่องร้องเรียน" placeholder="ค้นหารหัสเรื่อง หรือหัวข้อ..." value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="กรองสถานะ" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">ทุกสถานะ</option>{Object.entries(ISSUE_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>

        <section className="kku-issue-list">{!loading && (filtered.length ? filtered.map(issue => <IssueCard key={issue.id} issue={issue} now={now} onEdit={x => setSelectedId(x.id)} />) : <div className="kku-empty">ไม่พบเรื่องร้องเรียนที่ตรงกับเงื่อนไข</div>)}</section>
        </>}

      </div>

      {selected && <IssueModal key={selected.id} issue={selected} saving={saving} onClose={() => setSelectedId(null)} onSave={saveIssue} />}

    </main>

  );

}





// Require an authenticated backend session before showing the admin UI.

export default function AdminPage() {

  const [token, setToken] = useState(() => sessionStorage.getItem('campus_admin_token') || '');

  const [verified, setVerified] = useState(false);

  const [checking, setChecking] = useState(Boolean(token));

  const [authError, setAuthError] = useState('');



  React.useEffect(() => {

    let active = true;

    if (!token) {

      setVerified(false);

      setChecking(false);

      return;

    }

    setChecking(true);

    request('/api/admin/issues', { headers: { Authorization: 'Bearer ' + token } })

      .then(() => { if (active) { setVerified(true); setAuthError(''); } })

      .catch(() => {

        if (active) {

          sessionStorage.removeItem('campus_admin_token');

          setToken('');

          setVerified(false);

          setAuthError('เซสชันหมดอายุหรือไม่สามารถตรวจสอบสิทธิ์ได้ กรุณาเข้าสู่ระบบใหม่');

        }

      })

      .finally(() => { if (active) setChecking(false); });

    return () => { active = false; };

  }, [token]);



  const logout = () => {

    sessionStorage.removeItem('campus_admin_token');

    setVerified(false);

    setToken('');

  };



  if (checking) return <main className="admin-auth-loading">กำลังตรวจสอบสิทธิ์เจ้าหน้าที่...</main>;

  if (!token || !verified) {

    return <AdminLogin initialError={authError} onLogin={nextToken => {

      sessionStorage.setItem('campus_admin_token', nextToken);

      setToken(nextToken);

    }} />;

  }

  return <><div className="admin-auth-toolbar"><span>เข้าสู่ระบบเจ้าหน้าที่แล้ว</span><button type="button" onClick={logout}>ออกจากระบบ</button></div><AdminDashboard token={token} onUnauthorized={logout} /></>;

}
