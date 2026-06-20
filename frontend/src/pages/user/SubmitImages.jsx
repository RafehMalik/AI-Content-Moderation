import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { submissionApi } from '../../api/submissions'
import { useToast } from '../../context/ToastContext'
import { Icon } from '../../components/Icon'
import StatusBadge from '../../components/StatusBadge'

export default function SubmitImages() {
  const [files, setFiles] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const inputRef = useRef(null)
  const { showToast } = useToast()
  const navigate = useNavigate()

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )
    if (valid.length < newFiles.length) {
      showToast('Some files were skipped — only JPG, PNG, WEBP allowed', 'error')
    }
    setFiles((prev) => [...prev, ...valid.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))])
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragActive(false)
    addFiles(e.dataTransfer.files)
  }, [])

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (files.length === 0) return
    setUploading(true)
    setProgress(0)
    setResult(null)
    try {
      const { data } = await submissionApi.submit(
        files.map((f) => f.file),
        setProgress
      )
      setResult(data)
      showToast(`Submission processed — ${data.verdicts?.length || 0} image(s) screened`)
      setFiles([])
    } catch (err) {
      showToast(err.response?.data?.error || 'Submission failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Submit images</h1>
          <p className="page-sub">Each image is screened independently against active moderation categories</p>
        </div>
      </div>

      {!result && (
        <>
          <div
            className={`dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Icon.Upload style={{ margin: '0 auto 10px', display: 'block' }} />
            <div className="dropzone-text">Drop images here or click to browse</div>
            <div className="dropzone-sub">JPG, PNG, or WEBP — multiple files supported</div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="image-grid">
                {files.map((f, idx) => (
                  <div key={idx} className="image-thumb">
                    <img src={f.preview} alt={f.file.name} />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(idx) }}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6,
                        width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <Icon.X style={{ width: 12, height: 12, color: '#fff' }} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={uploading}>
                  {uploading ? <span className="spinner" /> : <Icon.Upload />}
                  {uploading ? `Uploading ${progress}%` : `Screen ${files.length} image${files.length > 1 ? 's' : ''}`}
                </button>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                  {files.length} file{files.length > 1 ? 's' : ''} selected
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {result && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: 0 }}>Screening results</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setResult(null)}>
              <Icon.Upload /> Submit more
            </button>
          </div>

          {result.verdicts?.map((v, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
              <img
                src={v.imageUrl}
                alt=""
                style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-subtle)', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <StatusBadge status={v.outcome} />
                  {v.outcome !== 'Approved' && (
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Can be appealed from your submission history</span>
                  )}
                </div>
                {v.categoryResults?.filter((c) => c.detected).length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {v.categoryResults.filter((c) => c.detected).map((c, j) => (
                      <span key={j} className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)' }}>
                        {c.category} · {c.confidence.toFixed(0)}%
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No policy violations detected</span>
                )}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}>
              View in submission history <Icon.ChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
