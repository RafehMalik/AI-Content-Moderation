import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { submissionApi } from '../../api/submissions'
import { appealApi } from '../../api/appeals'
import { useToast } from '../../context/ToastContext'
import { Icon } from '../../components/Icon'
import StatusBadge from '../../components/StatusBadge'

function ConfidenceBar({ value }) {
  const color = value >= 70 ? 'var(--danger)' : value >= 40 ? 'var(--warn)' : 'var(--ok)'
  return (
    <div className="confidence-bar-track">
      <div className="confidence-bar-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  )
}

export default function SubmissionDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [appealReason, setAppealReason] = useState('')
  const [showAppealForm, setShowAppealForm] = useState(false)
  const [submittingAppeal, setSubmittingAppeal] = useState(false)
  const { showToast } = useToast()
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await submissionApi.getOne(id)
      setData(data)
    } catch {
      showToast('Could not load submission', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleAppeal = async (e) => {
    e.preventDefault()
    setSubmittingAppeal(true)
    try {
      await appealApi.create(id, appealReason)
      showToast('Appeal submitted')
      setShowAppealForm(false)
      setAppealReason('')
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not submit appeal', 'error')
    } finally {
      setSubmittingAppeal(false)
    }
  }

  if (loading) {
    return <div className="page"><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner" /></div></div>
  }

  if (!data) return null

  const { submission, verdicts, appeal } = data
  const isAppealable = verdicts?.some((v) => v.outcome === 'Flagged' || v.outcome === 'Blocked')

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')} style={{ marginBottom: 16 }}>
        <Icon.ArrowLeft /> Back to history
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Submission detail</h1>
          <p className="page-sub table-mono">{new Date(submission.createdAt).toLocaleString()} · {submission.id}</p>
        </div>
      </div>

      {verdicts?.map((v, i) => (
        <div key={i} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <img src={v.imageUrl} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border-subtle)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <StatusBadge status={v.outcome} />
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Policy {v.policyVersion}</span>
                {v.overriddenBy && <span className="badge badge-info">Manually overridden</span>}
              </div>

              <div style={{ marginTop: 12 }}>
                {v.categoryResults?.map((c, j) => (
                  <div key={j} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: c.detected ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{c.category}</span>
                      <span className="table-mono" style={{ color: 'var(--text-secondary)' }}>{c.confidence.toFixed(1)}%</span>
                    </div>
                    <ConfidenceBar value={c.confidence} />
                  </div>
                ))}
                {(!v.categoryResults || v.categoryResults.length === 0) && (
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>No categories flagged for review.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: '0 0 12px' }}>Appeal</h3>

        {appeal ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <StatusBadge status={appeal.status} />
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Filed {new Date(appeal.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="kv-row">
              <span className="kv-key">Your reason</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '4px 0 12px' }}>{appeal.reason}</p>
            {appeal.adminResponse && (
              <>
                <div className="kv-row"><span className="kv-key">Admin response</span></div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{appeal.adminResponse}</p>
              </>
            )}
          </div>
        ) : isAppealable ? (
          showAppealForm ? (
            <form onSubmit={handleAppeal}>
              <div className="field">
                <label className="field-label">Explain why you believe this verdict is incorrect</label>
                <textarea
                  className="field-input"
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="e.g. This is a toy gun, not a real weapon."
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" type="submit" disabled={submittingAppeal}>
                  {submittingAppeal ? <span className="spinner" /> : 'Submit appeal'}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setShowAppealForm(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="btn btn-secondary" onClick={() => setShowAppealForm(true)}>
              <Icon.Flag /> File an appeal
            </button>
          )
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>This submission was approved — no appeal needed.</p>
        )}
      </div>
    </div>
  )
}
