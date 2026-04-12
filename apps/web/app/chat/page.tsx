'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

type ChatState = 'idle' | 'streaming' | 'error' | 'no_transactions' | 'daily_limit'

const QUICK_REPLIES = [
  '🔥 Поджарь мои расходы',
  '💸 На что трачу больше всего?',
  '🐛 Какие подписки лишние?',
]

// Generate a stable session_id per browser tab
function getSessionId(): string {
  const key = 'klevo_chat_session'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
  }
  return id
}

function ChatContent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [state, setState] = useState<ChatState>('idle')
  const [retryAfter, setRetryAfter] = useState(0)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sessionId = useRef<string>('')

  useEffect(() => {
    sessionId.current = getSessionId()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || state === 'streaming') return

    setShowQuickReplies(false)
    setState('streaming')

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      streaming: true,
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId.current }),
        signal: abortRef.current.signal,
      })

      if (res.status === 429) {
        const data = await res.json() as { error: { code: string; retry_after?: number } }
        setMessages(prev => prev.slice(0, -2)) // remove optimistic messages
        if (data.error.code === 'DAILY_LIMIT') {
          setRetryAfter(data.error.retry_after ?? 0)
          setState('daily_limit')
        } else {
          setState('error')
        }
        return
      }

      if (res.status === 422) {
        setMessages(prev => prev.slice(0, -2))
        setState('no_transactions')
        return
      }

      if (!res.ok || !res.body) {
        setMessages(prev => prev.slice(0, -2))
        setState('error')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const payload = JSON.parse(line.slice(5).trim()) as Record<string, unknown>
              if (typeof payload.text === 'string') {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + payload.text }
                    : m,
                ))
              }
              if (payload.code === 'AI_UNAVAILABLE') {
                setMessages(prev => prev.slice(0, -1)) // remove empty assistant msg
                setState('error')
                return
              }
            } catch {
              // ignore parse errors
            }
          }
          if (line.startsWith('event: done')) {
            setMessages(prev => prev.map(m =>
              m.id === assistantMsg.id ? { ...m, streaming: false } : m,
            ))
            setState('idle')
          }
        }
      }

      setState('idle')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => prev.slice(0, -2))
        setState('error')
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <main className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
        <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          ←
        </Link>
        <div>
          <p className="text-white font-semibold text-sm">Клёво</p>
          <p className="text-zinc-500 text-xs">финансовый советник</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">💬</p>
            <p className="text-white font-semibold">Привет! Я Клёво</p>
            <p className="text-zinc-400 text-sm mt-1">Спроси что-нибудь о своих расходах</p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={['flex', msg.role === 'user' ? 'justify-end' : 'justify-start'].join(' ')}
          >
            <div
              className={[
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-sm'
                  : 'bg-zinc-800 text-zinc-100 rounded-bl-sm',
              ].join(' ')}
            >
              {msg.content || (msg.streaming ? (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                </span>
              ) : null)}
              {msg.streaming && msg.content && (
                <span className="inline-block w-0.5 h-4 bg-zinc-400 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          </div>
        ))}

        {/* Error states */}
        {state === 'no_transactions' && (
          <div className="rounded-2xl bg-zinc-900 border border-zinc-700 p-5 text-center">
            <p className="text-white font-semibold">Нет данных для анализа</p>
            <p className="text-zinc-400 text-sm mt-1">Сначала загрузи выписку из банка</p>
            <Link href="/" className="mt-3 inline-block px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium">
              Загрузить CSV
            </Link>
          </div>
        )}

        {state === 'daily_limit' && (
          <div className="rounded-2xl bg-zinc-900 border border-zinc-700 p-5 text-center">
            <p className="text-white font-semibold">Лимит 10 сообщений/день</p>
            <p className="text-zinc-400 text-sm mt-1">Upgrade до Plus для безлимита</p>
            <Link href="/upgrade" className="mt-3 inline-block px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-sm font-medium">
              Получить Plus
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="rounded-2xl bg-zinc-900 border border-red-500/20 p-4 text-center">
            <p className="text-zinc-300 text-sm">AI сейчас недоступен, попробуй позже</p>
            <button
              onClick={() => setState('idle')}
              className="mt-2 text-violet-400 text-sm hover:text-violet-300"
            >
              Попробовать снова
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick replies (shown only before first message) */}
      {showQuickReplies && messages.length === 0 && (
        <div className="px-4 pb-2 flex flex-col gap-2">
          {QUICK_REPLIES.map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-left px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t border-zinc-800 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={state === 'streaming' || state === 'daily_limit'}
          placeholder="Спроси о своих расходах..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || state === 'streaming' || state === 'daily_limit'}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          →
        </button>
      </form>
    </main>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ChatContent />
    </Suspense>
  )
}
