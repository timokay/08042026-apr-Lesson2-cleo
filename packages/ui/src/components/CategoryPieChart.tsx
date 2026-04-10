'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategorySummary, TransactionCategory } from '@klevo/types'

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  food_delivery:  'Доставка еды',
  restaurants:    'Рестораны',
  subscriptions:  'Подписки',
  transport:      'Транспорт',
  groceries:      'Продукты',
  shopping:       'Шопинг',
  utilities:      'ЖКХ',
  entertainment:  'Развлечения',
  savings:        'Сбережения',
  other:          'Прочее',
}

const COLORS = [
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#EF4444', // red
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#F97316', // orange
  '#84CC16', // lime
]

type CategoryPieChartProps = {
  categories: CategorySummary[]
  onCategoryClick?: (category: CategorySummary) => void
}

type CustomTooltipProps = {
  active?: boolean
  payload?: Array<{ payload: CategorySummary & { color: string } }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl bg-zinc-800 border border-zinc-700 p-3 shadow-xl text-sm">
      <p className="font-semibold text-white">{CATEGORY_LABELS[d.category]}</p>
      <p className="text-zinc-300">₽{d.total.toLocaleString('ru-RU')}</p>
      <p className="text-zinc-400">{d.percent.toFixed(1)}% · {d.count} операций</p>
    </div>
  )
}

export function CategoryPieChart({ categories, onCategoryClick }: CategoryPieChartProps) {
  const top5 = categories.slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={top5}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={120}
            paddingAngle={3}
            onClick={(_, index) => onCategoryClick?.(top5[index] as CategorySummary)}
          >
            {top5.map((entry, index) => (
              <Cell
                key={entry.category}
                fill={COLORS[index % COLORS.length]}
                stroke="transparent"
                className="cursor-pointer hover:opacity-80 transition-opacity"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="space-y-2">
        {top5.map((cat, index) => (
          <li
            key={cat.category}
            onClick={() => onCategoryClick?.(cat)}
            className="flex items-center justify-between rounded-lg px-3 py-2 bg-zinc-900 hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-zinc-200 text-sm">
                {CATEGORY_LABELS[cat.category]}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-zinc-400">{cat.percent.toFixed(0)}%</span>
              <span className="text-white font-medium">
                ₽{cat.total.toLocaleString('ru-RU')}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
