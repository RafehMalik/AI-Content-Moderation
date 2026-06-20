import { useState, useEffect, useCallback } from 'react'
import { appealApi } from '../../api/appeals'
import { useToast } from '../../context/ToastContext'
import { Icon } from '../../components/Icon'
import StatusBadge from '../../components/StatusBadge'

function ReviewModal({ appeal, onClose, onSubmit }) {
  const [response, setResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handle = async (status) => {
    setSubmitting(true)
    await onSubmit(appeal.id, status, response)
    setSubmitting(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Review appeal</h3>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {appeal.imageUrls?.slice(0, 4).map((url, i) => (
            <img key={i} src={url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-subtle)' }} />
          ))}
        </div>

        <div className="kv-row"><span className="kv-key">Submitted by</span><span className="kv-val">{appeal.userName}</span></div>
        <div className="kv-row"><span className="kv-key">Filed</span><span className="kv-val">{new Date(appeal.createdAt).toLocaleString()}</span></div>

        <div style={{ margin: '14px 0' }}>
          <label className="field-label">User's reason</label>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{appeal.reason}</p>
        </div>

        <div className="field">
          <label className="field-label">Your response (optional)</label>
          <textarea
            className="field-input"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="e.g. Reviewed manually. No violation found."
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ok" style={{ flex: 1 }} onClick={() => handle('Accepted')} disabled={submitting}>
            <Icon.Check /> Accept
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handle('Rejected')} disabled={submitting}>
            <Icon.X /> Reject
          </button>
        </div>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={onClose} disabled={submitting}>Cancel</button>
      </div>
    </div>
  )
}

export default function AdminAppealQueue() {
  const [appeals, setAppeals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('Pending')
  const [selected, setSelected] = useState(null)
  const { showToast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await appealApi.getAll(statusFilter)
      setAppeals(data.appeals || [])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const handleReview = async (id, status, response) => {
    try {
      await appealApi.review(id, status, response)
      showToast(`Appeal ${status.toLowerCase()}`)
      setSelected(null)
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not review appeal', 'error')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Appeal queue</h1>
          <p className="page-sub">Review disputed verdicts from users</p>
        </div>
      </div>

      <div className="tab-bar">
        {['Pending', 'Accepted', 'Rejected', ''].map((s) => (
          <div key={s} className={`tab-item ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)} style={{ cursor: 'pointer' }}>
            {s || 'All'}
          </div>
        ))}
      </div>

      <div className="card card-flush">
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
        ) : appeals?.length === 0 ? (
          <div className="empty-state">
            <Icon.Inbox />
            <div className="empty-state-title">No appeals here</div>
            <div className="empty-state-sub">Appeals matching this filter will appear here.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Reason</th>
                <th>Filed</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appeals?.map((a) => (
                <tr key={a.id} className={a.status === 'Pending' ? 'clickable' : ''} onClick={() => a.status === 'Pending' && setSelected(a)}>
                  <td>{a.userName}</td>
                  <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</td>
                  <td className="table-mono">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    {a.status === 'Pending' && (
                      <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setSelected(a) }}>Review</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <ReviewModal appeal={selected} onClose={() => setSelected(null)} onSubmit={handleReview} />
      )}
    </div>
  )
}
