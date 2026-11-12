import React from "react";
import { Link, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell.jsx";
import Home from "./pages/Home.jsx";
import Issues from "./pages/Issues.jsx";
import IssueDetail from "./pages/IssueDetail.jsx";
import Report from "./pages/Report.jsx";
import Track from "./pages/Track.jsx";
import AdminPage from "./AdminPage.jsx";

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/issues/:id" element={<IssueDetail />} />
        <Route path="/report" element={<Report />} />
        <Route path="/track" element={<Track />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={
          <main className="container section">
            <h1>ไม่พบหน้านี้</h1>
            <Link to="/">กลับหน้าแรก</Link>
          </main>
        } />
      </Routes>
    </Shell>
  );
}
