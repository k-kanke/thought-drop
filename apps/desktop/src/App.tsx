import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LogicalSize, getCurrentWindow } from "@tauri-apps/api/window";
import { CharacterStage, getCharacterEmoji, getCharacterStageId } from "./components/characters";
import "./App.css";

type Status = "集中" | "調査中" | "詰まり" | "レビュー待ち";
const STATUSES: Status[] = ["集中", "調査中", "詰まり", "レビュー待ち"];
const TD_STORAGE_KEY = "td";
const REMINDER_CHECK_INTERVAL_MS = 30_000;
const DEFAULT_REMIND_AFTER_MIN = 1;
const DEFAULT_SNOOZE_MIN = 30;
const DEFAULT_TIMER_HOURS = 0;
const DEFAULT_TIMER_MINUTES = 5;
const DEFAULT_POMODORO_FOCUS_MIN = 25;
const DEFAULT_POMODORO_SHORT_BREAK_MIN = 5;
const DEFAULT_POMODORO_LONG_BREAK_MIN = 15;
const DEFAULT_POMODORO_LONG_BREAK_EVERY = 4;

type TimeMode = "stopwatch" | "timer" | "pomodoro";
type PomodoroPhase = "focus" | "shortBreak" | "longBreak";
type TimerNotice = {
  id: number;
  message: string;
};
type PanelMode = "memo" | "agent";
type AgentMessage = {
  role: "user" | "assistant";
  text: string;
};

type TdState = {
  lastSentAtMs: number;
  remindAfterMin: number;
  snoozeUntilMs: number | null;
  memoCount: number;
};


const STATUS_AURA: Record<Status, string> = {
  "集中": "status-focused",
  "調査中": "status-investigating",
  "詰まり": "status-stuck",
  "レビュー待ち": "status-review",
};

const COLLAPSED_WIDTH = 132;
const COLLAPSED_HEIGHT = 132;
const REMINDER_WIDTH = 290;
const REMINDER_HEIGHT = 132;
const NOTICE_SAFE_WIDTH = 420;
const NOTICE_SAFE_HEIGHT = 340;
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

function getPomodoroPhaseLabel(phase: PomodoroPhase): string {
  if (phase === "focus") return "Focus";
  if (phase === "shortBreak") return "Break";
  return "Long Break";
}

