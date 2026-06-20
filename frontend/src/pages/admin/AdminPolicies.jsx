import { useState, useEffect } from 'react'
import { adminApi } from '../../api/admin'
import { useToast } from '../../context/ToastContext'
import { Icon } from '../../components/Icon'

function PolicyRow({ policy, onSave }) {
  const [enabled, setEnabled] = useState(policy.enabled)
  const [threshold, setThreshold] = useState(policy.threshold)
  const [action, setAction] = useState(policy.action)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setDirty(enabled !== policy.enabled || threshold !== policy.threshold || action !== policy.action)
  }, [enabled, threshold, action, policy])

  const save = async () => {
    setSaving(true)
    try {
      await onSave(policy.id, enabled, Number(threshold), action)
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 12, opacity: enabled ? 1 : 0.6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: enabled ? 16 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className={`toggle ${enabled ? 'on' : ''}`}
            onClick={() => setEnabled(!enabled)}
            aria-label={`Toggle ${policy.category}`}
          >
            <div className="toggle-knob" />
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>{policy.category}</span>
        </div>
        {dirty && (
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Save'}
          </button>
        )}
      </div>

      {enabled && (
        <div className="field-row">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Confidence threshold ({threshold}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>
          <div className="field" style={{ marginBottom: 0, maxWidth: 200 }}>
            <label className="field-label">Enforcement</label>
            <select className="select-input" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="FlagReview">Flag for review</option>
              <option value="AutoBlock">Auto-block</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPolicies() {
  const [policies, setPolicies] = useState(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await adminApi.getPolicies()
      setPolicies(data.policies || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (id, enabled, threshold, action) => {
    try {
      await adminApi.updatePolicy(id, enabled, threshold, action)
      showToast('Policy updated')
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not update policy', 'error')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Policy configuration</h1>
          <p className="page-sub">Changes apply only to submissions made after saving — existing verdicts are not affected</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner" /></div>
      ) : (
        policies?.map((p) => <PolicyRow key={p.id} policy={p} onSave={handleSave} />)
      )}
    </div>
  )
}
