import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { submissionApi } from '../../api/submissions'
import { Icon } from '../../components/Icon'
import StatusBadge from '../../components/StatusBadge'

const CATEGORIES = [
  'Graphic Violence', 'Hate Symbols', 'Self-Harm',
  'Extremist Propaganda', 'Weapons & Contraband', 'Harassment & Humiliation'
]

export default function SubmissionHistory() {
  const [submissions, setSubmissions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ outcome: '', category: '', from: '', to: '' })
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await submissionApi.getMine(filters)
      setSubmissions(data.submissions || [])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const overallOutcome = (verdicts) => {
    if (!verdicts?.length) return 'Approved'
    if (verdicts.some((v) => v.outcome === 'Blocked')) return 'Blocked'
    if (verdicts.some((v) => v.outcome === 'Flagged')) return 'Flagged'
    return 'Approved'
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My submissions</h1>
          <p className="page-sub">Filter and review the outcome of every image you've submitted</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="field-row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="field" style={{ flex: '1 1 160px', marginBottom: 0 }}>
            <label className="field-label">Outcome</label>
            <select className="select-input" value={filters.outcome} onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}>
              <option value="">All outcomes</option>
              <option value="Approved">Approved</option>
              <option value="Flagged">Flagged</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 200px', marginBottom: 0 }}>
            <label className="field-label">Category</label>
            <select className="select-input" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 140px', marginBottom: 0 }}>
            <label className="field-label">From</label>
            <input type="date" className="field-input" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </div>
          <div className="field" style={{ flex: '1 1 140px', marginBottom: 0 }}>
            <label className="field-label">To</label>
            <input type="date" className="field-input" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card card-flush">
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
        ) : submissions?.length === 0 ? (
          <div className="empty-state">
            <Icon.Inbox />
            <div className="empty-state-title">No submissions yet</div>
            <div className="empty-state-sub">Images you submit for screening will show up here.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Images</th>
                <th>Outcome</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {submissions?.map((s) => (
                <tr key={s.id} className="clickable" onClick={() => navigate(`/history/${s.id}`)}>
                  <td className="table-mono">{new Date(s.createdAt).toLocaleString()}</td>
                  <td>{s.images?.length || 0} image{(s.images?.length || 0) !== 1 ? 's' : ''}</td>
                  <td><StatusBadge status={overallOutcome(s.verdicts)} /></td>
                  <td style={{ textAlign: 'right' }}><Icon.ChevronRight style={{ width: 16, height: 16, color: 'var(--text-tertiary)' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
