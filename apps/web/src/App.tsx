import { type FormEvent, useEffect, useMemo, useState } from 'react'
import './App.css'

type Memo = {
  id: number
  content: string
  status: string | null
  sent_to_slack: number
  resolved: number
  created_at: string
}

type Summary = {
  week: {
    total: number
    stuck: number
    resolved: number
    top_stuck: { content: string; created_at: string } | null
  }
}

type DailyPoint = {
  date: string
  total: number
  stuck: number
  resolved: number
}

type Filters = {
  status: string
  resolved: 'all' | 'true' | 'false'
  from: string
  to: string
}

const PAGE_SIZE = 20
const STATUS_OPTIONS = ['集中', '調査中', '詰まり', 'レビュー待ち']

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ja-JP', { hour12: false })
}

function App() {
  const apiBase = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:3001',
    [],
  )

  const [draftFilters, setDraftFilters] = useState<Filters>({
    status: '',
    resolved: 'all',
    from: '',
    to: '',
  })
  const [filters, setFilters] = useState<Filters>({
    status: '',
    resolved: 'all',
    from: '',
    to: '',
  })
  const [offset, setOffset] = useState(0)

  const [memos, setMemos] = useState<Memo[]>([])
  const [summary, setSummary] = useState<Summary['week'] | null>(null)
  const [daily, setDaily] = useState<DailyPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingMemoId, setUpdatingMemoId] = useState<number | null>(null)

  async function fetchDashboard(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const memoParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      if (filters.status) memoParams.set('status', filters.status)
      if (filters.resolved !== 'all') memoParams.set('resolved', filters.resolved)
      if (filters.from) memoParams.set('from', filters.from)
      if (filters.to) memoParams.set('to', filters.to)

      const [memoRes, summaryRes, dailyRes] = await Promise.all([
        fetch(`${apiBase}/api/memo?${memoParams.toString()}`),
        fetch(`${apiBase}/api/stats/summary`),
        fetch(`${apiBase}/api/stats/daily?days=30`),
      ])

      if (!memoRes.ok) throw new Error(`memo API failed: ${memoRes.status}`)
      if (!summaryRes.ok) throw new Error(`summary API failed: ${summaryRes.status}`)
      if (!dailyRes.ok) throw new Error(`daily API failed: ${dailyRes.status}`)

      const memoData = (await memoRes.json()) as { memos: Memo[] }
      const summaryData = (await summaryRes.json()) as Summary
      const dailyData = (await dailyRes.json()) as { daily: DailyPoint[] }

      setMemos(memoData.memos)
      setSummary(summaryData.week)
      setDaily(dailyData.daily)
    } catch (unknownError) {
      const detail = unknownError instanceof Error ? unknownError.message : String(unknownError)
      setError(detail)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDashboard()
  }, [filters, offset])

  async function toggleResolved(memo: Memo): Promise<void> {
    setUpdatingMemoId(memo.id)
    setError(null)
    try {
      const response = await fetch(`${apiBase}/api/memo/${memo.id}/resolve`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resolved: memo.resolved !== 1 }),
      })
      if (!response.ok) throw new Error(`resolve update failed: ${response.status}`)

      setMemos((current) =>
        current.map((item) =>
          item.id === memo.id ? { ...item, resolved: memo.resolved === 1 ? 0 : 1 } : item,
        ),
      )
      void fetchDashboard()
    } catch (unknownError) {
      const detail = unknownError instanceof Error ? unknownError.message : String(unknownError)
      setError(detail)
    } finally {
      setUpdatingMemoId(null)
    }
  }

  function handleApplyFilters(event: FormEvent): void {
    event.preventDefault()
    setOffset(0)
    setFilters(draftFilters)
  }

  function clearFilters(): void {
    const empty = { status: '', resolved: 'all' as const, from: '', to: '' }
    setDraftFilters(empty)
    setOffset(0)
    setFilters(empty)
  }

  const hasPrev = offset > 0
  const hasNext = memos.length === PAGE_SIZE
  const dailyMax = daily.reduce((max, point) => Math.max(max, point.total), 1)

  return (
    <div className="dashboard">
      <header className="top">
        <div>
          <p className="eyebrow">Thought Drop</p>
          <h1>チーム進捗ダッシュボード</h1>
        </div>
        <button type="button" onClick={() => void fetchDashboard()} disabled={loading}>
          {loading ? '更新中...' : '更新'}
        </button>
      </header>

      {summary ? (
        <section className="cards">
          <article className="card">
            <p className="label">今週の投稿</p>
            <p className="value">{summary.total}</p>
          </article>
          <article className="card">
            <p className="label">今週の詰まり</p>
            <p className="value danger">{summary.stuck}</p>
          </article>
          <article className="card">
            <p className="label">今週の解決</p>
            <p className="value ok">{summary.resolved}</p>
          </article>
          <article className="card">
            <p className="label">直近の詰まり</p>
            <p className="snippet">
              {summary.top_stuck
                ? `${summary.top_stuck.content.slice(0, 60)}${summary.top_stuck.content.length > 60 ? '...' : ''}`
                : 'なし'}
            </p>
          </article>
        </section>
      ) : null}

      <section className="daily">
        <h2>30日アクティビティ</h2>
        <div className="bars">
          {daily.map((point) => (
            <div key={point.date} className="bar-wrap" title={`${point.date}: ${point.total}`}>
              <div
                className="bar"
                style={{ height: `${Math.max(8, (point.total / dailyMax) * 100)}%` }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="memo-panel">
        <form className="filters" onSubmit={handleApplyFilters}>
          <select
            value={draftFilters.status}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, status: event.currentTarget.value }))
            }
          >
            <option value="">Status: all</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={draftFilters.resolved}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                resolved: event.currentTarget.value as Filters['resolved'],
              }))
            }
          >
            <option value="all">Resolve: all</option>
            <option value="true">resolved</option>
            <option value="false">unresolved</option>
          </select>

          <input
            type="date"
            value={draftFilters.from}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, from: event.currentTarget.value }))
            }
          />
          <input
            type="date"
            value={draftFilters.to}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, to: event.currentTarget.value }))
            }
          />
          <button type="submit">絞り込み</button>
          <button type="button" className="ghost" onClick={clearFilters}>
            クリア
          </button>
        </form>

        {error ? <p className="error">エラー: {error}</p> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>時刻</th>
                <th>Status</th>
                <th>内容</th>
                <th>Slack</th>
                <th>Resolve</th>
              </tr>
            </thead>
            <tbody>
              {memos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    データがありません
                  </td>
                </tr>
              ) : (
                memos.map((memo) => (
                  <tr key={memo.id}>
                    <td>{memo.id}</td>
                    <td>{formatDateTime(memo.created_at)}</td>
                    <td>{memo.status ?? '-'}</td>
                    <td className="content">{memo.content}</td>
                    <td>{memo.sent_to_slack === 1 ? 'OK' : '未送信'}</td>
                    <td>
                      <button
                        type="button"
                        className={memo.resolved === 1 ? 'resolved' : 'unresolved'}
                        disabled={updatingMemoId === memo.id}
                        onClick={() => void toggleResolved(memo)}
                      >
                        {memo.resolved === 1 ? 'resolved' : 'open'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="pager">
          <button type="button" disabled={!hasPrev || loading} onClick={() => setOffset(offset - PAGE_SIZE)}>
            前へ
          </button>
          <span>{Math.floor(offset / PAGE_SIZE) + 1}ページ</span>
          <button type="button" disabled={!hasNext || loading} onClick={() => setOffset(offset + PAGE_SIZE)}>
            次へ
          </button>
        </footer>
      </section>
    </div>
  )
}

export default App
