import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { CategoryPieChart, SubscriptionList } from '@klevo/ui'
import type { CategorySummary, Subscription } from '@klevo/types'
import Link from 'next/link'

async function getDashboardData(userId: string, period: string) {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://ai-service:8000'

  const supabase = await createClient()

  // Date range
  const now = new Date()
  const daysBack = period === '3months' ? 90 : period === '6months' ? 180 : 30
  const since = new Date(now)
  since.setDate(since.getDate() - daysBack)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', since.toISOString().split('T')[0])
    .order('transaction_date', { ascending: false })

  if (!transactions || transactions.length === 0) {
    return null
  }

  // Get last roast this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const { data: recentRoast } = await supabase
    .from('roasts')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString())
    .limit(1)
    .single()

  // Categorize via AI service
  const res = await fetch(`${AI_SERVICE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions, user_id: userId }),
    cache: 'no-store',
  }).catch(() => null)

  if (!res?.ok) {
    // Fallback: return raw transactions without categories
    return { transactions, categories: [], parasites: [], hasRoastThisMonth: !!recentRoast }
  }

  const data = await res.json()
  return {
    transactions,
    categories: data.categories as CategorySummary[],
    parasites: data.parasites as Subscription[],
    totalSpent: data.total_spent as number,
    hasRoastThisMonth: !!recentRoast,
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const params = await searchParams
  const period = params.period ?? '1month'
  const data = await getDashboardData(user.id, period)

  if (!data) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Мои финансы</h1>
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-10 text-center">
          <p className="text-4xl mb-3">📂</p>
          <p className="text-white font-semibold text-lg">Загрузи выписку для начала</p>
          <p className="text-zinc-400 text-sm mt-1">Пока нет данных для анализа</p>
          <Link
            href="/"
            className="mt-4 inline-block px-6 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            Загрузить CSV
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Мои финансы</h1>
        <div className="flex gap-2">
          {(['1month', '3months', '6months'] as const).map(p => (
            <Link
              key={p}
              href={`/dashboard?period=${p}`}
              className={[
                'px-3 py-1 rounded-lg text-sm transition-colors',
                period === p
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white',
              ].join(' ')}
            >
              {p === '1month' ? '1 мес' : p === '3months' ? '3 мес' : '6 мес'}
            </Link>
          ))}
        </div>
      </div>

      {data.totalSpent && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
          <p className="text-zinc-400 text-sm">Потрачено за период</p>
          <p className="text-3xl font-bold text-white mt-1">
            ₽{data.totalSpent.toLocaleString('ru-RU')}
          </p>
        </div>
      )}

      {data.categories.length > 0 && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
          <h2 className="text-white font-semibold mb-4">Топ-5 категорий</h2>
          <CategoryPieChart categories={data.categories} />
        </div>
      )}

      {data.parasites.length > 0 && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
          <h2 className="text-white font-semibold mb-4">Паразитные подписки</h2>
          <SubscriptionList subscriptions={data.parasites} />
        </div>
      )}

      <Link
        href="/roast"
        className="block w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-center text-lg hover:opacity-90 transition-opacity"
      >
        🔥 Поджарь мои расходы
      </Link>
    </main>
  )
}
