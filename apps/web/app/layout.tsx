import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Клёво — AI финансовый советник',
  description: 'Загрузи выписку и узнай, куда уходят деньги. Ростер расходов, паразит-детектор, AI советы.',
  keywords: ['финансы', 'бюджет', 'расходы', 'ИИ', 'советник'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
