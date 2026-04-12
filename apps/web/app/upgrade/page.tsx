'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type PlanStatus = {
  plan: string
  plan_expires_at: string | null
  days_remaining: number
  is_active: boolean
}

export default function UpgradePage() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === '1'
  const failed = searchParams.get('failed') === '1'

  const [status, setStatus] = useState<PlanStatus | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/payments/status')
      .then(r => r.json())
      .then((data: PlanStatus) => setStatus(data))
      .catch(() => null)
  }, [])

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch('/api/payments/create-invoice', { method: 'POST' })
      const data = await res.json() as { payment_url?: string; error?: { code: string; message?: string }; expires_at?: string }

      if (res.status === 409) {
        // Already subscribed
        alert(data.error?.message ?? 'У тебя уже активная подписка')
        return
      }

      if (!res.ok || !data.payment_url) {
        alert('Не удалось создать счёт. Попробуй позже.')
        return
      }

      window.location.href = data.payment_url
    } catch {
      alert('Ошибка сети. Попробуй позже.')
    } finally {
      setLoading(false)
    }
  }

  const isPlus = status?.is_active && status?.plan === 'plus'

  return (
    <main className="min-h-screen p-6 max-w-lg mx-auto">
      <Link href="/dashboard" className="text-zinc-400 text-sm hover:text-white mb-6 inline-block">
        ← Назад
      </Link>

      <h1 className="text-3xl font-bold text-white mb-2">Клёво Plus</h1>
      <p className="text-zinc-400 mb-8">Безлимитный ростер расходов</p>

      {/* Success/failure banners */}
      {success && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 mb-6">
          <p className="text-emerald-400 font-semibold">Оплата прошла! 🎉</p>
          <p className="text-zinc-300 text-sm mt-1">Подписка активирована. Наслаждайся безлимитными ростерами.</p>
        </div>
      )}
      {failed && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 mb-6">
          <p className="text-red-400 font-semibold">Оплата не прошла</p>
          <p className="text-zinc-300 text-sm mt-1">Попробуй ещё раз или обратись в поддержку.</p>
        </div>
      )}

      {/* Active plan banner */}
      {isPlus && (
        <div className="rounded-2xl bg-violet-500/10 border border-violet-500/30 p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-violet-400 font-bold text-lg">Plus активен</span>
            <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-xs font-semibold">PLUS</span>
          </div>
          <p className="text-zinc-300 text-sm">
            Осталось {status.days_remaining} {pluralDays(status.days_remaining)}
            {status.plan_expires_at && (
              <> · истекает {new Date(status.plan_expires_at).toLocaleDateString('ru-RU')}</>
            )}
          </p>
        </div>
      )}

      {/* Plan comparison */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Free</p>
          <p className="text-white font-bold text-2xl mb-4">0 ₽</p>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li>✓ Загрузка CSV</li>
            <li>✓ Паразит-детектор</li>
            <li>✓ Категории</li>
            <li className="text-zinc-500">✗ 1 ростер в месяц</li>
          </ul>
        </div>

        <div className="rounded-2xl bg-gradient-to-b from-violet-900/40 to-zinc-900 border border-violet-500/40 p-5">
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider mb-3">Plus</p>
          <p className="text-white font-bold text-2xl mb-4">299 ₽<span className="text-zinc-400 text-sm font-normal">/мес</span></p>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li>✓ Загрузка CSV</li>
            <li>✓ Паразит-детектор</li>
            <li>✓ Категории</li>
            <li className="text-violet-300 font-medium">✓ Безлимитные ростеры</li>
          </ul>
        </div>
      </div>

      {/* CTA */}
      {!isPlus ? (
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Создаём счёт...' : 'Получить Plus за 299 ₽'}
        </button>
      ) : (
        <Link
          href="/roast"
          className="block w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-center text-lg hover:opacity-90 transition-opacity"
        >
          🔥 Поджарь расходы
        </Link>
      )}

      <p className="text-zinc-500 text-xs text-center mt-4">
        Оплата через Robokassa · Безопасно · ФЗ-152
      </p>
    </main>
  )
}

function pluralDays(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'день'
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'дня'
  return 'дней'
}
