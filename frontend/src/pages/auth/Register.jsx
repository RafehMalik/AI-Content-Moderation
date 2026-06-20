import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from '../../components/AuthLayout'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setSubmitting(true)
    try {
      await register(name, email, password)
      navigate('/submit')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Create account" subtitle="Set up access to the moderation platform">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label">Full name</label>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ali Khan"
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field-label">Email</label>
          <input
            className="field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
        <div className="field">
          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
          />
        </div>
        {error && <div className="field-error" style={{ marginBottom: 14 }}>{error}</div>}
        <button className="btn btn-primary btn-block" disabled={submitting} type="submit">
          {submitting ? <span className="spinner" /> : 'Create account'}
        </button>
      </form>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 20, marginBottom: 0 }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--accent-text)', fontWeight: 500 }}>Sign in</Link>
      </p>
    </AuthLayout>
  )
}
