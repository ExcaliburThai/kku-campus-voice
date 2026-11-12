import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Send, Clock, ThumbsUp, ArrowRight, MapPin } from "lucide-react";
import { request, moneyDate, statusNames } from "../api.js";
import { getImageUrl } from "../utils/images.js";
import Status from "./Status.jsx";
import IssueTime from "./IssueTime.jsx";

export default function IssueCard({ issue: i }) {

    const [count, setCount] = useState(Number(i.confirmation_count || 0));

    const [voted, setVoted] = useState(false);

    const [busy, setBusy] = useState(false);

    const [error, setError] = useState('');

    useEffect(() => {

        setCount(Number(i.confirmation_count || 0));

        setVoted(localStorage.getItem('campus_confirm\_' + i.id) === '1');

    }, [i.id, i.confirmation_count]);

    const confirm = async () => {

        if (voted || busy) return;

        setBusy(true); setError('');

        try {

            let key = localStorage.getItem('campus_device_key');

            if (!key) {

                key = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');

                localStorage.setItem('campus_device_key', key);

            }

            const r = await request('/api/public/issues/' + i.id + '/confirm', {

                method: 'POST', body: JSON.stringify({ deviceKey: key })

            });

            setCount(r.count); setVoted(true);

            localStorage.setItem('campus_confirm\_' + i.id, '1');

        } catch (e) { setError(e.message); }

        finally { setBusy(false); }

    };

    return <article className="issue-card issue-card-new">

        <div className="issue-card-main">

            {i.image_path && <img className="issue-photo" src={getImageUrl(i.image_path)} alt="รูปประกอบเรื่องร้องเรียน" loading="lazy" />}

            <div className="issue-card-content">

                <div className="issue-card-heading">

                    <span className="category-tag">{i.icon} {i.category}</span>

                    <IssueTime issue={i} />

                </div>

                <h3>{i.title}</h3>

                <p>{i.description}</p>

                <Status value={i.status} />

            </div>

        </div>

        <div className="issue-assignment">

            <div><Building2 size={17} /><span><strong>ดำเนินการโดย:</strong> {i.assigned_to || 'รอเจ้าหน้าที่รับเรื่อง'}</span></div>

            <div><Send size={17} /><span><strong>ส่งต่อให้:</strong> {i.forwarded_to || 'ยังไม่มีการส่งต่อ'}</span></div>

            <div className="issue-latest"><Clock size={16} /><span>ล่าสุด: {i.latest_note || statusNames[i.status] || 'รอการอัปเดต'}</span></div>

        </div>

        <div className="issue-confirm">

            <button type="button" className="btn outline" disabled={voted || busy} onClick={confirm}>

                <ThumbsUp size={16} />{voted ? 'ยืนยันแล้ว' : 'ฉันก็พบปัญหานี้'}

            </button>

            <small>{count} คนยืนยัน</small>

        </div>

        {error && <small className="error">{error}</small>}

        <Link className="btn primary issue-detail-link" to={'/issues/' + i.id}>ดูรายละเอียด <ArrowRight size={17} /></Link>

        <div className="issue-bottom">

            <span><MapPin size={14} />{i.location_name || 'ไม่ระบุพื้นที่'}</span>

            <span>{moneyDate(i.created_at)}</span>

        </div>

    </article>;

}
