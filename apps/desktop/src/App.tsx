import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { LogicalSize, getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

type Status = "集中" | "調査中" | "詰まり" | "レビュー待ち";
const STATUSES: Status[] = ["集中", "調査中", "詰まり", "レビュー待ち"];
const TD_STORAGE_KEY = "td";
const REMINDER_CHECK_INTERVAL_MS = 30_000;
const DEFAULT_REMIND_AFTER_MIN = 1;
const DEFAULT_SNOOZE_MIN = 30;
const DEFAULT_TIMER_HOURS = 0;
const DEFAULT_TIMER_MINUTES = 5;

type TimeMode = "stopwatch" | "timer";

type TdState = {
  lastSentAtMs: number;
  remindAfterMin: number;
  snoozeUntilMs: number | null;
  memoCount: number;
};

const CHARACTER_STAGES: { threshold: number; emoji: string }[] = [
  { threshold: 30, emoji: "🐔" },
  { threshold: 10, emoji: "🐥" },
  { threshold: 5, emoji: "🐣" },
  { threshold: 0, emoji: "🥚" },
];

function getCharacterEmoji(count: number): string {
  return CHARACTER_STAGES.find((s) => count >= s.threshold)?.emoji ?? "🥚";
}

const COLLAPSED_WIDTH = 132;
const COLLAPSED_HEIGHT = 132;
const REMINDER_WIDTH = 290;
const REMINDER_HEIGHT = 132;
const OPEN_MIN_WIDTH = 460;
const OPEN_MIN_HEIGHT = 440;
const OPEN_PADDING = 10;
const ICON_SIZE = 74;
const ICON_PANEL_GAP = 12;

function loadTdState(): TdState {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(TD_STORAGE_KEY);
    if (!raw) {
      return {
        lastSentAtMs: now,
        remindAfterMin: DEFAULT_REMIND_AFTER_MIN,
        snoozeUntilMs: null,
        memoCount: 0,
      };
    }
    const parsed = JSON.parse(raw) as Partial<TdState>;
    const remindAfterMin =
      typeof parsed.remindAfterMin === "number" && parsed.remindAfterMin > 0
        ? parsed.remindAfterMin
        : DEFAULT_REMIND_AFTER_MIN;
    return {
      lastSentAtMs: typeof parsed.lastSentAtMs === "number" ? parsed.lastSentAtMs : now,
      remindAfterMin,
      snoozeUntilMs: typeof parsed.snoozeUntilMs === "number" ? parsed.snoozeUntilMs : null,
      memoCount: typeof parsed.memoCount === "number" && parsed.memoCount >= 0 ? parsed.memoCount : 0,
    };
  } catch {
    return {
      lastSentAtMs: now,
      remindAfterMin: DEFAULT_REMIND_AFTER_MIN,
      snoozeUntilMs: null,
      memoCount: 0,
    };
  }
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function parseTimerInput(value: string, max: number): number {
  const numericValue = Number(value.replace(/[^\d]/g, ""));
  if (!Number.isFinite(numericValue) || numericValue < 0) return 0;
  return Math.min(max, Math.floor(numericValue));
}

function App() {
  const apiBase = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL as string) || "http://127.0.0.1:3001",
    [],
  );
  const initialTdState = useMemo(() => loadTdState(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("集中");
  const [statusOpen, setStatusOpen] = useState(false);
  const [lastSentAtMs, setLastSentAtMs] = useState(initialTdState.lastSentAtMs);
  const [remindAfterMin, setRemindAfterMin] = useState(initialTdState.remindAfterMin);
  const [snoozeUntilMs, setSnoozeUntilMs] = useState<number | null>(initialTdState.snoozeUntilMs);
  const [memoCount, setMemoCount] = useState(initialTdState.memoCount);
  const [reminderVisible, setReminderVisible] = useState(false);
  const [user, setUser] = useState("teamK");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [clockOpen, setClockOpen] = useState(false);
  const [selectedTimeMode, setSelectedTimeMode] = useState<TimeMode>("stopwatch");
  const [activeTimeMode, setActiveTimeMode] = useState<TimeMode | null>(null);
  const [timeRunning, setTimeRunning] = useState(false);
  const [timeStartedAtMs, setTimeStartedAtMs] = useState<number | null>(null);
  const [elapsedBeforePauseMs, setElapsedBeforePauseMs] = useState(0);
  const [activeTimerDurationMs, setActiveTimerDurationMs] = useState(0);
  const [timeDisplayMs, setTimeDisplayMs] = useState(0);
  const [timerNoticeVisible, setTimerNoticeVisible] = useState(false);
  const [timerHoursInput, setTimerHoursInput] = useState(formatTwoDigits(DEFAULT_TIMER_HOURS));
  const [timerMinutesInput, setTimerMinutesInput] = useState(formatTwoDigits(DEFAULT_TIMER_MINUTES));
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const clockRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const prevEmojiRef = useRef(getCharacterEmoji(initialTdState.memoCount));
  const evolutionTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const [evolutionToast, setEvolutionToast] = useState(false);
  const [isEvolving, setIsEvolving] = useState(false);

  async function resizeWindow() {
    try {
      const appWindow = getCurrentWindow();
      if (!isOpen) {
        if (reminderVisible) {
          await appWindow.setSize(new LogicalSize(REMINDER_WIDTH, REMINDER_HEIGHT));
        } else {
          await appWindow.setSize(new LogicalSize(COLLAPSED_WIDTH, COLLAPSED_HEIGHT));
        }
        return;
      }

      const panelRect = panelRef.current?.getBoundingClientRect();
      const panelWidth = panelRect ? Math.ceil(panelRect.width) : 344;
      const panelHeight = panelRef.current ? Math.ceil(panelRef.current.scrollHeight) : 400;

      const width = Math.max(
        OPEN_MIN_WIDTH,
        panelWidth + ICON_SIZE + ICON_PANEL_GAP + OPEN_PADDING * 2,
      );
      const height = Math.max(OPEN_MIN_HEIGHT, Math.max(panelHeight, ICON_SIZE) + OPEN_PADDING * 2);

      await appWindow.setSize(new LogicalSize(width, height));
    } catch (error) {
      console.warn("window resize skipped", error);
    }
  }

  useEffect(() => {
    void resizeWindow();
  }, [isOpen, reminderVisible, statusOpen, clockOpen, message, text.length, sending]);

  useEffect(() => {
    localStorage.setItem(
      TD_STORAGE_KEY,
      JSON.stringify({
        lastSentAtMs,
        remindAfterMin,
        snoozeUntilMs,
        memoCount,
      }),
    );
  }, [lastSentAtMs, remindAfterMin, snoozeUntilMs, memoCount]);

  useEffect(() => {
    function checkReminder() {
      const now = Date.now();
      if (snoozeUntilMs && now < snoozeUntilMs) {
        setReminderVisible(false);
        return;
      }

      const remindAfterMs = remindAfterMin * 60 * 1000;
      setReminderVisible(now - lastSentAtMs >= remindAfterMs);
    }

    checkReminder();
    const intervalId = window.setInterval(checkReminder, REMINDER_CHECK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [lastSentAtMs, remindAfterMin, snoozeUntilMs]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (statusRef.current && !statusRef.current.contains(target)) {
        setStatusOpen(false);
      }
      if (clockRef.current && !clockRef.current.contains(target)) {
        setClockOpen(false);
      }
    }

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!timeRunning || !timeStartedAtMs || !activeTimeMode) return;

    const intervalId = window.setInterval(() => {
      const elapsedMs = elapsedBeforePauseMs + (Date.now() - timeStartedAtMs);
      if (activeTimeMode === "stopwatch") {
        setTimeDisplayMs(elapsedMs);
        return;
      }
      const remainingMs = Math.max(0, activeTimerDurationMs - elapsedMs);
      setTimeDisplayMs(remainingMs);
      if (remainingMs === 0) {
        setTimeRunning(false);
        setActiveTimeMode(null);
        setElapsedBeforePauseMs(0);
        setTimerNoticeVisible(true);
      }
    }, 200);

    return () => window.clearInterval(intervalId);
  }, [timeRunning, timeStartedAtMs, activeTimeMode, activeTimerDurationMs, elapsedBeforePauseMs]);

  useEffect(() => {
    const currentEmoji = getCharacterEmoji(memoCount);
    if (currentEmoji !== prevEmojiRef.current) {
      prevEmojiRef.current = currentEmoji;
      if (evolutionTimerRef.current !== null) window.clearTimeout(evolutionTimerRef.current);
      setEvolutionToast(true);
      setIsEvolving(true);
      window.setTimeout(() => setIsEvolving(false), 600);
      evolutionTimerRef.current = window.setTimeout(() => setEvolutionToast(false), 2500);
    }
  }, [memoCount]);

  const timerHours = parseTimerInput(timerHoursInput, 99);
  const timerMinutes = parseTimerInput(timerMinutesInput, 59);
  const timerDurationMs = (timerHours * 60 * 60 + timerMinutes * 60) * 1000;
  const startTimerDisabled = selectedTimeMode === "timer" && timerDurationMs <= 0;

  function startTime() {
    const now = Date.now();
    if (selectedTimeMode === "timer" && timerDurationMs <= 0) {
      setMessage("Timerは1分以上で設定してください");
      return;
    }

    setMessage(null);
    setActiveTimeMode(selectedTimeMode);
    setTimeRunning(true);
    setTimeStartedAtMs(now);
    setElapsedBeforePauseMs(0);
    setActiveTimerDurationMs(selectedTimeMode === "timer" ? timerDurationMs : 0);
    setTimeDisplayMs(selectedTimeMode === "stopwatch" ? 0 : timerDurationMs);
    setTimerNoticeVisible(false);
    setClockOpen(false);
  }

  function resetTimeTracking() {
    setTimeRunning(false);
    setActiveTimeMode(null);
    setTimeStartedAtMs(null);
    setElapsedBeforePauseMs(0);
    setActiveTimerDurationMs(0);
    setTimeDisplayMs(0);
    setClockOpen(false);
    setTimerNoticeVisible(false);
  }

  function togglePauseResume() {
    if (!activeTimeMode) return;

    if (timeRunning && timeStartedAtMs) {
      const newElapsedMs = elapsedBeforePauseMs + (Date.now() - timeStartedAtMs);
      setElapsedBeforePauseMs(newElapsedMs);
      setTimeStartedAtMs(null);
      setTimeRunning(false);
      if (activeTimeMode === "stopwatch") {
        setTimeDisplayMs(newElapsedMs);
      } else {
        setTimeDisplayMs(Math.max(0, activeTimerDurationMs - newElapsedMs));
      }
      return;
    }

    setTimeStartedAtMs(Date.now());
    setTimeRunning(true);
  }

  async function handleCharacterPointerDown(event: PointerEvent<HTMLButtonElement>) {
    pointerDown.current = { x: event.clientX, y: event.clientY };
    dragged.current = false;
  }

  async function handleCharacterPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!pointerDown.current || dragged.current) return;
    const dx = Math.abs(event.clientX - pointerDown.current.x);
    const dy = Math.abs(event.clientY - pointerDown.current.y);
    if (dx + dy < 6) return;

    dragged.current = true;
    try {
      await getCurrentWindow().startDragging();
    } catch (error) {
      console.warn("start dragging skipped", error);
    }
  }

  function handleCharacterPointerUp() {
    if (!dragged.current) {
      setIsOpen((current) => !current);
    }
    pointerDown.current = null;
    dragged.current = false;
  }

  async function sendMemo() {
    setMessage(null);
    if (!text.trim()) {
      setMessage("本文が空です");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${apiBase}/api/memo`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: text.trim(),
          status,
          user: user.trim(),
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`API failed: ${response.status} ${body}`);
      }

      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (response.status === 207) {
        setMessage("メモは保存しましたが、Slack送信に失敗しました");
      } else {
        const now = Date.now();
        setText("");
        setLastSentAtMs(now);
        setSnoozeUntilMs(null);
        setReminderVisible(false);
        setMemoCount((c) => c + 1);
        setMessage(result.message ?? "Slackに送信しました");
      }
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      setMessage(`送信失敗: ${detail}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={`app ${isOpen ? "open" : "collapsed"} ${reminderVisible && !isOpen ? "with-reminder" : ""}`}>
      <div className="avatar-area">
        <button
          className={`character${isEvolving ? " evolving" : ""}`}
          onPointerDown={handleCharacterPointerDown}
          onPointerMove={handleCharacterPointerMove}
          onPointerUp={handleCharacterPointerUp}
          type="button"
        >
          <span className="character-face">{getCharacterEmoji(memoCount)}</span>
        </button>
        {evolutionToast ? (
          <div className="evolution-toast">✨ 進化した！ {getCharacterEmoji(memoCount)}</div>
        ) : null}
        {timerNoticeVisible ? (
          <aside className="timer-bubble">
            <p>タイマー終了！</p>
            <div className="reminder-actions">
              <button onClick={() => setTimerNoticeVisible(false)} type="button">
                OK
              </button>
            </div>
          </aside>
        ) : null}
        {!timerNoticeVisible && reminderVisible && !isOpen ? (
          <aside className="reminder-bubble">
            <p>そろそろ思考をメモする？</p>
            <div className="reminder-actions">
              <button
                onClick={() => {
                  setIsOpen(true);
                  setReminderVisible(false);
                }}
                type="button"
              >
                memo
              </button>
              <button
                onClick={() => {
                  setSnoozeUntilMs(Date.now() + DEFAULT_SNOOZE_MIN * 60 * 1000);
                  setReminderVisible(false);
                }}
                type="button"
              >
                later
              </button>
              <button onClick={() => setReminderVisible(false)} type="button">
                ×
              </button>
            </div>
          </aside>
        ) : null}
      </div>

      <section className={`panel ${isOpen ? "open" : "hidden"}`} ref={panelRef}>
        <header className="panel-header">
          <div className="drag-handle" data-tauri-drag-region title="drag" />
          <p className="eyebrow">Thought Drop</p>
          <div className="title-row">
            <h1>今の思考をそのまま送る</h1>
            <div className="clock-controls" ref={clockRef}>
              <div className={`clock-pill ${activeTimeMode ? "active" : ""}`}>
                {activeTimeMode ? (
                  <button className="pause-inline" onClick={togglePauseResume} type="button">
                    <span className={`pause-symbol ${timeRunning ? "stop" : "play"}`}>
                      {timeRunning ? "⏸" : "▶"}
                    </span>
                  </button>
                ) : null}
                <div className="clock-widget">
                  <button className="clock-trigger" onClick={() => setClockOpen((current) => !current)} type="button">
                    {activeTimeMode ? (
                      <span className="clock-time">{formatElapsed(timeDisplayMs)}</span>
                    ) : (
                      <span aria-hidden className="clock-icon">
                        <span className="clock-icon-ring" />
                        <span className="clock-icon-hand hour" />
                        <span className="clock-icon-hand minute" />
                      </span>
                    )}
                  </button>
                  {clockOpen ? (
                    <div className="clock-menu">
                      <div className="clock-mode-buttons">
                        <button
                          className={selectedTimeMode === "stopwatch" ? "active" : ""}
                          onClick={() => setSelectedTimeMode("stopwatch")}
                          type="button"
                        >
                          Stopwatch
                        </button>
                        <button
                          className={selectedTimeMode === "timer" ? "active" : ""}
                          onClick={() => setSelectedTimeMode("timer")}
                          type="button"
                        >
                          Timer
                        </button>
                      </div>
                      {selectedTimeMode === "timer" ? (
                        <div className="timer-inputs">
                          <label htmlFor="timer-hours-input">
                            <input
                              id="timer-hours-input"
                              inputMode="numeric"
                              maxLength={2}
                              onBlur={() => setTimerHoursInput(formatTwoDigits(timerHours))}
                              onChange={(event) =>
                                setTimerHoursInput(event.currentTarget.value.replace(/[^\d]/g, "").slice(0, 2))
                              }
                              type="text"
                              value={timerHoursInput}
                            />
                            h
                          </label>
                          <label htmlFor="timer-minutes-input">
                            <input
                              id="timer-minutes-input"
                              inputMode="numeric"
                              maxLength={2}
                              onBlur={() => setTimerMinutesInput(formatTwoDigits(timerMinutes))}
                              onChange={(event) =>
                                setTimerMinutesInput(event.currentTarget.value.replace(/[^\d]/g, "").slice(0, 2))
                              }
                              type="text"
                              value={timerMinutesInput}
                            />
                            m
                          </label>
                        </div>
                      ) : null}
                      <button className="clock-start" disabled={startTimerDisabled} onClick={startTime} type="button">
                        Start {selectedTimeMode}
                      </button>
                      {activeTimeMode ? (
                        <button className="clock-reset" onClick={resetTimeTracking} type="button">
                          Reset
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="field">
          <label htmlFor="user-input">ユーザー</label>
          <input
            id="user-input"
            value={user}
            onChange={(event) => setUser(event.currentTarget.value)}
            placeholder="teamK"
          />
        </div>

        <div className="field">
          <span>ステータス</span>
          <div className="status-select" ref={statusRef}>
            <button
              className="status-trigger"
              onClick={() => setStatusOpen((current) => !current)}
              type="button"
            >
              <span>{status}</span>
              <span className={`caret ${statusOpen ? "open" : ""}`}>▾</span>
            </button>
            {statusOpen ? (
              <div className="status-menu">
                {STATUSES.map((item) => (
                  <button
                    key={item}
                    className={`status-option ${status === item ? "active" : ""}`}
                    onClick={() => {
                      setStatus(item);
                      setStatusOpen(false);
                    }}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="field">
          <label htmlFor="remind-min-input">リマインド間隔（分）</label>
          <input
            id="remind-min-input"
            inputMode="numeric"
            min={1}
            onChange={(event) => {
              const value = Number(event.currentTarget.value);
              if (!Number.isFinite(value) || value <= 0) return;
              setRemindAfterMin(Math.floor(value));
            }}
            type="number"
            value={remindAfterMin}
          />
        </div>

        <div className="field memo-field">
          <div className="memo-head">
            <label htmlFor="memo-input">メモ</label>
          </div>
          <textarea
            id="memo-input"
            rows={5}
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
            placeholder="いまの思考/詰まりをそのまま書く"
          />
        </div>

        <footer className="panel-footer">
          <p className="counter">{text.trim().length} chars</p>
          <button className="send" onClick={sendMemo} disabled={sending} type="button">
            {sending ? "Sending..." : "Send to Slack"}
          </button>
        </footer>

        {message ? (
          <p className={`message ${message.startsWith("送信失敗") ? "error" : "ok"}`}>{message}</p>
        ) : null}
      </section>
    </main>
  );
}

export default App;
