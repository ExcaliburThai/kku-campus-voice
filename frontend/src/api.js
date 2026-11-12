const API=import.meta.env.VITE_API_URL||'http://localhost:4000';
export async function request(path,options={}){
 let response;try{response=await fetch(API+path,{...options,headers:{'Content-Type':'application/json',...options.headers}});}catch{throw Error('ไม่สามารถเชื่อมต่อ API ได้ กรุณาตรวจสอบว่า Backend ทำงานอยู่');}
 const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||`HTTP ${response.status}`);return data;
}
export const moneyDate=s=>s?new Date(s).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}):'-';
export const statusNames={pending:'รอรับเรื่อง',in_progress:'กำลังดำเนินการ',forwarded:'ส่งต่อหน่วยงาน',resolved:'เสร็จสิ้น',rejected:'ปิดเรื่อง'};
