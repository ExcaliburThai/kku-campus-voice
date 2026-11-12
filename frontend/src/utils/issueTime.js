function parseIssueDate(value) {

    if (!value) return null;

    if (value instanceof Date) return value;

    // MySQL DATETIME without timezone: interpret in local time.

    const normalized = String(value).includes('T') ? String(value) : String(value).replace(' ', 'T');

    const date = new Date(normalized);

    return Number.isFinite(date.getTime()) ? date : null;

}

function durationBetween(start, end) {

    const from = parseIssueDate(start);

    const to = typeof end === 'number' ? new Date(end) : parseIssueDate(end);

    if (!from || !to) return null;

    const total = Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));

    const days = Math.floor(total / 1440);

    const hours = Math.floor((total % 1440) / 60);

    const minutes = total % 60;

    if (days) return `${days} วัน ${hours} ชม. ${minutes} นาที`;

    if (hours) return `${hours} ชม. ${minutes} นาที`;

    return `${minutes} นาที`;

}

export function getIssueTimeLabel(issue, now) {

    const status = issue.status;

    if (status === 'resolved') {

        const duration = durationBetween(issue.created_at, issue.resolved_at);

        return duration ? `เสร็จสิ้นใน ${duration}` : 'เสร็จสิ้น';

    }

    if (status === 'forwarded') {

        const duration = durationBetween(issue.forwarded_at || issue.created_at, now);

        return duration ? `ส่งต่อมาแล้ว ${duration}` : 'ส่งต่อแล้ว';

    }

    if (status === 'in_progress' || status === 'inProgress') {

        const duration = durationBetween(issue.started_at || issue.created_at, now);

        return duration ? `ดำเนินการมาแล้ว ${duration}` : 'กำลังดำเนินการ';

    }

    if (status === 'accepted' || status === 'received') {

        const duration = durationBetween(issue.accepted_at || issue.created_at, now);

        return duration ? `รับเรื่องมาแล้ว ${duration}` : 'รับเรื่องแล้ว';

    }

    const duration = durationBetween(issue.created_at, now);

    return duration ? `แจ้งมาแล้ว ${duration}` : 'รอรับเรื่อง';

}
