import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { adminApi } from '../../api/admin'
import { Icon } from '../../components/Icon'

const OUTCOME_COLORS = { Approved: '#3DD68C', Flagged: '#F2A924', Blocked: '#F2495C' }

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

function TooltipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill, fontFamily: 'var(--font-mono)' }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getAnalytics()
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="page"><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner" /></div></div>
  }
  if (!data) return null

  const outcomeData = (data.verdicts?.byOutcome || []).map((o) => ({ name: o.Outcome, value: o.Count }))
  const categoryData = (data.verdicts?.byCategory || []).map((c) => ({ name: c.Category, count: c.Count }))
  const timelineData = (data.submissions?.timeline || []).map((t) => ({ date: t.Date?.slice(5), count: t.Count }))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Platform-wide moderation activity</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Total submissions" value={data.submissions?.total ?? 0} />
        <StatCard label="Today" value={data.submissions?.today ?? 0} />
        <StatCard label="This week" value={data.submissions?.week ?? 0} />
        <StatCard label="Pending appeals" value={data.appeals?.pending ?? 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, margin: '0 0 16px' }}>Verdict distribution</h3>
          {outcomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={outcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {outcomeData.map((entry, i) => (
                    <Cell key={i} fill={OUTCOME_COLORS[entry.name] || '#9AA4B8'} stroke="var(--bg-raised)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipBox />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            {outcomeData.map((o) => (
              <div key={o.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: OUTCOME_COLORS[o.name] }} />
                {o.name} ({o.value})
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, margin: '0 0 16px' }}>Detections by category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: '#9AA4B8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" fill="#F2A924" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, margin: '0 0 16px' }}>Submissions, last 7 days</h3>
        {timelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262C39" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9AA4B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9AA4B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<TooltipBox />} />
              <Line type="monotone" dataKey="count" stroke="#F2A924" strokeWidth={2} dot={{ fill: '#F2A924', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, margin: '0 0 14px' }}>Top submitters</h3>
          <RankedList items={data.topUsers?.bySubmissions} icon={<Icon.Upload />} />
        </div>
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, margin: '0 0 14px' }}>Most violations</h3>
          <RankedList items={data.topUsers?.byViolations} icon={<Icon.AlertTriangle />} danger />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, margin: '0 0 6px' }}>Appeals overview</h3>
        <div className="stat-grid" style={{ marginTop: 12, marginBottom: 0 }}>
          <StatCard label="Total" value={data.appeals?.total ?? 0} />
          <StatCard label="Pending" value={data.appeals?.pending ?? 0} />
          <StatCard label="Accepted" value={data.appeals?.accepted ?? 0} />
          <StatCard label="Rejected" value={data.appeals?.rejected ?? 0} />
        </div>
      </div>
    </div>
  )
}

function EmptyChart() {
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>No data yet</div>
}

function RankedList({ items, icon, danger }) {
  if (!items?.length) return <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No data yet</p>
  return (
    <div>
      {items.map((u, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)', width: 18 }}>{i + 1}</span>
          <div style={{ flex: 1, fontSize: 13 }}>{u.userName}</div>
          <span className={`badge ${danger ? 'badge-danger' : 'badge-neutral'}`}>{u.count}</span>
        </div>
      ))}
    </div>
  )
}
