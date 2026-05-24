import { useState, useRef } from 'react'
import { Upload, FileText, Check, Loader2 } from 'lucide-react'

interface Props {
  onSuccess: (vectorCount: number) => void
}

export default function DocumentUpload({ onSuccess }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...dropped])
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)

    const formData = new FormData()
    files.forEach(f => formData.append('files', f))

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        setResult(`✅ 成功处理 ${data.results.length} 个文件，共 ${data.totalVectors} 个向量片段`)
        onSuccess(data.totalVectors)
        setFiles([])
      } else {
        setResult('❌ 上传失败')
      }
    } catch (err) {
      setResult('❌ 网络错误')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileText size={18} color="#38bdf8" />
        文档上传
      </h3>

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: '2px dashed #475569',
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#38bdf8')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#475569')}
      >
        <Upload size={32} color="#64748b" style={{ marginBottom: 12 }} />
        <p style={{ color: '#94a3b8', fontSize: 14 }}>
          拖拽文件到此处，或点击上传
        </p>
        <p style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
          支持 PDF、TXT、MD、JSON、代码文件
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.json,.js,.ts,.py"
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files) {
              setFiles(prev => [...prev, ...Array.from(e.target.files!)])
            }
          }}
        />
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
            待上传 ({files.length}):
          </p>
          {files.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', background: '#1e293b',
              borderRadius: 6, marginBottom: 4, fontSize: 13,
            }}>
              <FileText size={14} color="#38bdf8" />
              {f.name}
              <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 11 }}>
                {(f.size / 1024).toFixed(1)} KB
              </span>
            </div>
          ))}
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              width: '100%', marginTop: 12, padding: '10px',
              background: uploading ? '#334155' : '#38bdf8',
              color: uploading ? '#94a3b8' : '#0f172a',
              border: 'none', borderRadius: 8,
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {uploading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
            {uploading ? '处理中...' : '构建知识库'}
          </button>
        </div>
      )}

      {result && (
        <div style={{
          marginTop: 16, padding: 12, background: '#1e293b',
          borderRadius: 8, fontSize: 13, color: '#e2e8f0',
          borderLeft: '3px solid #38bdf8',
        }}>
          {result}
        </div>
      )}
    </div>
  )
}
