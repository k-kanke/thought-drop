import { type FormEvent, useEffect, useMemo, useState } from 'react'
import './App.css'

type Summary = {
  week: {
    total: number
    stuck: number
    resolved: number
    top_stuck: { content: string; created_at: string } | null
  }
}

type Contribution = {
  date: string
  total: number
  stuck: number
  resolved: number
  intensity: 0 | 1 | 2 | 3 | 4
  condition: 'normal' | 'stuck'
}

type TimelineMemo = {
  id: number
  content: string
  status: string | null
  sent_to_slack: number
  resolved: number
  created_at: string
  mode: string
  stuck_minutes: number
  tags: string[]
  screenshot_url?: string | null
}

type TimelineDay = {
  date: string
  total: number
  stuck: number
  resolved: number
}

type CharacterState = {
  level: number
  points: number
  hunger_level: number
  mood: string
  evolution_path: string
  items: Array<{ code: string; display_name: string; unlocked: boolean }>
}

type Tag = {
  id: number
  name: string
  usage_count: number
}

type TimelineView = 'list' | 'calendar'
type ResolvedFilter = 'all' | 'true' | 'false'
type ModeFilter = 'all' | 'instant' | 'stockpile'

const STATUS_OPTIONS = ['集中', '調査中', '詰まり', 'レビュー待ち']

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ja-JP', { hour12: false })
}

