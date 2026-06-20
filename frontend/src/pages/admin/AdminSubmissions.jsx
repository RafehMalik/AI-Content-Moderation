import { useState, useEffect } from 'react'
import { submissionApi } from '../../api/submissions'
import { adminApi } from '../../api/admin'
import { useToast } from '../../context/ToastContext'
import { Icon } from '../../components/Icon'
import StatusBadge from '../../components/StatusBadge'

function OverrideModal({ verdict, onClose, onSubmit }) {
  const [outcome, setOutcome] = useState(verdict.outcome)
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    setSaving(true)
    await onSubmit(verdict.id, outcome)
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <h3 className="modal-title">Override verdict</h3>
        <img src={verdict.imageUrl} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }} />
        <div className="field">
          <label className="field-label">New outcome</label>
          <select className="select-input" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="Approved">Approved</option>
            <option value="Flagged">Flagged</option>
            <option value="Blocked">Blocked</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handle} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Apply override'}
          </button>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [overrideTarget, setOverrideTarget] = useState(null)
  const { showToast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await submissionApi.getAllAdmin()
      setSubmissions(data.submissions || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleOverride = async (verdictId, outcome) => {
    try {
      await adminApi.overrideVerdict(verdictId, outcome)
      showToast('Verdict overridden')
      setOverrideTarget(null)
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not override verdict', 'error')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">All submissions</h1>
          <p className="page-sub">Platform-wide view across every user</p>
        </div>
      </div>

      <div className="card card-flush">
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
        ) : submissions?.length === 0 ? (
          <div className="empty-state">
            <Icon.Grid />
            <div className="empty-state-title">No submissions yet</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Images</th>
                <th>Submission ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {submissions?.map((s) => (
                <SubmissionRow
                  key={s._id || s.id}
                  submission={s}
                  expanded={expanded === (s._id || s.id)}
                  onToggle={() => setExpanded(expanded === (s._id || s.id) ? null : (s._id || s.id))}
                  onOverride={setOverrideTarget}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {overrideTarget && (
        <OverrideModal verdict={overrideTarget} onClose={() => setOverrideTarget(null)} onSubmit={handleOverride} />
      )}
    </div>
  )
}

function SubmissionRow({ submission, expanded, onToggle, onOverride }) {
  const [detail, setDetail] = useState(null)
  const id = submission._id || submission.id

  useEffect(() => {
    if (expanded && !detail) {
      submissionApi.getOne(id).then(({ data }) => setDetail(data))
    }
  }, [expanded])

  return (
    <>
      <tr className="clickable" onClick={onToggle}>
        <td className="table-mono">{new Date(submission.createdAt).toLocaleString()}</td>
        <td>{submission.images?.length || 0}</td>
        <td className="table-mono" style={{ fontSize: 12 }}>{id}</td>
        <td style={{ textAlign: 'right' }}>
          <Icon.ChevronRight style={{ width: 16, height: 16, color: 'var(--text-tertiary)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={4} style={{ padding: 0, background: 'var(--bg-overlay)' }}>
            <div style={{ padding: 16 }}>
              {!detail ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><span className="spinner" /></div>
              ) : (
                detail.verdicts?.map((v) => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <img src={v.imageUrl} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />
                    <StatusBadge status={v.outcome} />
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flex: 1 }}>
                      {v.categoryResults?.filter((c) => c.detected).map((c) => c.category).join(', ') || 'No violations'}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onOverride(v) }}>
                      <Icon.Edit /> Override
                    </button>
                  </div>
                ))
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
