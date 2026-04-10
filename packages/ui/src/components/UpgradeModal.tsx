'use client'

type UpgradeModalProps = {
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
  reason?: 'roast_limit' | 'chat_limit' | 'feature'
}

const REASONS: Record<NonNullable<UpgradeModalProps['reason']>, { title: string; text: string }> = {
  roast_limit:  {
    title: 'Бесплатный ростер использован',
    text:  'У тебя 1 бесплатный ростер в месяц. Апгрейдись до Клёво Plus — получи безлимит.',
  },
  chat_limit:   {
    title: 'Лимит вопросов исчерпан',
    text:  'Ты исчерпал 3 бесплатных вопроса этого месяца. Апгрейдись для безлимитного доступа.',
  },
  feature:      {
    title: 'Функция доступна в Plus',
    text:  'Эта функция доступна только в Клёво Plus.',
  },
}

const FEATURES = [
  'Безлимитные AI-ростеры',
  'Безлимитный AI-чат',
  'Автосбережения и цели',
  'История трат 12 месяцев',
  'Подключение банка (скоро)',
]

export function UpgradeModal({ isOpen, onClose, onUpgrade, reason = 'feature' }: UpgradeModalProps) {
  if (!isOpen) return null

  const { title, text } = REASONS[reason]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-700 p-6 space-y-5">
        <div className="text-center">
          <span className="text-4xl">⚡</span>
          <h2 className="text-white font-bold text-xl mt-2">{title}</h2>
          <p className="text-zinc-400 text-sm mt-1">{text}</p>
        </div>

        <div className="rounded-xl bg-violet-500/10 border border-violet-500/30 p-4 space-y-2">
          <p className="text-violet-300 text-xs font-semibold uppercase tracking-wider">
            Клёво Plus включает
          </p>
          <ul className="space-y-1.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-zinc-200">
                <span className="text-violet-400 text-xs">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onUpgrade}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-lg transition-colors"
        >
          299₽/мес — Попробовать Plus
        </button>

        <button
          onClick={onClose}
          className="w-full py-2 text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
        >
          Не сейчас
        </button>
      </div>
    </div>
  )
}
