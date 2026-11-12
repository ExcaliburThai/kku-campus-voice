import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, Send, ChevronRight, MapPin } from "lucide-react";
import { moneyDate, statusNames } from "../api.js";
import useLoad from "../hooks/useLoad.js";
import Notice from "../components/Notice.jsx";
import Status from "../components/Status.jsx";
import IssueTime from "../components/IssueTime.jsx";
import { getImageUrl } from "../utils/images.js";

export default function IssueDetail() {

    const { id } = useParams();

    const { data: issue, error, loading } = useLoad('/api/public/issues/' + id);

    const [historyOpen, setHistoryOpen] = useState(false);

    // The public API currently does not guarantee a history endpoint.

    const history = Array.isArray(issue?.history) ? issue.history : [];

    return <main className="container narrow section issue-detail-page">

        <Link to="/issues" className="text-link">← กลับไปรายการปัญหา</Link>

        {loading ? <p>กำลังโหลด...</p> : error ? <Notice error={error} /> : !issue ? <div className="empty panel">ไม่พบเรื่องร้องเรียนนี้ในรายการสาธารณะ</div> :

            <div className="panel issue-detail-panel">

                <div className="issue-detail-heading"><h1>{issue.title}</h1><IssueTime issue={issue} /></div>

                <div className="issue-top"><span className="category-tag">{issue.icon} {issue.category}</span><Status value={issue.status} /></div>

                {issue.image_path && <img className="issue-detail-photo" src={getImageUrl(issue.image_path)} alt="รูปประกอบเรื่องร้องเรียน" />}

                <h3>รายละเอียดปัญหา</h3><p>{issue.description}</p>

                <div className="issue-assignment">

                    <div><Building2 size={18} /><span><strong>ดำเนินการโดย:</strong> {issue.assigned_to || 'รอเจ้าหน้าที่รับเรื่อง'}</span></div>

                    <div><Send size={18} /><span><strong>ส่งต่อให้:</strong> {issue.forwarded_to || 'ยังไม่มีการส่งต่อ'}</span></div>

                </div>

                <button className="issue-history-toggle" type="button" onClick={() => setHistoryOpen(v => !v)}>

                    <span>ประวัติการดำเนินงาน ({history.length} รายการ)</span><ChevronRight size={18} style={{ transform: historyOpen ? 'rotate(90deg)' : 'none' }} />

                </button>

                {historyOpen && (history.length ? <div className="issue-history-list">{history.map((h, index) => <div key={h.id || index}><strong>{statusNames[h.status] || h.status || 'อัปเดตสถานะ'}</strong><small>{moneyDate(h.changed_at || h.created_at)}</small><p>{h.note || 'อัปเดตการดำเนินงาน'}</p></div>)}</div> : <p className="hint">ยังไม่มีประวัติที่เปิดเผยผ่าน API สาธารณะ</p>)}

                <div className="issue-bottom"><span><MapPin size={14} />{issue.location_name || 'ไม่ระบุพื้นที่'}</span><span>{moneyDate(issue.created_at)}</span></div>

            </div>}

    </main>;

}
