'use client'

import { useState } from 'react'
import type { Subscription } from '@klevo/types'

type SubscriptionAction = 'keep' | 'cancel' | null

type SubscriptionListProps = {
  subscriptions: Subscription[]
  onKeep?: (name: string) => void
  onCancel?: (name: string) => void
}

export function SubscriptionList({ subscriptions, onKeep, onCancel }: SubscriptionListProps) {
  const [actions, setActions] = useState<Record<string, SubscriptionAction>>({})

  const totalMonthly = subscriptions.reduce((sum, s) => sum + s.amount_per_month, 0)

  const handleAction = (name: string, action: SubscriptionAction) => {
    setActions(prev => ({ ...prev, [name]: action }))
    if (action === 'keep') onKeep?.(name)
    if (action === 'cancel') onCancel?.(name)
  }

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <span className="text-4xl mb-3">✅</span>
        <p className="text-white font-semibold text-lg">Молодец! Лишних подписок нет</p>
        <p className="text-zinc-400 text-sm mt-1">Все регулярные платежи выглядят разумно</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
        <p className="text-red-400 text-sm font-medium">Уходит в паразитов</p>
        <p className="text-white text-2xl font-bold mt-1">
          ₽{totalMonthly.toLocaleString('ru-RU')}/мес
        </p>
      </div>

      <ul className="space-y-2">
        {subscriptions.map((sub) => {
          const action = actions[sub.name]
          return (
            <li
              key={sub.name}
              className={[
                'rounded-xl p-4 border transition-all',
                action === 'keep'
                  ? 'bg-zinc-900 border-zinc-700 opacity-60'
                  : action === 'cancel'
                    ? 'bg-red-500/5 border-red-500/30'
                    : 'bg-zinc-900 border-zinc-800',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">{sub.name}</p>
                    {sub.confidence === 'high' && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full flex-shrink-0">
                        точно
                      </span>
                    )}
                    {!sub.is_active && (
                      <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full flex-shrink-0">
                        неактивна?
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    Последнее списание: {new Date(sub.last_charge_date).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white font-semibold">
                    ₽{sub.amount_per_month.toLocaleString('ru-RU')}
                  </p>
                  <p className="text-zinc-500 text-xs">в месяц</p>
                </div>
              </div>

              {!action && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAction(sub.name, 'keep')}
                    className="flex-1 py-1.5 rounded-lg text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    Оставить
                  </button>
                  <button
                    onClick={() => handleAction(sub.name, 'cancel')}
                    className="flex-1 py-1.5 rounded-lg text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                  >
                    Отписаться
                  </button>
                </div>
              )}

              {action === 'keep' && (
                <p className="mt-3 text-xs text-zinc-500">Помечено как нужное</p>
              )}
              {action === 'cancel' && (
                <p className="mt-3 text-xs text-red-400">
                  Напоминание добавлено — не забудь отписаться!
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
