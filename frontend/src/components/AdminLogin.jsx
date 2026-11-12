import React, { useState } from 'react';
import { request } from '../api.js';
import '../styles/AdminLogin.css';

export default function AdminLogin({ onLogin, initialError = '' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await request('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!result?.token) throw new Error('Backend ไม่ส่ง Token กลับมา');
      setPassword('');
      onLogin(result.token);
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return <main className="admin-login-page">
    <form className="admin-login-card" onSubmit={submit}>
      <div className="admin-login-mark">✓</div>
      <h1>เข้าสู่ระบบเจ้าหน้าที่</h1>
      <p>KKU Campus Voice · ระบบจัดการเรื่องร้องเรียน</p>
      <label htmlFor="admin-email">อีเมลเจ้าหน้าที่</label>
      <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมลเจ้าหน้าที่" />
      <label htmlFor="admin-password">รหัสผ่าน</label>
      <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="รหัสผ่าน" />
      {error && <div className="admin-login-error" role="alert">{error}</div>}
      <button type="submit" disabled={busy}>{busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</button>
    </form>
  </main>;
}
