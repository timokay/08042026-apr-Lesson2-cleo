'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CsvUploadZone } from '@klevo/ui'

export default function HomePage() {
  const router = useRouter()
  const [authMode, setAuthMode] = useState<'signup' | 'login' | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(file: File) {
    // Guest upload: store file in sessionStorage for post-auth processing
    const reader = new FileReader()
    reader.onload = () => {
      sessionStorage.setItem('pending_csv', reader.result as string)
      sessionStorage.setItem('pending_csv_name', file.name)
      setAuthMode('signup')
    }
    reader.readAsDataURL(file)
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { createClient } = await import('../lib/supabase/client')
      const supabase = createClient()

      const { error: authError } = authMode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError(authError.message)
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Что-то пошло не так. Попробуй ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  if (authMode) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Клёво</h1>
            <p className="text-zinc-400 mt-2">
              {authMode === 'signup' ? 'Создай аккаунт, чтобы сохранить анализ' : 'Войди в свой аккаунт'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              {loading ? 'Загружаем...' : authMode === 'signup' ? 'Создать аккаунт' : 'Войти'}
            </button>
          </form>

          <button
            onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
            className="w-full text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
          >
            {authMode === 'signup' ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-8">
      <div className="text-center space-y-3">
        <h1 className="text-5xl font-bold text-white">Клёво</h1>
        <p className="text-xl text-zinc-300">AI финансовый советник с характером</p>
        <p className="text-zinc-500 max-w-md mx-auto">
          Загрузи выписку из Т-Банка — узнай, куда уходят деньги, найди паразитные подписки и получи честный AI-ростер своих трат
        </p>
      </div>

      <div className="w-full max-w-lg">
        <CsvUploadZone onUpload={handleUpload} />
      </div>

      <div className="flex gap-8 text-center text-sm text-zinc-500">
        <div>
          <p className="text-2xl font-bold text-white">🔥</p>
          <p>AI-ростер</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">🦠</p>
          <p>Паразит-детектор</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">📊</p>
          <p>Топ-5 категорий</p>
        </div>
      </div>

      <button
        onClick={() => setAuthMode('login')}
        className="text-zinc-600 text-sm hover:text-zinc-400 transition-colors"
      >
        Уже есть аккаунт? Войти →
      </button>
    </main>
  )
}
