'use client'

import { useState } from 'react'

type RoastCardProps = {
  content: string
  summary?: string
  shareToken?: string
  isStreaming?: boolean
  onShare?: (token: string) => void
}

export function RoastCard({
  content,
  summary,
  shareToken,
  isStreaming = false,
  onShare,
}: RoastCardProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (!shareToken) return
    const url = `${window.location.origin}/share/${shareToken}`

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    onShare?.(shareToken)
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-900/40 to-zinc-900 border border-violet-500/30 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔥</span>
        <h2 className="text-white font-bold text-xl">Твой ростер</h2>
        {isStreaming && (
          <span className="ml-auto flex items-center gap-1.5 text-violet-400 text-sm">
            <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
            Генерирую...
          </span>
        )}
      </div>

      <div className="text-zinc-200 leading-relaxed whitespace-pre-wrap text-sm">
        {content}
        {isStreaming && (
          <span className="inline-block w-0.5 h-4 bg-violet-400 animate-pulse ml-0.5 align-middle" />
        )}
      </div>

      {!isStreaming && shareToken && (
        <div className="pt-2 border-t border-zinc-700/50 flex items-center gap-3">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            {copied ? '✓ Скопировано!' : '📤 Поделиться'}
          </button>
          {summary && (
            <p className="text-zinc-500 text-xs flex-1 truncate">
              &ldquo;{summary}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  )
}
