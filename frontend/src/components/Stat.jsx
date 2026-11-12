import React from "react";

export default function Stat({ label, value, icon: Icon, color }) { return <div className="stat"><div className={'stat-icon ' + color}><Icon size={22} /></div><div><span>{label}</span><strong>{(value || 0).toLocaleString('th-TH')}</strong></div></div> }
