import React from "react";
import { CheckCircle2, Clock } from "lucide-react";
import useCurrentTime from "../hooks/useCurrentTime.js";
import { getIssueTimeLabel } from "../utils/issueTime.js";

export default function IssueTime({ issue }) {

    const now = useCurrentTime();

    return <span className={'issue-time-label' + (issue.status === 'resolved' ? ' finished' : '')}>

        {issue.status === 'resolved' ? <CheckCircle2 size={14} /> : <Clock size={14} />}

        {getIssueTimeLabel(issue, now)}

    </span>;

}
