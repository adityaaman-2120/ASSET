import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import dayjs from 'dayjs'
import { Activity, CheckCircle2, XCircle } from 'lucide-react'
import api from '../lib/api'

// Sample series so the chart renders before any real data exists.
const sampleData = Array.from({ length: 12 }).map((_, i) => ({
  date: dayjs().subtract(11 - i, 'month').format('MMM'),
  value: Math.round(100 + Math.sin(i / 2) * 30 + i * 6),
}))

function useApiHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => (await api.get('/health')).data,
    retry: false,
  })
}

export default function Dashboard() {
  const { data, isLoading, isError } = useApiHealth()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">ASSETS Dashboard</h1>
        <p className="text-sm text-slate-500">
          Welcome to the ASSETS platform. {dayjs().format('dddd, D MMMM YYYY')}
        </p>
      </header>

      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <Activity className="h-5 w-5 text-indigo-600" />
        <span className="font-medium">Backend status:</span>
        {isLoading && <span className="text-slate-500">checking…</span>}
        {isError && (
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="h-4 w-4" /> unreachable
          </span>
        )}
        {data && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-4 w-4" /> {data.status} ({data.platform})
          </span>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Portfolio Value (sample)</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sampleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
