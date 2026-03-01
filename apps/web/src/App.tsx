import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CharacterStage } from './components/characters'
import './App.css'
import { GolemPixel } from './components/GolemPixel'

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
    () => (import.meta.env.VITE_API_BASE_URL as string) || '',
    [],
  )
  // Basic Auth gate for API
  const LS_KEY = 'td_basic_auth'
  const [authReady, setAuthReady] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authUser, setAuthUser] = useState('')
  const [authPass, setAuthPass] = useState('')

  function getAuthHeader(): string | null {
    const saved = localStorage.getItem(LS_KEY)
    return saved && saved.startsWith('Basic ') ? saved : null
  }

  function setAuthHeader(user: string, pass: string) {
    const token = btoa(`${user}:${pass}`)
    localStorage.setItem(LS_KEY, `Basic ${token}`)
  }

  async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers || {})
    const header = getAuthHeader()
    if (header) headers.set('authorization', header)
    return fetch(input, { ...init, headers })
  }

  async function checkAuth(): Promise<void> {
    setAuthChecking(true)
    setAuthError(null)
    try {
      // Check a protected endpoint using any saved credentials.
      // Do NOT rely on /health because it is intentionally public for platform health checks.
      const res = await authFetch(`${apiBase}/api/tags`)
      if (res.ok) {
        setAuthReady(true)
      } else if (res.status === 401) {
        setAuthReady(false)
      } else {
        setAuthError(`API error: ${res.status}`)
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : String(e))
    } finally {
      setAuthChecking(false)
    }
  }

  useEffect(() => { void checkAuth() }, [apiBase])
  const range = useMemo(() => defaultRange(), [])

  const [timelineView, setTimelineView] = useState<TimelineView>('list')
  const [searchQuery, setSearchQuery] = useState('')
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

  const [expandedMemos, setExpandedMemos] = useState<Set<number>>(new Set())
  const [editingTagsMemoId, setEditingTagsMemoId] = useState<number | null>(null)
  const [tagInput, setTagInput] = useState('')

  const MEMO_COLLAPSE_THRESHOLD = 80 // この文字数を超えたら折りたたむ

  function toggleMemoExpand(id: number) {
    setExpandedMemos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  // Suppress TS unused warnings for collapsed board view
  void expandedMemos; void MEMO_COLLAPSE_THRESHOLD; void toggleMemoExpand;

  const [topStuckExpanded, setTopStuckExpanded] = useState(false)

  const [blogMode, setBlogMode] = useState<ModeFilter>('all')
  const [blogTitle, setBlogTitle] = useState('週次技術ログ')
  const [blogDraft, setBlogDraft] = useState('')
  const [blogLoading, setBlogLoading] = useState(false)

  // --- Insight Chatbot ---
  type InsightMessage = { role: 'user' | 'assistant'; content: string }
  const [insightMessages, setInsightMessages] = useState<InsightMessage[]>([])
  const [insightInput, setInsightInput] = useState('')
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightError, setInsightError] = useState<string | null>(null)
  const [insightFrom, setInsightFrom] = useState(range.from)
  const [insightTo, setInsightTo] = useState(range.to)

  const fetchDashboard = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const timelineParams = new URLSearchParams({
        view: timelineView,
        limit: '120',
        from: fromDate,
        to: toDate,
      })
      if (searchQuery) timelineParams.set('q', searchQuery)
      if (statusFilter) timelineParams.set('status', statusFilter)
      if (tagFilter) timelineParams.set('tag', tagFilter)
      if (resolvedFilter !== 'all') timelineParams.set('resolved', resolvedFilter)

      const contributionParams = new URLSearchParams({ from: fromDate, to: toDate })
      const [summaryRes, contributionRes, timelineRes, tagsRes, characterRes] = await Promise.all([
        authFetch(`${apiBase}/api/stats/summary`),
        authFetch(`${apiBase}/api/stats/contributions?${contributionParams.toString()}`),
        authFetch(`${apiBase}/api/memo/timeline?${timelineParams.toString()}`),
        authFetch(`${apiBase}/api/tags`),
        authFetch(`${apiBase}/api/character`),
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
  }, [apiBase, timelineView, searchQuery, statusFilter, tagFilter, resolvedFilter, fromDate, toDate])

  useEffect(() => {
    if (authReady) {
      void fetchDashboard()
    }
  }, [fetchDashboard, authReady])

  async function toggleResolved(memo: TimelineMemo): Promise<void> {
    setError(null)
    try {
      const response = await authFetch(`${apiBase}/api/memo/${memo.id}/resolve`, {
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

  async function deleteMemo(memoId: number): Promise<void> {
    if (!window.confirm('このメモを削除しますか？')) return
    setError(null)
    try {
      const response = await fetch(`${apiBase}/api/memo/${memoId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`delete failed: ${response.status}`)
      void fetchDashboard()
    } catch (unknownError) {
      const detail = unknownError instanceof Error ? unknownError.message : String(unknownError)
      setError(detail)
    }
  }

  async function removeTag(memoId: number, currentTags: string[], tagToRemove: string): Promise<void> {
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/memo/${memoId}/tags`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tags: currentTags.filter((t) => t !== tagToRemove) }),
      })
      if (!res.ok) throw new Error(`tags update failed: ${res.status}`)
      void fetchDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function addTag(memoId: number, currentTags: string[]): Promise<void> {
    const tag = tagInput.trim().replace(/^#/, '').toLowerCase()
    if (!tag || currentTags.includes(tag)) { setTagInput(''); return }
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/memo/${memoId}/tags`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tags: [...currentTags, tag] }),
      })
      if (!res.ok) throw new Error(`tags update failed: ${res.status}`)
      setTagInput('')
      void fetchDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function openScreenshot(memoId: number): Promise<void> {
    setError(null)
    try {
      const response = await authFetch(`${apiBase}/api/memo/${memoId}/screenshot-url`)
      if (!response.ok) throw new Error(`screenshot API failed: ${response.status}`)
      const data = (await response.json()) as { url: string }
      const resolvedUrl = data.url.startsWith('http') ? data.url : `${apiBase}${data.url}`
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer')
    } catch (unknownError) {
      const detail = unknownError instanceof Error ? unknownError.message : String(unknownError)
      setError(detail)
    }
  }

  // evolve API is not used in current UI (buttons removed)

  async function generateDraft(event: FormEvent): Promise<void> {
    event.preventDefault()
    setBlogLoading(true)
    setError(null)
    try {
      const response = await authFetch(`${apiBase}/api/ai/blog-draft`, {
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

  async function sendInsight(event: FormEvent): Promise<void> {
    event.preventDefault()
    setInsightLoading(true)
    setInsightError(null)

    const question = insightInput.trim()
    const userLabel = question || `${insightFrom} 〜 ${insightTo} のインサイト分析`
    setInsightMessages((prev) => [...prev, { role: 'user', content: userLabel }])
    setInsightInput('')

    try {
      const response = await fetch(`${apiBase}/api/ai/insight/stream`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ from: insightFrom, to: insightTo, question: question || undefined }),
      })

      // Handle JSON error response (e.g. no memos)
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await response.json()
        if (data.error) {
          setInsightMessages((prev) => [...prev, { role: 'assistant', content: data.error }])
          return
        }
      }

      if (!response.ok || !response.body) throw new Error(`insight stream failed: ${response.status}`)

      setInsightMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        let idx
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const chunk = buf.slice(0, idx)
          buf = buf.slice(idx + 2)
          const lines = chunk.split('\n').map((l) => l.trim())
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            const payload = line.slice(5).trim()
            if (!payload || payload === '[DONE]') continue
            try {
              const json = JSON.parse(payload) as { delta?: string }
              if (json.delta) {
                setInsightMessages((prev) => {
                  const last = prev[prev.length - 1]
                  if (!last || last.role !== 'assistant') return prev
                  const updated = [...prev]
                  updated[updated.length - 1] = { ...last, content: last.content + json.delta }
                  return updated
                })
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (unknownError) {
      const detail = unknownError instanceof Error ? unknownError.message : String(unknownError)
      setInsightError(detail)
    } finally {
      setInsightLoading(false)
    }
  }

  const insightTopStuck = summary?.top_stuck?.content ?? '該当なし'

  return (
    <div className="page">
      {!authReady ? (
        <div className="auth-overlay">
          <div className="auth-card">
            <h3>Sign in</h3>
            {authChecking ? <p className="meta">Checking server...</p> : null}
            {authError ? <p className="error">{authError}</p> : null}
            <form onSubmit={async (e) => {
              e.preventDefault()
              setAuthError(null)
              try {
                setAuthHeader(authUser, authPass)
                const res = await authFetch(`${apiBase}/health`)
                if (!res.ok) throw new Error(`Auth failed: ${res.status}`)
                setAuthReady(true)
              } catch (err) {
                const detail = err instanceof Error ? err.message : String(err)
                setAuthError(detail)
              }
            }}>
              <input placeholder="Username" value={authUser} onChange={(e) => setAuthUser(e.currentTarget.value)} />
              <input placeholder="Password" type="password" value={authPass} onChange={(e) => setAuthPass(e.currentTarget.value)} />
              <button type="submit" disabled={authChecking || !authUser || !authPass}>Sign in</button>
            </form>
          </div>
        </div>
      ) : null}
      <header className="header">
        <div>
          <p className="eyebrow">Thought Drop</p>
          <h1>振り返りダッシュボード</h1>
        </div>
        <div className="row">
          <button type="button" className="primary" onClick={() => void fetchDashboard()} disabled={loading}>
            {loading ? '更新中...' : '🔄 再読み込み'}
          </button>
        </div>
      </header>

      <section className="layout">
        <aside className="sidebar">
          <article className="panel character-card">
            <h2>キャラクター</h2>
            {character ? (
              <div className="character">
                <div className="character-avatar-wrap">
                  <CharacterStage
                    count={character.points}
                    size={72}
                    decayLevel={character.hunger_level >= 75 ? 2 : character.hunger_level >= 40 ? 1 : 0}
                  />
                </div>
                <div className="character-info">
                  <p className="level-badge">Lv.{character.level} / {character.evolution_path}</p>
                  <p>ポイント: {character.points}</p>
                  <p>空腹度: {character.hunger_level}</p>
                  <p>気分: {character.mood}</p>
                </div>
              </div>
            ) : <p>読み込み中...</p>}
          </article>

          <article className="panel settings-card">
            <h2>設定</h2>
            <label>
              検索
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                placeholder="キーワードで絞り込み"
              />
            </label>
            <label>
              開始日
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.currentTarget.value)} />
            </label>
            <label>
              終了日
              <input type="date" value={toDate} onChange={(event) => setToDate(event.currentTarget.value)} />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value)}>
              <option value="">ステータス: すべて</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select
              value={resolvedFilter}
              onChange={(event) => setResolvedFilter(event.currentTarget.value as ResolvedFilter)}
            >
              <option value="all">解決: すべて</option>
              <option value="true">解決済み</option>
              <option value="false">未対応</option>
            </select>
          </article>

          <article className="panel">
            <h2>タグ</h2>
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
              {tags.length === 0 && <p>タグなし</p>}
            </div>
          </article>

          {/* Digest Golem status: indicates periodic AI->Slack digests */}
          <DigestGolem />
        </aside>

        <main className="content">
          <section className="panel lawn-card">
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
              <p className={topStuckExpanded ? 'stuck-text' : 'stuck-text clamped'}>{insightTopStuck}</p>
              {insightTopStuck.length > 60 ? (
                <button type="button" className="expand-toggle" onClick={() => setTopStuckExpanded(v => !v)}>
                  {topStuckExpanded ? '▲ 折りたたむ' : '▼ 続きを読む'}
                </button>
              ) : null}
            </article>
          </section>

          <section className="panel">
            <div className="row header-row">
              <h2>ナレッジ・タイムライン</h2>
              <div className="row">
                <button type="button" className={timelineView === 'list' ? 'active' : 'ghost'} onClick={() => setTimelineView('list')}>リスト</button>
                <button type="button" className={timelineView === 'calendar' ? 'active' : 'ghost'} onClick={() => setTimelineView('calendar')}>カレンダー</button>
              </div>
            </div>

            {timelineView === 'list' ? (
              (() => {
                // 分類ルール
                // - 集中: status==='集中' && resolved!==1
                // - 未解決: (status==='調査中' or '詰まり') && resolved!==1
                // - 解決済み: resolved===1 or status==='レビュー待ち'
                const focused = timelineMemos.filter((m) => m.status === '集中' && m.resolved !== 1);
                const unresolved = timelineMemos.filter((m) => (m.status === '調査中' || m.status === '詰まり') && m.resolved !== 1);
                const solved = timelineMemos.filter((m) => m.resolved === 1 || m.status === 'レビュー待ち');
                function displayStatus(m: TimelineMemo): string {
                  if (m.status === 'レビュー待ち' || m.resolved === 1) return '解決済み';
                  return m.status ?? '-';
                }
                function MemoList({ items, showResolve = true }: { items: TimelineMemo[]; showResolve?: boolean }) {
                  if (items.length === 0) return <p>データがありません。</p>;
                  return (
                    <div className="board-list">
                      {items.map((memo) => {
                        const isExpanded = expandedMemos.has(memo.id)
                        const isLong = memo.content.length > MEMO_COLLAPSE_THRESHOLD
                        return (
                        <article key={memo.id} className={`memo-card${isExpanded ? ' expanded' : ''}`}>
                          <p className="meta">
                            #{memo.id} {formatDateTime(memo.created_at)} / {displayStatus(memo)} / {memo.mode}
                          </p>
                          <p className={`memo-content${isExpanded ? '' : ' collapsed'}`}>
                            {memo.content}
                          </p>
                          {isLong ? (
                            <button type="button" className="expand-toggle" onClick={() => toggleMemoExpand(memo.id)}>
                              {isExpanded ? '▲ 折りたたむ' : '▼ 続きを読む'}
                            </button>
                          ) : null}
                          <div className="row wrap">
                            {memo.tags.map((tag) => (
                              editingTagsMemoId === memo.id ? (
                                <span key={tag} className="pill">
                                  #{tag}
                                  <button type="button" className="pill-remove" onClick={() => void removeTag(memo.id, memo.tags, tag)}>×</button>
                                </span>
                              ) : (
                                <span key={tag} className="pill">#{tag}</span>
                              )
                            ))}
                            {editingTagsMemoId === memo.id ? (
                              <input
                                type="text"
                                className="tag-input-inline"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void addTag(memo.id, memo.tags)
                                  if (e.key === 'Escape') { setEditingTagsMemoId(null); setTagInput('') }
                                }}
                                placeholder="#タグ"
                                // eslint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                              />
                            ) : (
                              <button type="button" className="tag-edit-btn" onClick={() => setEditingTagsMemoId(memo.id)}>+タグ</button>
                            )}
                          </div>
                          <div className="row">
                            {showResolve ? (
                              <button
                                type="button"
                                className={memo.resolved === 1 ? 'ok' : 'warn'}
                                onClick={() => void toggleResolved(memo)}
                              >
                                {memo.resolved === 1 ? '解決済み' : '未対応'}
                              </button>
                            ) : null}
                            {memo.screenshot_url ? (
                              <button type="button" className="ghost" onClick={() => void openScreenshot(memo.id)}>
                                スクリーンショット
                              </button>
                            ) : null}
                            <button type="button" className="danger" onClick={() => void deleteMemo(memo.id)}>
                              削除
                            </button>
                          </div>
                        </article>
                        )
                      })}
                    </div>
                  );
                }
                return (
                  <div className="timeline-board">
                    <div className="board-col">
                      <h4>集中</h4>
                      <MemoList items={focused} showResolve={false} />
                    </div>
                    <div className="board-col">
                      <h4>未解決</h4>
                      <MemoList items={unresolved} />
                    </div>
                    <div className="board-col">
                      <h4>解決済み</h4>
                      <MemoList items={solved} />
                    </div>
                  </div>
                );
              })()
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
                <option value="all">モード: すべて</option>
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

      <section className="panel insight-chat-panel">
        <h2>インサイト・チャットボット</h2>
        <p className="insight-desc">期間を選択して「フィードを生成」を押すと、メモからトレンドや示唆を生成します。</p>
        <form className="insight-form" onSubmit={(e) => void sendInsight(e)}>
          <label>
            開始
            <input type="date" value={insightFrom} onChange={(e) => setInsightFrom(e.currentTarget.value)} />
          </label>
          <label>
            終了
            <input type="date" value={insightTo} onChange={(e) => setInsightTo(e.currentTarget.value)} />
          </label>
          <input
            value={insightInput}
            onChange={(e) => setInsightInput(e.currentTarget.value)}
            placeholder="追加の質問（任意）..."
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={insightLoading}>
            {insightLoading ? '生成中...' : 'フィードを生成'}
          </button>
        </form>
        <div className="insight-messages">
          {insightMessages.length === 0 ? (
            <p className="insight-placeholder">期間を選択して分析を開始してください。メモの傾向やパターンをAIが読み解きます。</p>
          ) : insightMessages.map((m, idx) => (
            <div key={idx} className="insight-msg">
              <strong className={m.role === 'user' ? 'insight-role-user' : 'insight-role-assistant'}>
                {m.role === 'user' ? 'You' : 'Insight Bot'}
              </strong>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
            </div>
          ))}
        </div>
        {insightError ? <p className="error">インサイトエラー: {insightError}</p> : null}
      </section>
    </div>
  )
}

export default App

// ===== Digest Golem (status indicator for scheduled AI->Slack digest) =====
function DigestGolem() {
  // Compute next run window in JST (every 30 min between 10:00-17:00)
  function nextRunJst(date = new Date()): Date {
    const toJstMs = (d: Date) => d.getTime() + 9 * 60 * 60 * 1000
    const fromJstMs = (ms: number) => new Date(ms - 9 * 60 * 60 * 1000)
    const jst = new Date(toJstMs(date))
    let y = jst.getUTCFullYear()
    let m = jst.getUTCMonth()
    let d0 = jst.getUTCDate()
    let h = jst.getUTCHours()
    let min = jst.getUTCMinutes()
    // snap to next :00 or :30
    if (min < 30) {
      min = 30
    } else {
      min = 0
      h += 1
    }
    // constrain to 10:00–16:59 (17:00 excluded)
    if (h < 10) {
      h = 10; min = 0
    } else if (h >= 17) {
      // move to next day 10:00
      const tmp = new Date(Date.UTC(y, m, d0, 10, 0, 0))
      tmp.setUTCDate(tmp.getUTCDate() + 1)
      return fromJstMs(tmp.getTime())
    }
    const next = new Date(Date.UTC(y, m, d0, h, min, 0))
    return fromJstMs(next.getTime())
  }

  const now = new Date()
  const next = nextRunJst(now)
  const nextStr = next.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false })
  const actionsUrl = 'https://github.com/k-kanke/thought-drop/actions/workflows/ai-digest.yml'

  return (
    <section className="panel golem-panel" aria-label="digest golem status">
      <div className="golem-body">
        <div className="golem-icon" aria-hidden>
          <GolemPixel size={36} />
        </div>
        <div className="golem-info">
          <h3>自動サマリ配信（AIゴーレム）</h3>
          <ul>
            <li><strong>ステータス:</strong> 稼働中（JST 10:00–17:00）</li>
            <li><strong>間隔:</strong> 30分ごと（Slackへ要約を投稿）</li>
            <li><strong>次回:</strong> {nextStr}（JST）</li>
          </ul>
          <a href={actionsUrl} target="_blank" rel="noreferrer" className="golem-link">実行ログ（GitHub Actions）</a>
        </div>
      </div>
    </section>
  )
}
