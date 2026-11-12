import React from "react";
import { statusNames } from "../api.js";

export default function Status({ value }) { return <span className={'status ' + value}>{(value === 'accepted' ? 'รับเรื่องแล้ว' : statusNames[value] || value)}</span> }
