import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { appealApi } from '../../api/appeals'
import { Icon } from '../../components/Icon'
import StatusBadge from '../../components/StatusBadge'

export default function MyAppeals() {
  const [appeals, setAppeals] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    appealApi.getMine()
      .then(({ data }) => setAppeals(data.appeals || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My appeals</h1>
          <p className="page-sub">Track the status of verdicts you've disputed</p>
        </div>
      </div>

      <div className="card card-flush">
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
        ) : appeals?.length === 0 ? (
          <div className="empty-state">
            <Icon.Flag />
            <div className="empty-state-title">No appeals filed</div>
            <div className="empty-state-sub">Appeals on flagged or blocked submissions will appear here.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Filed</th>
                <th>Reason</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appeals?.map((a) => (
                <tr key={a.id} className="clickable" onClick={() => navigate(`/history/${a.submissionId}`)}>
                  <td className="table-mono">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</td>
                  <td><StatusBadge status={a.status} /></td>
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
