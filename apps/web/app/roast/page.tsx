'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoastCard, UpgradeModal } from '@klevo/ui'
import Link from 'next/link'

type RoastState = 'idle' | 'streaming' | 'done' | 'error' | 'rate_limited' | 'insufficient'

export default function RoastPage() {
  const router = useRouter()
  const [state, setState] = useState<RoastState>('idle')
  const [text, setText] = useState('')
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [retryAfter, setRetryAfter] = useState(0)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    startRoast()
    return () => abortRef.current?.abort()
  }, [])

  async function startRoast() {
    setState('streaming')
    setText('')
    setShareToken(null)

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: 'last_month' }),
        signal: abortRef.current.signal,
      })

      if (res.status === 429) {
        const data = await res.json() as { error: { retry_after: number } }
        setRetryAfter(data.error.retry_after ?? 60)
        setState('rate_limited')
        setShowUpgrade(true)
        return
      }

      if (res.status === 422) {
        setState('insufficient')
        return
      }

      if (!res.ok || !res.body) {
        setState('error')
        return
      }

      // Read SSE stream
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const payload = JSON.parse(line.slice(5).trim()) as Record<string, unknown>
              if (typeof payload.text === 'string') {
                setText(prev => prev + payload.text)
              }
              if (typeof payload.summary === 'string') {
                setSummary(payload.summary)
              }
              if (typeof payload.roast_id === 'string') {
                setShareToken(payload.share_token as string ?? null)
                setState('done')
              }
            } catch {
              // ignore parse errors in SSE stream
            }
          }
          if (line.startsWith('event: done')) {
            setState('done')
          }
        }
      }

      if (state !== 'done') setState('done')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setState('error')
      }
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Назад
        </Link>
        <h1 className="text-2xl font-bold text-white">AI Ростер</h1>
      </div>

      {state === 'insufficient' && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-white font-semibold">Маловато данных</p>
          <p className="text-zinc-400 text-sm mt-1">
            Нужно минимум 5 транзакций для ростера. Загрузи выписку побольше!
          </p>
          <Link
            href="/"
            className="mt-4 inline-block px-6 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            Загрузить CSV
          </Link>
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-2xl bg-zinc-900 border border-red-500/30 p-8 text-center">
          <p className="text-3xl mb-3">😅</p>
          <p className="text-white font-semibold">AI задумался...</p>
          <p className="text-zinc-400 text-sm mt-1">Что-то пошло не так</p>
          <button
            onClick={startRoast}
            className="mt-4 px-6 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            Попробовать ещё раз
          </button>
        </div>
      )}

      {(state === 'streaming' || state === 'done') && text && (
        <RoastCard
          content={text}
          summary={summary ?? undefined}
          shareToken={shareToken ?? undefined}
          isStreaming={state === 'streaming'}
        />
      )}

      {state === 'done' && (
        <button
          onClick={startRoast}
          className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
        >
          Поджарить ещё раз
        </button>
      )}

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => router.push('/upgrade')}
        reason="roast_limit"
      />
    </main>
  )
}
