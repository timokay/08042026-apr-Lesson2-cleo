'use client'

import { useCallback, useState } from 'react'

type UploadState = 'idle' | 'dragging' | 'uploading' | 'error'

type CsvUploadZoneProps = {
  onUpload: (file: File) => Promise<void>
  accept?: string
  maxSizeMb?: number
}

export function CsvUploadZone({
  onUpload,
  accept = '.csv',
  maxSizeMb = 10,
}: CsvUploadZoneProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setErrorMessage(null)

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setErrorMessage('Не смогли прочитать файл. Попробуй CSV из Т-Банка')
      setState('error')
      return
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      setErrorMessage(`Файл слишком большой. Максимум ${maxSizeMb} МБ`)
      setState('error')
      return
    }

    setState('uploading')
    try {
      await onUpload(file)
      setState('idle')
    } catch {
      setState('error')
      setErrorMessage('Ошибка загрузки. Попробуй ещё раз')
    }
  }, [onUpload, maxSizeMb])

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setState('idle')
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setState('dragging') }}
      onDragLeave={() => setState('idle')}
      onDrop={onDrop}
      className={[
        'relative flex flex-col items-center justify-center',
        'rounded-2xl border-2 border-dashed p-10 text-center',
        'transition-all duration-200 cursor-pointer',
        state === 'dragging'
          ? 'border-violet-500 bg-violet-500/10'
          : state === 'error'
            ? 'border-red-500 bg-red-500/5'
            : 'border-zinc-600 bg-zinc-900 hover:border-violet-500 hover:bg-violet-500/5',
      ].join(' ')}
    >
      <input
        type="file"
        accept={accept}
        onChange={onInputChange}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label="Загрузить CSV выписку"
      />

      {state === 'uploading' ? (
        <>
          <div className="h-12 w-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin mb-4" />
          <p className="text-white font-semibold text-lg">Анализируем...</p>
          <p className="text-zinc-400 text-sm mt-1">Это займёт несколько секунд</p>
        </>
      ) : (
        <>
          <div className="text-5xl mb-4">📂</div>
          <p className="text-white font-semibold text-lg">
            Перетащи CSV выписку сюда
          </p>
          <p className="text-zinc-400 text-sm mt-1">
            или нажми для выбора файла
          </p>
          <p className="text-zinc-500 text-xs mt-3">
            Т-Банк, Сбербанк, Альфа-Банк · до {maxSizeMb} МБ
          </p>
          {state === 'error' && errorMessage && (
            <p className="mt-3 text-red-400 text-sm font-medium">{errorMessage}</p>
          )}
        </>
      )}
    </div>
  )
}
