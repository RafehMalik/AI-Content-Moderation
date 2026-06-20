const STATUS_MAP = {
  Approved: { cls: 'badge-ok', label: 'Approved' },
  Flagged: { cls: 'badge-warn', label: 'Flagged' },
  Blocked: { cls: 'badge-danger', label: 'Blocked' },
  Pending: { cls: 'badge-info', label: 'Pending' },
  Accepted: { cls: 'badge-ok', label: 'Accepted' },
  Rejected: { cls: 'badge-danger', label: 'Rejected' }
}

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { cls: 'badge-neutral', label: status }
  return (
    <span className={`badge ${cfg.cls}`}>
      <span className="badge-dot" />
      {cfg.label}
    </span>
  )
}
