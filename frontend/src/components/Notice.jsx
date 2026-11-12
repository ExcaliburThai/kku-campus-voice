import React from "react";
import { AlertCircle } from "lucide-react";

export default function Notice({ error }) { return error ? <div className="error"><AlertCircle size={18} />{error}</div> : null }
