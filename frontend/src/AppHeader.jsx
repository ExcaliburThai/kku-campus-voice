import React, { useState } from "react";

import { Link, NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Wallet, FileText, Menu, X } from "lucide-react";
import "./styles/AppHeader.css";

const navItems = [
  { to: "/", label: "หน้าแรก", icon: LayoutDashboard, end: true },
  { to: "/report", label: "แจ้งปัญหาใหม่", icon: LayoutDashboard },
  { to: "/issues", label: "ดูแผนที่ปัญหา", icon: LayoutDashboard },
  { to: "/admin", label: "เจ้าหน้าที่", icon: LayoutDashboard },
];

export default function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2570);

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link className="app-header__brand" to="/" onClick={() => setMobileOpen(false)}>
          <span className="app-header__mark">
            <img src="/images/kkusc.png" alt="ตราสภานักศึกษา มหาวิทยาลัยขอนแก่น" width="34" height="34" />
          </span>
          <span className="app-header__brand-text">
            <strong>สภานักศึกษามหาวิทยาลัยขอนแก่น</strong>
            <small>Khon Kaen University Student Council</small>
          </span>
        </Link>

        <nav id="app-header-mobile-nav" className={`app-header__nav${mobileOpen ? " app-header__nav--open" : ""}`} aria-label="เมนูหลัก">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `app-header__link${isActive ? " app-header__link--active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>


        <button
          className="app-header__menu-button"
          type="button"
          aria-label={mobileOpen ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={mobileOpen}
          aria-controls="app-header-mobile-nav"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}
