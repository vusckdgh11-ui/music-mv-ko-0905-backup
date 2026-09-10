import { useCallback, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'

interface FileUploaderProps {
  label: string
  accept: string
  onFile: (file: File) => void
  preview?: string
  displayName?: string
}

export function FileUploader({ label, accept, onFile, preview, displayName }: FileUploaderProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      onFile(file)
    },
    [onFile],
  )

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  return (
    <div
      className={`uploader ${dragging ? 'uploader--dragging' : ''} ${preview ? 'uploader--filled' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      {preview ? (
        <div className="uploader__preview">
          {accept.startsWith('image/') ? (
            <img src={preview} alt="preview" className="uploader__image" />
          ) : (
            <span className="uploader__name">{displayName || label}</span>
          )}
        </div>
      ) : (
        <div className="uploader__placeholder">
          <span className="uploader__label">{label}</span>
          <span className="uploader__hint">{t('dragOrClick')}</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} hidden />
    </div>
  )
}