function defaultRange(): { from: string; to: string } {
  const to = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const from = new Date((new Date(to).getTime()) - 27 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return { from, to }
}

function App() {
  const apiBase = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:3001',
    [],
  )
  const range = useMemo(() => defaultRange(), [])

  const [timelineView, setTimelineView] = useState<TimelineView>('list')
  const [statusFilter, setStatusFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [resolvedFilter, setResolvedFilter] = useState<ResolvedFilter>('all')
  const [fromDate, setFromDate] = useState(range.from)
  const [toDate, setToDate] = useState(range.to)

  const [summary, setSummary] = useState<Summary['week'] | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [timelineMemos, setTimelineMemos] = useState<TimelineMemo[]>([])
  const [timelineDays, setTimelineDays] = useState<TimelineDay[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [character, setCharacter] = useState<CharacterState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [blogMode, setBlogMode] = useState<ModeFilter>('all')
  const [blogTitle, setBlogTitle] = useState('週次技術ログ')
  const [blogDraft, setBlogDraft] = useState('')
  const [blogLoading, setBlogLoading] = useState(false)

  async function fetchDashboard(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const timelineParams = new URLSearchParams({
        view: timelineView,
        limit: '120',
        from: fromDate,
        to: toDate,
      })
      if (statusFilter) timelineParams.set('status', statusFilter)
      if (tagFilter) timelineParams.set('tag', tagFilter)
      if (resolvedFilter !== 'all') timelineParams.set('resolved', resolvedFilter)

      const contributionParams = new URLSearchParams({ from: fromDate, to: toDate })
      const [summaryRes, contributionRes, timelineRes, tagsRes, characterRes] = await Promise.all([
        fetch(`${apiBase}/api/stats/summary`),
        fetch(`${apiBase}/api/stats/contributions?${contributionParams.toString()}`),
        fetch(`${apiBase}/api/memo/timeline?${timelineParams.toString()}`),
        fetch(`${apiBase}/api/tags`),
        fetch(`${apiBase}/api/character`),
      ])

      if (!summaryRes.ok) throw new Error(`summary API failed: ${summaryRes.status}`)
      if (!contributionRes.ok) throw new Error(`contributions API failed: ${contributionRes.status}`)
      if (!timelineRes.ok) throw new Error(`timeline API failed: ${timelineRes.status}`)
      if (!tagsRes.ok) throw new Error(`tags API failed: ${tagsRes.status}`)
      if (!characterRes.ok) throw new Error(`character API failed: ${characterRes.status}`)

      const summaryData = (await summaryRes.json()) as Summary
      const contributionData = (await contributionRes.json()) as { contributions: Contribution[] }
      const timelineData = (await timelineRes.json()) as
        | { view: 'list'; memos: TimelineMemo[] }
        | { view: 'calendar'; days: TimelineDay[] }
      const tagsData = (await tagsRes.json()) as { tags: Tag[] }
      const characterData = (await characterRes.json()) as CharacterState

      setSummary(summaryData.week)
      setContributions(contributionData.contributions)
      setTags(tagsData.tags)
      setCharacter(characterData)
      if (timelineData.view === 'list') {
        setTimelineMemos(timelineData.memos)
        setTimelineDays([])
      } else {
        setTimelineDays(timelineData.days)
        setTimelineMemos([])
      }
    } catch (unknownError) {
      const detail = unknownError instanceof Error ? unknownError.message : String(unknownError)
      setError(detail)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDashboard()
  }, [timelineView, statusFilter, tagFilter, resolvedFilter, fromDate, toDate])

  async function toggleResolved(memo: TimelineMemo): Promise<void> {
    setError(null)
    try {
      const response = await fetch(`${apiBase}/api/memo/${memo.id}/resolve`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resolved: memo.resolved !== 1 }),
      })
      if (!response.ok) throw new Error(`resolve update failed: ${response.status}`)
      void fetchDashboard()
    } catch (unknownError) {
      const detail = unknownError instanceof Error ? unknownError.message : String(unknownError)
      setError(detail)
    }
  }

  async function openScreenshot(memoId: number): Promise<void> {
    setError(null)
    try {
      const response = await fetch(`${apiBase}/api/memo/${memoId}/screenshot-url`)
      if (!response.ok) throw new Error(`screenshot API failed: ${response.status}`)
      const data = (await response.json()) as { url: string }
      const resolvedUrl = data.url.startsWith('http') ? data.url : `${apiBase}${data.url}`
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer')
    } catch (unknownError) {
      const detail = unknownError instanceof Error ? unknownError.message : String(unknownError)
      setError(detail)
    }
  }

  async function evolve(path: string): Promise<void> {
    setError(null)
    try {
      const response = await fetch(`${apiBase}/api/character/evolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      if (!response.ok) throw new Error(`evolve failed: ${response.status}`)
      const data = (await response.json()) as CharacterState
      setCharacter(data)
    } catch (unknownError) {
      const detail = unknownError instanceof Error ? unknownError.message : String(unknownError)
      setError(detail)
    }
  }

  async function generateDraft(event: FormEvent): Promise<void> {
    event.preventDefault()
    setBlogLoading(true)
    setError(null)
    try {
      const response = await fetch(`${apiBase}/api/ai/blog-draft`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          from: fromDate,
          to: toDate,
          tag: tagFilter || undefined,
          mode: blogMode === 'all' ? undefined : blogMode,
          title: blogTitle,
        }),
      })
      if (!response.ok) throw new Error(`blog draft failed: ${response.status}`)
      const data = (await response.json()) as { draft: string }
      setBlogDraft(data.draft)
    } catch (unknownError) {
      const detail = unknownError instanceof Error ? unknownError.message : String(unknownError)
      setError(detail)
    } finally {
      setBlogLoading(false)
    }
  }

  const insightTopStuck = summary?.top_stuck?.content ?? '該当なし'

  return (
    <div className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Thought Drop</p>
          <h1>振り返りダッシュボード</h1>
        </div>
        <button type="button" onClick={() => void fetchDashboard()} disabled={loading}>
          {loading ? '更新中...' : '再読み込み'}
        </button>
      </header>

      <section className="layout">
        <aside className="sidebar">
          <article className="panel">
            <h2>Character</h2>
            {character ? (
              <div className="character">
                <p>Lv.{character.level} / {character.evolution_path}</p>
                <p>Point: {character.points}</p>
                <p>Hunger: {character.hunger_level}</p>
                <p>Mood: {character.mood}</p>
                <div className="row">
                  <button type="button" className="ghost" onClick={() => void evolve('backend')}>Backend</button>
                  <button type="button" className="ghost" onClick={() => void evolve('infrastructure')}>Infra</button>
                </div>
                <ul className="items">
                  {character.items.map((item) => (
                    <li key={item.code} className={item.unlocked ? 'ok' : 'locked'}>
                      {item.display_name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : <p>読み込み中...</p>}
          </article>

          <article className="panel">
            <h2>Tags</h2>
            <div className="tag-list">
              {tags.slice(0, 20).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag ${tagFilter === tag.name ? 'active' : ''}`}
                  onClick={() => setTagFilter(tagFilter === tag.name ? '' : tag.name)}
                >
                  #{tag.name} ({tag.usage_count})
                </button>
              ))}
            </div>
          </article>

          <article className="panel">
            <h2>Settings</h2>
            <label>
              From
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.currentTarget.value)} />
            </label>
            <label>
              To
              <input type="date" value={toDate} onChange={(event) => setToDate(event.currentTarget.value)} />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value)}>
              <option value="">Status: all</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select
              value={resolvedFilter}
              onChange={(event) => setResolvedFilter(event.currentTarget.value as ResolvedFilter)}
            >
              <option value="all">Resolve: all</option>
              <option value="true">resolved</option>
              <option value="false">open</option>
            </select>
          </article>
        </aside>

        <main className="content">
          <section className="panel">
            <h2>思考の芝生</h2>
            <div className="contrib">
              {contributions.map((cell) => (
                <div
                  key={cell.date}
                  className={`cell i${cell.intensity} ${cell.condition === 'stuck' ? 'stuck' : ''}`}
                  title={`${cell.date} | total:${cell.total} stuck:${cell.stuck} resolved:${cell.resolved}`}
                />
              ))}
            </div>
          </section>

          <section className="insight-grid">
            <article className="panel">
              <h3>今週投稿</h3>
              <p className="metric">{summary?.total ?? 0}</p>
            </article>
            <article className="panel">
              <h3>解決した課題数</h3>
              <p className="metric">{summary?.resolved ?? 0}</p>
            </article>
            <article className="panel">
              <h3>今週一番詰まったトピック</h3>
              <p>{insightTopStuck}</p>
            </article>
          </section>

          <section className="panel">
            <div className="row header-row">
              <h2>ナレッジ・タイムライン</h2>
              <div className="row">
                <button type="button" className={timelineView === 'list' ? 'active' : 'ghost'} onClick={() => setTimelineView('list')}>List</button>
                <button type="button" className={timelineView === 'calendar' ? 'active' : 'ghost'} onClick={() => setTimelineView('calendar')}>Calendar</button>
              </div>
            </div>

            {timelineView === 'list' ? (
              <div className="timeline-list">
                {timelineMemos.length === 0 ? <p>データがありません。</p> : timelineMemos.map((memo) => (
                  <article key={memo.id} className="memo-card">
                    <p className="meta">
                      #{memo.id} {formatDateTime(memo.created_at)} / {memo.status ?? '-'} / {memo.mode}
                    </p>
                    <p>{memo.content}</p>
                    <div className="row wrap">
                      {memo.tags.map((tag) => <span key={tag} className="pill">#{tag}</span>)}
                    </div>
                    <div className="row">
                      <button
                        type="button"
                        className={memo.resolved === 1 ? 'ok' : 'warn'}
                        onClick={() => void toggleResolved(memo)}
                      >
                        {memo.resolved === 1 ? 'resolved' : 'open'}
                      </button>
                      {memo.screenshot_url ? (
                        <button type="button" className="ghost" onClick={() => void openScreenshot(memo.id)}>
                          screenshot
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="calendar-list">
                {timelineDays.length === 0 ? <p>データがありません。</p> : timelineDays.map((day) => (
                  <div key={day.date} className="calendar-row">
                    <strong>{day.date}</strong>
                    <span>投稿 {day.total}</span>
                    <span>詰まり {day.stuck}</span>
                    <span>解決 {day.resolved}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <h2>AI技術ブログ下書き</h2>
            <form className="draft-form" onSubmit={(event) => void generateDraft(event)}>
              <input value={blogTitle} onChange={(event) => setBlogTitle(event.currentTarget.value)} placeholder="タイトル" />
              <select value={blogMode} onChange={(event) => setBlogMode(event.currentTarget.value as ModeFilter)}>
                <option value="all">Mode: all</option>
                <option value="stockpile">ためるモード</option>
                <option value="instant">即時モード</option>
              </select>
              <button type="submit" disabled={blogLoading}>{blogLoading ? '生成中...' : '下書き生成'}</button>
            </form>
            {blogDraft ? <pre className="draft">{blogDraft}</pre> : <p>期間を選択して生成してください。</p>}
          </section>
        </main>
      </section>

      {error ? <p className="error">エラー: {error}</p> : null}
    </div>
  )
}

export default App