function getPomodoroDurationMs(
  phase: PomodoroPhase,
  config: { focusMin: number; shortBreakMin: number; longBreakMin: number },
): number {
  if (phase === "focus") return config.focusMin * 60 * 1000;
  if (phase === "shortBreak") return config.shortBreakMin * 60 * 1000;
  return config.longBreakMin * 60 * 1000;
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
  const [panelMode, setPanelMode] = useState<PanelMode>("memo");
  const [agentInput, setAgentInput] = useState("");
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [agentWithScreenshot, setAgentWithScreenshot] = useState(false);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [agentSending, setAgentSending] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [lastSentAtMs, setLastSentAtMs] = useState(initialTdState.lastSentAtMs);
  const [remindAfterMin, setRemindAfterMin] = useState(initialTdState.remindAfterMin);
  const [snoozeUntilMs, setSnoozeUntilMs] = useState<number | null>(initialTdState.snoozeUntilMs);
  const [memoCount] = useState(initialTdState.memoCount);
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
  const [timerNotice, setTimerNotice] = useState<TimerNotice | null>(null);
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase | null>(null);
  const [pomodoroCompletedFocusCount, setPomodoroCompletedFocusCount] = useState(0);
  const [timerHoursInput, setTimerHoursInput] = useState(formatTwoDigits(DEFAULT_TIMER_HOURS));
  const [timerMinutesInput, setTimerMinutesInput] = useState(formatTwoDigits(DEFAULT_TIMER_MINUTES));
  const [pomodoroFocusInput, setPomodoroFocusInput] = useState(String(DEFAULT_POMODORO_FOCUS_MIN));
  const [pomodoroShortBreakInput, setPomodoroShortBreakInput] = useState(String(DEFAULT_POMODORO_SHORT_BREAK_MIN));
  const [pomodoroLongBreakInput, setPomodoroLongBreakInput] = useState(String(DEFAULT_POMODORO_LONG_BREAK_MIN));
  const [pomodoroLongBreakEveryInput, setPomodoroLongBreakEveryInput] = useState(
    String(DEFAULT_POMODORO_LONG_BREAK_EVERY),
  );
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const clockRef = useRef<HTMLDivElement | null>(null);
  const agentPlusRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const timerBubbleRef = useRef<HTMLElement | null>(null);
  // サーバーから取得したキャラクター情報
  const [characterPoints, setCharacterPoints] = useState(0);
  const [characterHunger, setCharacterHunger] = useState(0);
  // hunger_level をもとに退化レベルを計算（ローカルタイマー不要）
  const decayLevel = characterHunger >= 75 ? 2 : characterHunger >= 40 ? 1 : 0;
  const prevStageRef = useRef(getCharacterStageId(0));
  const evolutionTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const [evolutionToast, setEvolutionToast] = useState(false);
  const [isEvolving, setIsEvolving] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [variant, setVariant] = useState<1 | 2 | 3>(1);
  const showPreviewSwitcher = import.meta.env.VITE_SHOW_PREVIEW_SWITCHER === "true";

  // キャラクター情報を定期取得（web側で進化・空腹変化した場合も反映するため）
  useEffect(() => {
    async function fetchCharacter() {
      try {
        const res = await fetch(`${apiBase}/api/character`);
        if (!res.ok) return;
        const data = (await res.json()) as { points: number; hunger_level: number };
        setCharacterPoints(data.points);
        setCharacterHunger(data.hunger_level);
      } catch {
        // 取得失敗してもアプリは続行
      }
    }
    void fetchCharacter();
    const id = window.setInterval(() => void fetchCharacter(), 30_000);
    return () => window.clearInterval(id);
  }, [apiBase]);

  async function resizeWindow() {
    try {
      const appWindow = getCurrentWindow();
      if (!isOpen) {
        if (timerNotice) {
          const bubble = timerBubbleRef.current;
          const bubbleWidth = bubble ? Math.ceil(bubble.scrollWidth) : 184;
          const bubbleHeight = bubble ? Math.ceil(bubble.scrollHeight) : 90;
          const bubbleTop = bubble ? Math.ceil(bubble.offsetTop) : 4;
          const noticeWidth = Math.max(
            REMINDER_WIDTH,
            Math.ceil(10 + ICON_SIZE + 10 + bubbleWidth + 20),
            NOTICE_SAFE_WIDTH,
          );
          const noticeHeight = Math.max(
            REMINDER_HEIGHT,
            Math.ceil(10 + Math.max(ICON_SIZE, bubbleTop + bubbleHeight) + 20),
            NOTICE_SAFE_HEIGHT,
          );

          await appWindow.setSize(new LogicalSize(noticeWidth, noticeHeight));
        } else if (reminderVisible) {
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
  }, [isOpen, reminderVisible, timerNotice, statusOpen, clockOpen, message, text.length, sending, panelMode]);

  useEffect(() => {
    if (!timerNotice || isOpen) return;
    const id = window.requestAnimationFrame(() => {
      void resizeWindow();
    });
    return () => window.cancelAnimationFrame(id);
  }, [timerNotice, isOpen]);


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
      if (agentPlusRef.current && !agentPlusRef.current.contains(target)) {
        setAgentMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const timerHours = parseTimerInput(timerHoursInput, 99);
  const timerMinutes = parseTimerInput(timerMinutesInput, 59);
  const timerDurationMs = (timerHours * 60 * 60 + timerMinutes * 60) * 1000;
  const pomodoroFocusMin = parseTimerInput(pomodoroFocusInput, 180);
  const pomodoroShortBreakMin = parseTimerInput(pomodoroShortBreakInput, 60);
  const pomodoroLongBreakMin = parseTimerInput(pomodoroLongBreakInput, 90);
  const pomodoroLongBreakEvery = parseTimerInput(pomodoroLongBreakEveryInput, 12);
  const startTimerDisabled =
    (selectedTimeMode === "timer" && timerDurationMs <= 0) ||
    (selectedTimeMode === "pomodoro" &&
      (pomodoroFocusMin <= 0 || pomodoroShortBreakMin <= 0 || pomodoroLongBreakMin <= 0 || pomodoroLongBreakEvery <= 0));

  function showTimerNotice(nextMessage: string) {
    setTimerNotice({ id: Date.now(), message: nextMessage });
  }

  async function submitAgentUiAsk() {
    const prompt = agentInput.trim();
    if (!prompt || agentSending) return;

    setAgentError(null);
    setAgentMenuOpen(false);
    setAgentMessages((current) => [...current, { role: "user", text: prompt }]);
    setAgentInput("");
    setAgentSending(true);

    let screenshotDataUrl: string | undefined;
    if (agentWithScreenshot) {
      try {
        screenshotDataUrl = await captureScreenshotDataUrl();
      } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        setAgentError(`スクリーンショット取得失敗: ${detail}`);
        setAgentSending(false);
        return;
      }
    }

    try {
      const response = await fetch(`${apiBase}/api/ai/ask-with-screenshot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          screenshotDataUrl,
          user: user.trim() || "thought-drop-user",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { answer?: string; error?: string; detail?: unknown };
      if (!response.ok) {
        const detail = data.error ?? `API failed: ${response.status}`;
        const extra = data.detail ? ` (${JSON.stringify(data.detail)})` : "";
        throw new Error(`${detail}${extra}`);
      }
      const answer = typeof data.answer === "string" && data.answer.trim()
        ? data.answer.trim()
        : "回答を取得できませんでした。";
      setAgentMessages((current) => [...current, { role: "assistant", text: answer }]);
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      setAgentError(detail);
    } finally {
      setAgentSending(false);
    }
  }

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
        if (activeTimeMode === "pomodoro") {
          const now = Date.now();
          if (pomodoroPhase === "focus") {
            const nextFocusCount = pomodoroCompletedFocusCount + 1;
            const nextBreakPhase: PomodoroPhase =
              nextFocusCount % pomodoroLongBreakEvery === 0 ? "longBreak" : "shortBreak";
            const nextDurationMs = getPomodoroDurationMs(nextBreakPhase, {
              focusMin: pomodoroFocusMin,
              shortBreakMin: pomodoroShortBreakMin,
              longBreakMin: pomodoroLongBreakMin,
            });

            setPomodoroCompletedFocusCount(nextFocusCount);
            setPomodoroPhase(nextBreakPhase);
            setTimeStartedAtMs(now);
            setElapsedBeforePauseMs(0);
            setActiveTimerDurationMs(nextDurationMs);
            setTimeDisplayMs(nextDurationMs);
            showTimerNotice("お疲れ！休憩時間だよ");
            return;
          }

          const nextDurationMs = getPomodoroDurationMs("focus", {
            focusMin: pomodoroFocusMin,
            shortBreakMin: pomodoroShortBreakMin,
            longBreakMin: pomodoroLongBreakMin,
          });
          setPomodoroPhase("focus");
          setTimeStartedAtMs(now);
          setElapsedBeforePauseMs(0);
          setActiveTimerDurationMs(nextDurationMs);
          setTimeDisplayMs(nextDurationMs);
          showTimerNotice("よし！作業だ！");
          return;
        }

        setTimeRunning(false);
        setActiveTimeMode(null);
        setElapsedBeforePauseMs(0);
        showTimerNotice("タイマー終了！");
      }
    }, 200);

    return () => window.clearInterval(intervalId);
  }, [
    timeRunning,
    timeStartedAtMs,
    activeTimeMode,
    activeTimerDurationMs,
    elapsedBeforePauseMs,
    pomodoroPhase,
    pomodoroCompletedFocusCount,
    pomodoroFocusMin,
    pomodoroShortBreakMin,
    pomodoroLongBreakMin,
    pomodoroLongBreakEvery,
  ]);

  useEffect(() => {
    const currentStage = getCharacterStageId(characterPoints);
    if (currentStage !== prevStageRef.current) {
      prevStageRef.current = currentStage;
      if (evolutionTimerRef.current !== null) window.clearTimeout(evolutionTimerRef.current);
      setEvolutionToast(true);
      setIsEvolving(true);
      window.setTimeout(() => setIsEvolving(false), 600);
      evolutionTimerRef.current = window.setTimeout(() => setEvolutionToast(false), 2500);
    }
  }, [characterPoints]);

  function startTime() {
    const now = Date.now();
    if (selectedTimeMode === "timer" && timerDurationMs <= 0) {
      setMessage("Timerは1分以上で設定してください");
      return;
    }
    if (
      selectedTimeMode === "pomodoro" &&
      (pomodoroFocusMin <= 0 || pomodoroShortBreakMin <= 0 || pomodoroLongBreakMin <= 0 || pomodoroLongBreakEvery <= 0)
    ) {
      setMessage("Pomodoroの設定値は1以上で入力してください");
      return;
    }

    setMessage(null);
    setActiveTimeMode(selectedTimeMode);
    setTimeRunning(true);
    setTimeStartedAtMs(now);
    setElapsedBeforePauseMs(0);
    setTimerNotice(null);

    if (selectedTimeMode === "pomodoro") {
      const durationMs = getPomodoroDurationMs("focus", {
        focusMin: pomodoroFocusMin,
        shortBreakMin: pomodoroShortBreakMin,
        longBreakMin: pomodoroLongBreakMin,
      });
      setPomodoroPhase("focus");
      setPomodoroCompletedFocusCount(0);
      setActiveTimerDurationMs(durationMs);
      setTimeDisplayMs(durationMs);
    } else {
      setPomodoroPhase(null);
      setPomodoroCompletedFocusCount(0);
      setActiveTimerDurationMs(selectedTimeMode === "timer" ? timerDurationMs : 0);
      setTimeDisplayMs(selectedTimeMode === "stopwatch" ? 0 : timerDurationMs);
    }

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
    setTimerNotice(null);
    setPomodoroPhase(null);
    setPomodoroCompletedFocusCount(0);
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

  async function captureScreenshotDataUrl(): Promise<string> {
    try {
      return await invoke<string>("capture_screenshot_data_url");
    } catch {
      // Fallback for browser runtime.
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("この環境ではスクリーンショット取得に対応していません");
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    try {
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) {
          resolve();
          return;
        }
        video.onloadeddata = () => resolve();
      });

      if (!video.videoWidth || !video.videoHeight) {
        throw new Error("スクリーンショットの解像度取得に失敗しました");
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("スクリーンショット描画コンテキストの作成に失敗しました");
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      stream.getTracks().forEach((track) => track.stop());
    }
  }

  async function sendMemo(withScreenshot: boolean) {
    setMessage(null);
    if (!text.trim()) {
      setMessage("本文が空です");
      return;
    }

    let screenshotDataUrl: string | undefined;
    if (withScreenshot) {
      try {
        setMessage("スクリーンショット取得中...");
        screenshotDataUrl = await captureScreenshotDataUrl();
      } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        setMessage(`スクリーンショット取得失敗: ${detail}`);
        return;
      }
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
          screenshotDataUrl,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`API failed: ${response.status} ${body}`);
      }

      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        screenshot_url?: string | null;
      };
      if (response.status === 207) {
        setMessage(result.message ?? "メモは保存しましたが、一部処理に失敗しました");
      } else {
        const now = Date.now();
        setText("");
        setLastSentAtMs(now);
        setSnoozeUntilMs(null);
        setReminderVisible(false);
        // メモ保存後にサーバーからポイント・空腹度を再取得してキャラクターを更新
        fetch(`${apiBase}/api/character`)
          .then((r) => r.ok ? r.json() : null)
          .then((data: { points: number; hunger_level: number } | null) => {
            if (data) {
              setCharacterPoints(data.points);
              setCharacterHunger(data.hunger_level);
            }
          })
          .catch(() => undefined);
        setSentSuccess(true);
        window.setTimeout(() => setSentSuccess(false), 800);
        if (withScreenshot) {
          setMessage(result.screenshot_url ? "メモとスクリーンショットを保存しました" : "メモは保存しました");
        } else {
          setMessage(result.message ?? "メモを保存しました");
        }
      }
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      setMessage(`送信失敗: ${detail}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <main
      className={`app ${isOpen ? "open" : "collapsed"} ${(reminderVisible || timerNotice) && !isOpen ? "with-reminder" : ""}`}
    >
      <div className="avatar-area">
        <button
          className={[
            "character",
            STATUS_AURA[status],
            isEvolving && "evolving",
            sentSuccess && "sent-success",
            reminderVisible && !isOpen && "reminding",
          ].filter(Boolean).join(" ")}
          onPointerDown={handleCharacterPointerDown}
          onPointerMove={handleCharacterPointerMove}
          onPointerUp={handleCharacterPointerUp}
          type="button"
        >
          <span className="character-face">
            <CharacterStage count={characterPoints} size={44} variant={variant} decayLevel={decayLevel} />
          </span>
        </button>
        {showPreviewSwitcher ? (
          <div className="preview-switcher">
            <div className="preview-row">
              {[
                { count: 0, label: "たまご" },
                { count: 5, label: "孵化" },
                { count: 10, label: "ひよこ" },
                { count: 30, label: "にわとり" },
              ].map((stage) => (
                <button
                  key={stage.count}
                  className={`preview-btn ${getCharacterStageId(characterPoints) === getCharacterStageId(stage.count) ? "active" : ""}`}
                  onClick={() => setCharacterPoints(stage.count)}
                  type="button"
                >
                  <CharacterStage count={stage.count} size={16} variant={variant} />
                  <span>{stage.label}</span>
                </button>
              ))}
            </div>
            <div className="preview-row">
              {([1, 2, 3] as const).map((v) => (
                <button
                  key={v}
                  className={`preview-btn variant-btn ${variant === v ? "active" : ""}`}
                  onClick={() => setVariant(v)}
                  type="button"
                >
                  <CharacterStage count={characterPoints} size={16} variant={v} />
                  <span>No.{v}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {evolutionToast ? (
          <div className="evolution-toast">✨ 進化した！ {getCharacterEmoji(characterPoints)}</div>
        ) : null}
        {timerNotice ? (
          <aside className="timer-bubble" key={timerNotice.id} ref={timerBubbleRef}>
            <p>{timerNotice.message}</p>
            <button className="timer-ok" onClick={() => setTimerNotice(null)} type="button">
              OK
            </button>
          </aside>
        ) : null}
        {!timerNotice && reminderVisible && !isOpen ? (
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
            <button
              className={`agent-switch ${panelMode === "agent" ? "active" : ""}`}
              onClick={() => setPanelMode((current) => (current === "memo" ? "agent" : "memo"))}
              type="button"
            >
              <span className="agent-switch-icon" aria-hidden>🤖</span>
              <span>{panelMode === "memo" ? "Agent" : "Memo"}</span>
            </button>
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
                      <span className="clock-time">
                        {activeTimeMode === "pomodoro" && pomodoroPhase
                          ? `${getPomodoroPhaseLabel(pomodoroPhase)} ${formatElapsed(timeDisplayMs)}`
                          : formatElapsed(timeDisplayMs)}
                      </span>
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
                        <button
                          className={selectedTimeMode === "pomodoro" ? "active" : ""}
                          onClick={() => setSelectedTimeMode("pomodoro")}
                          type="button"
                        >
                          Pomodoro
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
                      {selectedTimeMode === "pomodoro" ? (
                        <div className="pomodoro-meta">
                          <div className="pomodoro-inputs">
                            <label htmlFor="pomodoro-focus-input">
                              Focus
                              <input
                                id="pomodoro-focus-input"
                                inputMode="numeric"
                                maxLength={3}
                                onBlur={() => setPomodoroFocusInput(String(pomodoroFocusMin || DEFAULT_POMODORO_FOCUS_MIN))}
                                onChange={(event) =>
                                  setPomodoroFocusInput(event.currentTarget.value.replace(/[^\d]/g, "").slice(0, 3))
                                }
                                type="text"
                                value={pomodoroFocusInput}
                              />
                              m
                            </label>
                            <label htmlFor="pomodoro-short-break-input">
                              Short
                              <input
                                id="pomodoro-short-break-input"
                                inputMode="numeric"
                                maxLength={2}
                                onBlur={() =>
                                  setPomodoroShortBreakInput(String(pomodoroShortBreakMin || DEFAULT_POMODORO_SHORT_BREAK_MIN))
                                }
                                onChange={(event) =>
                                  setPomodoroShortBreakInput(event.currentTarget.value.replace(/[^\d]/g, "").slice(0, 2))
                                }
                                type="text"
                                value={pomodoroShortBreakInput}
                              />
                              m
                            </label>
                            <label htmlFor="pomodoro-long-break-input">
                              Long
                              <input
                                id="pomodoro-long-break-input"
                                inputMode="numeric"
                                maxLength={2}
                                onBlur={() =>
                                  setPomodoroLongBreakInput(String(pomodoroLongBreakMin || DEFAULT_POMODORO_LONG_BREAK_MIN))
                                }
                                onChange={(event) =>
                                  setPomodoroLongBreakInput(event.currentTarget.value.replace(/[^\d]/g, "").slice(0, 2))
                                }
                                type="text"
                                value={pomodoroLongBreakInput}
                              />
                              m
                            </label>
                            <label htmlFor="pomodoro-long-break-every-input">
                              Every
                              <input
                                id="pomodoro-long-break-every-input"
                                inputMode="numeric"
                                maxLength={2}
                                onBlur={() =>
                                  setPomodoroLongBreakEveryInput(String(pomodoroLongBreakEvery || DEFAULT_POMODORO_LONG_BREAK_EVERY))
                                }
                                onChange={(event) =>
                                  setPomodoroLongBreakEveryInput(event.currentTarget.value.replace(/[^\d]/g, "").slice(0, 2))
                                }
                                type="text"
                                value={pomodoroLongBreakEveryInput}
                              />
                              focus
                            </label>
                          </div>
                          <p>Completed Focus: {pomodoroCompletedFocusCount}</p>
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

        {panelMode === "memo" ? (
          <>
            <div className="field">
              <label htmlFor="user-input">Name</label>
              <input
                id="user-input"
                value={user}
                onChange={(event) => setUser(event.currentTarget.value)}
                placeholder="teamK"
              />
            </div>

            <div className="field">
              <span>Status</span>
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
              <label htmlFor="remind-min-input">Reminder Interval (min)</label>
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
                <label htmlFor="memo-input">Memo</label>
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
              <button className="send secondary" onClick={() => void sendMemo(false)} disabled={sending} type="button">
                {sending ? "Saving..." : "Save Memo"}
              </button>
              <button className="send" onClick={() => void sendMemo(true)} disabled={sending} type="button">
                {sending ? "Saving..." : "Save with Screenshot"}
              </button>
            </footer>

            {message ? (
              <p className={`message ${message.startsWith("送信失敗") ? "error" : "ok"}`}>{message}</p>
            ) : null}
          </>
        ) : (
          <section className="agent-screen" aria-label="agent mode blank screen">
            <div className="agent-canvas">
              {agentMessages.length === 0 ? (
                <p className="agent-ui-note">下の入力欄から質問してください。</p>
              ) : (
                <div className="agent-messages">
                  {agentMessages.map((item, index) => (
                    <div key={`${item.role}-${index}`} className={`agent-message ${item.role}`}>
                      {item.text}
                    </div>
                  ))}
                </div>
              )}
              {agentError ? <p className="agent-error">{agentError}</p> : null}
            </div>
            <div className="agent-composer">
              <div className="agent-plus-wrap" ref={agentPlusRef}>
                <button
                  className="agent-plus"
                  onClick={() => setAgentMenuOpen((current) => !current)}
                  type="button"
                >
                  +
                </button>
                {agentMenuOpen ? (
                  <div className="agent-plus-menu">
                    <button
                      onClick={() => {
                        setAgentWithScreenshot(false);
                        setAgentMenuOpen(false);
                      }}
                      type="button"
                    >
                      Ask only
                    </button>
                    <button
                      onClick={() => {
                        setAgentWithScreenshot(true);
                        setAgentMenuOpen(false);
                      }}
                      type="button"
                    >
                      Ask with Screenshot
                    </button>
                  </div>
                ) : null}
              </div>
              <input
                className="agent-input"
                onChange={(event) => setAgentInput(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void submitAgentUiAsk();
                  }
                }}
                placeholder={agentWithScreenshot ? "スクショ付きで質問..." : "質問する..."}
                value={agentInput}
              />
              <button
                className="agent-ask"
                disabled={!agentInput.trim() || agentSending}
                onClick={() => void submitAgentUiAsk()}
                type="button"
              >
                {agentSending ? "Asking..." : agentWithScreenshot ? "Ask + Shot" : "Ask"}
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
