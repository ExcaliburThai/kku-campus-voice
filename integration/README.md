# เชื่อมต่อ Dashboard เข้ากับเว็บหลักองค์กรนักศึกษา

เว็บหลัก React (Create React App) สามารถดึงข้อมูลได้โดยตรงจาก API:

```jsx
import React, { useEffect, useState } from "react";
export default function CampusVoiceSummary() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("http://localhost:4000/api/public/dashboard")
      .then(r => { if (!r.ok) throw new Error("API error"); return r.json(); })
      .then(setData).catch(e => setError(e.message));
  }, []);
  if (error) return <p>ไม่สามารถโหลดข้อมูลร้องเรียน: {error}</p>;
  if (!data) return <p>กำลังโหลดสถิติร้องเรียน...</p>;
  return <section>
    <h2>เสียงนักศึกษา มข.</h2>
    <p>รับแจ้งทั้งหมด {data.summary.total} เรื่อง</p>
    <p>รอดำเนินการ {data.summary.pending} เรื่อง</p>
    <p>กำลังดำเนินการ {data.summary.inProgress + data.summary.forwarded} เรื่อง</p>
    <p>เสร็จสิ้น {data.summary.resolved} เรื่อง</p>
    <a href="http://localhost:5173/">เข้าสู่ระบบรับแจ้งปัญหา</a>
  </section>;
}
```

วางไฟล์นี้ใน `src/components/CampusVoiceSummary.js` ของเว็บหลัก แล้ว import ใน `src/components/home.js`:

```jsx
import CampusVoiceSummary from "./CampusVoiceSummary";
```

เรียก `<CampusVoiceSummary />` ใน JSX หน้าแรก และตั้ง `FRONTEND_ORIGIN` ของ backend ให้รวม URL เว็บหลัก เช่น `http://localhost:5173,http://localhost:3000` (หากต้องการให้เรียกจากเบราว์เซอร์ของเว็บหลักได้)

สำหรับการใช้งานจริง ควรใช้ HTTPS และตั้งค่าการอนุญาต CORS เฉพาะโดเมนที่ใช้งาน
