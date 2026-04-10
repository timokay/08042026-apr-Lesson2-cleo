import { notFound } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import Link from 'next/link'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('roasts')
    .select('summary')
    .eq('share_token', token)
    .eq('is_public', true)
    .single()

  return {
    title: 'Клёво — мой AI-ростер расходов',
    description: data?.summary ?? 'Честный AI-анализ трат с юмором',
    openGraph: {
      title: 'Клёво — AI ростер',
      description: data?.summary ?? '',
    },
  }
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // token validation
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(token)) notFound()

  const supabase = await createClient()
  const { data: roast } = await supabase
    .from('roasts')
    .select('content, summary, created_at')
    .eq('share_token', token)
    .eq('is_public', true)
    .single()

  if (!roast) notFound()

  const date = new Date(roast.created_at as string).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Клёво</h1>
          <p className="text-zinc-500 text-sm mt-1">{date}</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-violet-900/40 to-zinc-900 border border-violet-500/30 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <h2 className="text-white font-bold text-xl">AI Ростер расходов</h2>
          </div>
          <p className="text-zinc-200 leading-relaxed text-sm whitespace-pre-wrap">
            {roast.content as string}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 text-center space-y-3">
          <p className="text-white font-semibold">Хочешь узнать, куда уходят твои деньги?</p>
          <p className="text-zinc-400 text-sm">
            Загрузи выписку и получи честный AI-ростер своих трат
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
          >
            Попробовать бесплатно →
          </Link>
        </div>
      </div>
    </main>
  )
}
