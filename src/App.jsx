import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, Circle, Dumbbell, ExternalLink, Flame, Moon, Droplets,
  ChevronLeft, ChevronRight, Bed, X, Pencil, RotateCcw, Settings,
} from 'lucide-react';
import { DAY_TYPES, TYPE_ORDER } from './schedule.js';
import { DEFAULT_SCHEDULE } from './config.js';
import { dateKey, isSameDay, addDays, startOfWeek } from './dateUtils.js';
import { storage } from './storage.js';
import { estimateHydrationLocal } from './hydration.js';

// Quick-add references modeled on real bottles the user actually drinks from.
const BOTTLES = [
  { oz: 16.9, label: 'bottle' },
  { oz: 25, label: 'large' },
];

// Trim trailing .0 so 16.9 + 25 reads as "41.9" and 8 + 8 reads as "16".
const fmtOz = (n) => {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

// Total oz logged on a given day's log.
const dayWaterOz = (log) => (log?.water || []).reduce((s, e) => s + (e.oz || 0), 0);

// Soft visual reference for the weekly hydration bars (no hard goal).
const WATER_FULL_OZ = 64;

// A horizontal bottle you drag to fill, snapping to 25% steps — the liquid
// level is the amount you drank, so you set it by sight with no oz math.
function BottleSlider({ oz, label, value, onChange, onAdd, disabled }) {
  const setFromX = (clientX, el) => {
    const rect = el.getBoundingClientRect();
    let f = (clientX - rect.left) / rect.width;
    f = Math.min(1, Math.max(0.25, Math.round(f / 0.25) * 0.25));
    onChange(f);
  };
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center">
        <div
          role="slider"
          aria-label={`${oz} oz ${label} — amount drunk`}
          aria-valuemin={25}
          aria-valuemax={100}
          aria-valuenow={pct}
          tabIndex={0}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setFromX(e.clientX, e.currentTarget); }}
          onPointerMove={(e) => { if (e.buttons) setFromX(e.clientX, e.currentTarget); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(1, value + 0.25)); }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(0.25, value - 0.25)); }
          }}
          className="relative flex-1 h-16 rounded-l-2xl rounded-r-md border-2 border-cyan-500/40 bg-cyan-950/30 overflow-hidden touch-none cursor-ew-resize select-none"
        >
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500/80 to-cyan-300/80"
            style={{ width: `${value * 100}%` }}
          />
          {[0.25, 0.5, 0.75].map(t => (
            <div key={t} className="absolute top-0 bottom-0 w-px bg-cyan-100/15" style={{ left: `${t * 100}%` }} />
          ))}
          <div
            className="absolute top-1.5 bottom-1.5 w-1 rounded bg-white/90 shadow"
            style={{ left: `calc(${value * 100}% - 2px)` }}
          />
          <div className="absolute inset-0 flex flex-col items-start justify-center px-2.5 pointer-events-none">
            <span className="text-[9px] font-medium uppercase tracking-wide text-cyan-50/70 leading-none whitespace-nowrap">{oz} oz {label}</span>
            <span className="text-lg font-bold text-white tabular-nums leading-tight">{fmtOz(oz * value)} oz</span>
          </div>
        </div>
        {/* bottle neck + cap */}
        <div className="w-1 h-5 bg-cyan-500/40 shrink-0" />
        <div className="w-2.5 h-8 rounded-r-md bg-cyan-400/60 shrink-0" />
      </div>
      <button
        onClick={onAdd}
        disabled={disabled}
        className="h-9 rounded-lg bg-cyan-500 text-zinc-950 text-sm font-bold active:scale-95 transition hover:brightness-110 disabled:opacity-40"
      >
        Add
      </button>
    </div>
  );
}

export default function App() {
  const [logs, setLogs] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [saveError, setSaveError] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [workoutUrl, setWorkoutUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [clearCounter, setClearCounter] = useState({ bedtime: 0, waketime: 0 });
  const [activeTab, setActiveTab] = useState('sleep');
  const [customWater, setCustomWater] = useState('');
  const [showCustomWater, setShowCustomWater] = useState(false);
  const [aiOz, setAiOz] = useState(null);
  const [aiState, setAiState] = useState('idle'); // idle | loading | error | nowater
  const [bottleFill, setBottleFill] = useState({});

  // Mirror of logs so rapid successive saves (e.g. quick water taps) chain off
  // the latest data instead of a stale render closure.
  const logsRef = useRef({});
  useEffect(() => { logsRef.current = logs; }, [logs]);

  const clearTimeField = (field) => {
    saveLog(viewDate, { [field]: '' });
    setClearCounter(c => ({ ...c, [field]: c[field] + 1 }));
  };

  useEffect(() => {
    let cancelled = false;
    const finish = (data, url, tab) => {
      if (cancelled) return;
      if (data) { setLogs(data); logsRef.current = data; }
      if (url) setWorkoutUrl(url);
      if (tab === 'sleep' || tab === 'water') setActiveTab(tab);
      setLoaded(true);
    };
    const timeout = setTimeout(() => finish(null, '', ''), 2500);
    (async () => {
      try {
        const [data, url, tab] = await Promise.all([
          storage.getLogs(),
          storage.getWorkoutUrl(),
          storage.getActiveTab(),
        ]);
        clearTimeout(timeout);
        finish(data, url, tab);
      } catch {
        clearTimeout(timeout);
        finish(null, '', '');
      }
    })();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  const saveLog = async (date, updates) => {
    const key = dateKey(date);
    const base = logsRef.current;
    const next = { ...base, [key]: { ...(base[key] || {}), ...updates } };
    logsRef.current = next; // chain rapid saves before the re-render commits
    setLogs(next);
    const ok = await storage.setLogs(next);
    setSaveError(!ok);
  };

  const selectTab = (tab) => {
    setActiveTab(tab);
    storage.setActiveTab(tab);
  };

  const fmtTime = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const addWater = (oz) => {
    if (isFuture || !(oz > 0)) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const event = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, oz, time };
    const existing = (logsRef.current[viewKey]?.water) || [];
    saveLog(viewDate, { water: [...existing, event] });
  };

  const resetCustom = () => {
    setCustomWater('');
    setShowCustomWater(false);
    setAiOz(null);
    setAiState('idle');
  };

  const addCustomWater = () => {
    const local = estimateHydrationLocal(customWater);
    const oz = local ? local.oz : aiOz;
    if (!(oz > 0)) return;
    addWater(oz);
    resetCustom();
  };

  // Falls back to the Claude-backed /api/hydration endpoint when the local
  // water-content table doesn't recognize the item.
  const requestAiEstimate = async () => {
    if (!customWater.trim()) return;
    setAiState('loading');
    setAiOz(null);
    try {
      const res = await fetch('/api/hydration', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: customWater }),
      });
      if (!res.ok) { setAiState('error'); return; }
      const data = await res.json();
      if (data.oz > 0) { setAiOz(data.oz); setAiState('idle'); }
      else setAiState('nowater');
    } catch {
      setAiState('error');
    }
  };

  const addBottle = (b) => {
    const frac = bottleFill[b.oz] ?? 1;
    addWater(b.oz * frac);
    setBottleFill(prev => ({ ...prev, [b.oz]: 1 }));
  };

  const removeWater = (id) => {
    const existing = (logsRef.current[viewKey]?.water) || [];
    saveLog(viewDate, { water: existing.filter(e => e.id !== id) });
  };

  const getDayInfo = (date) => {
    const log = logs[dateKey(date)] || {};
    const defaultKey = DEFAULT_SCHEDULE[date.getDay()];
    const overrideKey = log.dayTypeOverride;
    const typeKey = overrideKey || defaultKey;
    return {
      ...DAY_TYPES[typeKey],
      typeKey,
      defaultKey,
      isOverridden: !!overrideKey && overrideKey !== defaultKey,
    };
  };

  const today = new Date();
  const viewKey = dateKey(viewDate);
  const viewDay = getDayInfo(viewDate);
  const viewLog = logs[viewKey] || {};
  const isToday = isSameDay(viewDate, today);
  const isFuture = viewDate > today && !isToday;
  const isTomorrow = isSameDay(viewDate, addDays(today, 1));
  const sleepLabel = isFuture
    ? (isTomorrow ? "Tonight's sleep" : 'Planned sleep')
    : (isToday ? 'Sleep last night' : 'Sleep that night');

  const waterEvents = viewLog.water || [];
  const waterTotal = waterEvents.reduce((sum, e) => sum + (e.oz || 0), 0);
  const localHydration = estimateHydrationLocal(customWater);
  const customOz = localHydration ? localHydration.oz : (aiOz || 0);

  const calcStreak = () => {
    let streak = 0;
    let cursor = new Date(today);
    const todayInfo = getDayInfo(cursor);
    const todayLog = logs[dateKey(cursor)] || {};
    if (todayInfo.type === 'workout' && !todayLog.workout) {
      cursor = addDays(cursor, -1);
    }
    while (true) {
      const info = getDayInfo(cursor);
      const log = logs[dateKey(cursor)] || {};
      if (info.type === 'rest') streak++;
      else if (log.workout) streak++;
      else break;
      cursor = addDays(cursor, -1);
      if (streak > 365) break;
    }
    return streak;
  };

  const weekStats = () => {
    const start = startOfWeek(today);
    let done = 0, target = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const info = getDayInfo(d);
      const log = logs[dateKey(d)] || {};
      if (info.type === 'workout') {
        target++;
        if (log.workout) done++;
      }
    }
    return { done, target };
  };

  const monthStats = () => {
    let workouts = 0, sleepSum = 0, sleepCount = 0;
    let waterToday = 0, waterSum = 0, waterDays = 0;
    for (let i = 0; i < 30; i++) {
      const d = addDays(today, -i);
      const log = logs[dateKey(d)] || {};
      if (log.workout) workouts++;
      if (log.sleepQuality) {
        sleepSum += log.sleepQuality;
        sleepCount++;
      }
      const oz = dayWaterOz(log);
      if (i === 0) waterToday = oz;
      if (oz > 0) { waterSum += oz; waterDays++; }
    }
    return {
      workouts,
      avgSleep: sleepCount ? (sleepSum / sleepCount).toFixed(1) : '—',
      waterToday,
      waterAvg: waterDays ? Math.round(waterSum / waterDays) : 0,
    };
  };

  const launchWorkout = () => {
    if (!workoutUrl) return;
    window.open(workoutUrl, '_blank', 'noopener,noreferrer');
  };

  const openSettings = () => {
    setUrlDraft(workoutUrl);
    setShowSettings(true);
  };

  const saveWorkoutUrl = async () => {
    let url = urlDraft.trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    setWorkoutUrl(url);
    const ok = await storage.setWorkoutUrl(url);
    setSaveError(!ok);
    setShowSettings(false);
  };

  const setDayType = (typeKey) => {
    const isDefault = typeKey === viewDay.defaultKey;
    saveLog(viewDate, { dayTypeOverride: isDefault ? null : typeKey });
    setShowPicker(false);
  };

  const resetDay = () => {
    saveLog(viewDate, { dayTypeOverride: null });
    setShowPicker(false);
  };

  const week = (() => {
    const start = startOfWeek(viewDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  })();

  const streak = loaded ? calcStreak() : 0;
  const { done: weekDone, target: weekTarget } = loaded ? weekStats() : { done: 0, target: 0 };
  const { workouts: monthWorkouts, avgSleep, waterToday, waterAvg } = loaded ? monthStats() : { workouts: 0, avgSleep: '—', waterToday: 0, waterAvg: 0 };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-8">
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex justify-end mb-2 -mr-1">
          <button
            onClick={openSettings}
            aria-label="Settings"
            className="p-1.5 text-zinc-500 hover:text-zinc-200 active:scale-95 transition"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => setViewDate(addDays(viewDate, -1))}
            className="p-2 -ml-2 text-zinc-400 hover:text-zinc-100 active:scale-95 transition"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              {isToday ? 'Today' : viewDate.toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
            <div className="text-sm text-zinc-300">
              {viewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <button
            onClick={() => setViewDate(addDays(viewDate, 1))}
            className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 active:scale-95 transition"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {!isToday && (
          <button
            onClick={() => setViewDate(new Date())}
            className="block mx-auto mb-4 text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
          >
            jump to today
          </button>
        )}

        {/* Workout Card */}
        <div className="bg-zinc-900 rounded-2xl p-5 mb-4 border border-zinc-800">
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 mb-3 group active:scale-[0.98] transition"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${viewDay.accent}`} />
            <div className={`text-sm font-medium ${viewDay.text}`}>{viewDay.name}</div>
            {viewDay.isOverridden && (
              <div className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">
                modified
              </div>
            )}
            <Pencil size={11} className="text-zinc-600 group-hover:text-zinc-400 ml-0.5" />
          </button>

          {viewDay.type === 'rest' ? (
            <div className="text-center py-6">
              <Bed size={36} className="mx-auto text-slate-400 mb-2" />
              <div className="text-slate-300 font-medium">Rest day</div>
              <div className="text-xs text-zinc-500 mt-1">Recovery is when the gains happen.</div>
            </div>
          ) : (
            <>
              <button
                onClick={() => !isFuture && saveLog(viewDate, { workout: !viewLog.workout })}
                disabled={isFuture}
                className={`w-full rounded-xl py-4 px-4 flex items-center justify-between transition active:scale-[0.98] disabled:opacity-50 ${
                  viewLog.workout
                    ? 'bg-emerald-500/15 border border-emerald-500/40'
                    : 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {viewLog.workout
                    ? <CheckCircle2 size={26} className="text-emerald-400" />
                    : <Circle size={26} className="text-zinc-500" />}
                  <div className="text-left">
                    <div className="font-medium">
                      {viewLog.workout ? 'Workout done' : isFuture ? 'Upcoming' : 'Did you train?'}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {viewDay.exercises.length} exercises planned
                    </div>
                  </div>
                </div>
                <Dumbbell size={20} className="text-zinc-500" />
              </button>

              {!isFuture && (
                workoutUrl ? (
                  <button
                    onClick={launchWorkout}
                    className={`w-full mt-3 ${viewDay.accent} text-zinc-950 rounded-xl py-3 px-4 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition hover:brightness-110`}
                  >
                    <Dumbbell size={18} />
                    Start workout
                    <ExternalLink size={14} />
                  </button>
                ) : (
                  <button
                    onClick={openSettings}
                    className="w-full mt-3 bg-zinc-800 text-zinc-400 border border-dashed border-zinc-700 rounded-xl py-3 px-4 text-sm flex items-center justify-center gap-2 hover:bg-zinc-700/50 hover:text-zinc-200 active:scale-[0.98] transition"
                  >
                    <Settings size={14} />
                    Set workout link
                  </button>
                )
              )}
            </>
          )}
        </div>

        {/* Sleep + Water Card */}
        <div className="bg-zinc-900 rounded-2xl p-5 mb-4 border border-zinc-800">
          {/* Tab switcher */}
          <div className="grid grid-cols-2 gap-1 mb-4 bg-zinc-950/50 p-1 rounded-xl">
            <button
              onClick={() => selectTab('sleep')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition active:scale-[0.98] ${
                activeTab === 'sleep' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Moon size={14} className={activeTab === 'sleep' ? 'text-indigo-400' : ''} />
              Sleep
            </button>
            <button
              onClick={() => selectTab('water')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition active:scale-[0.98] ${
                activeTab === 'water' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Droplets size={14} className={activeTab === 'water' ? 'text-cyan-400' : ''} />
              Water
            </button>
          </div>

          {activeTab === 'sleep' && (
          <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Moon size={16} className="text-indigo-400" />
              <div className="text-sm font-medium text-indigo-300">{sleepLabel}</div>
            </div>
            {isFuture && viewLog.bedtime && (
              <div className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-medium">
                pre-logged
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-zinc-500">Bedtime</label>
                {viewLog.bedtime && (
                  <button
                    onClick={() => clearTimeField('bedtime')}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 active:text-zinc-200"
                  >
                    clear
                  </button>
                )}
              </div>
              <input
                key={`bedtime-${viewKey}-${clearCounter.bedtime}`}
                type="time"
                defaultValue={viewLog.bedtime || ''}
                onChange={(e) => saveLog(viewDate, { bedtime: e.target.value })}
                className="w-full min-w-0 h-12 appearance-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-zinc-500">{isFuture ? 'Planned wake' : 'Wake'}</label>
                {viewLog.waketime && (
                  <button
                    onClick={() => clearTimeField('waketime')}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 active:text-zinc-200"
                  >
                    clear
                  </button>
                )}
              </div>
              <input
                key={`waketime-${viewKey}-${clearCounter.waketime}`}
                type="time"
                defaultValue={viewLog.waketime || ''}
                onChange={(e) => saveLog(viewDate, { waketime: e.target.value })}
                className="w-full min-w-0 h-12 appearance-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {!isFuture ? (
            <div>
              <label className="text-xs text-zinc-500 mb-2 block">How rested? (tap)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => saveLog(viewDate, { sleepQuality: viewLog.sleepQuality === n ? null : n })}
                    className={`flex-1 py-3 rounded-lg font-semibold transition active:scale-95 ${
                      viewLog.sleepQuality === n
                        ? 'bg-indigo-500 text-white'
                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-zinc-600 mt-1 px-1">
                <span>wrecked</span>
                <span>great</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-500 leading-relaxed bg-zinc-800/40 rounded-lg p-3">
              💡 Rate how you slept tomorrow morning — navigate back to this date and tap a number.
            </div>
          )}

          {isToday && (
            <button
              onClick={() => setViewDate(addDays(today, 1))}
              className="mt-4 w-full text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-700 transition"
            >
              <Moon size={12} />
              Pre-log tonight's bedtime →
            </button>
          )}
          </>
          )}

          {activeTab === 'water' && (
          <>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-cyan-300">{fmtOz(waterTotal)}</span>
                <span className="text-sm text-zinc-500">oz</span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                {waterEvents.length} {waterEvents.length === 1 ? 'drink' : 'drinks'}{isToday ? ' today' : ''}
              </div>
            </div>
            <Droplets size={28} className="text-cyan-500/40" />
          </div>

          {!isFuture ? (
            <>
              <div className="text-[11px] text-zinc-500 mb-2">Drag to set how much you drank, then Add.</div>
              <div className="grid grid-cols-2 gap-2">
                {BOTTLES.map(b => (
                  <BottleSlider
                    key={b.oz}
                    oz={b.oz}
                    label={b.label}
                    value={bottleFill[b.oz] ?? 1}
                    onChange={(f) => setBottleFill(prev => ({ ...prev, [b.oz]: f }))}
                    onAdd={() => addBottle(b)}
                  />
                ))}
              </div>

              <button
                onClick={() => setShowCustomWater(s => !s)}
                className={`w-full mt-3 py-2.5 rounded-lg border text-xs font-medium active:scale-[0.98] transition ${
                  showCustomWater
                    ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                + something else
              </button>

              {showCustomWater && (
                <div className="mt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 1 cup of milk, 12oz smoothie, 500 ml"
                      value={customWater}
                      onChange={(e) => { setCustomWater(e.target.value); setAiOz(null); setAiState('idle'); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { customOz > 0 ? addCustomWater() : requestAiEstimate(); } }}
                      className="flex-1 min-w-0 h-11 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={addCustomWater}
                      disabled={!(customOz > 0)}
                      className="px-4 rounded-lg bg-cyan-500 text-zinc-950 text-sm font-semibold active:scale-95 transition disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                  <div className="text-[11px] mt-1.5 min-h-4 px-1 leading-relaxed">
                    {!customWater.trim() && (
                      <span className="text-zinc-600">Type a drink or amount — water content is estimated for you.</span>
                    )}
                    {customWater.trim() && customOz > 0 && (
                      <span className="text-cyan-300">
                        ≈ {fmtOz(customOz)} oz water
                        {localHydration?.item && (
                          <span className="text-zinc-500"> · {localHydration.item}{localHydration.assumed ? ' (1 serving)' : ''}</span>
                        )}
                        {!localHydration && aiOz != null && <span className="text-zinc-500"> · estimated by Claude</span>}
                      </span>
                    )}
                    {customWater.trim() && customOz === 0 && aiState === 'idle' && (
                      <button onClick={requestAiEstimate} className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2">
                        Estimate hydration with AI →
                      </button>
                    )}
                    {aiState === 'loading' && <span className="text-zinc-400">Estimating…</span>}
                    {aiState === 'nowater' && <span className="text-zinc-500">That doesn't look like it has water content.</span>}
                    {aiState === 'error' && <span className="text-zinc-500">Couldn't estimate — try a volume like "12 oz".</span>}
                  </div>
                </div>
              )}

              {waterEvents.length > 0 ? (
                <div className="mt-4 space-y-1">
                  {[...waterEvents].reverse().map(ev => (
                    <div key={ev.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/50">
                      <div className="flex items-center gap-2">
                        <Droplets size={13} className="text-cyan-400/70" />
                        <span className="text-sm text-zinc-200">{fmtOz(ev.oz)} oz</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">{fmtTime(ev.time)}</span>
                        <button
                          onClick={() => removeWater(ev.id)}
                          aria-label="Remove entry"
                          className="text-zinc-600 hover:text-zinc-300 active:text-zinc-100"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 text-center text-[11px] text-zinc-600 py-3">
                  Tap a bottle each time you finish one — the time is logged automatically.
                </div>
              )}
            </>
          ) : (
            <div className="text-[11px] text-zinc-500 leading-relaxed bg-zinc-800/40 rounded-lg p-3">
              💧 Log water on the day itself — navigate back to today to track hydration.
            </div>
          )}
          </>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-center">
            <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
              <Flame size={14} />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Streak</span>
            </div>
            <div className="text-xl font-bold">{streak}</div>
            <div className="text-[10px] text-zinc-500">days</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
              <Dumbbell size={14} />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Week</span>
            </div>
            <div className="text-xl font-bold">{weekDone}<span className="text-zinc-500 text-sm">/{weekTarget}</span></div>
            <div className="text-[10px] text-zinc-500">workouts</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-center">
            <div className="flex items-center justify-center gap-1 text-indigo-400 mb-1">
              <Moon size={14} />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">30d avg</span>
            </div>
            <div className="text-xl font-bold">{avgSleep}</div>
            <div className="text-[10px] text-zinc-500">sleep score</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-center">
            <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
              <Droplets size={14} />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Today</span>
            </div>
            <div className="text-xl font-bold">{waterToday || 0}</div>
            <div className="text-[10px] text-zinc-500">oz water</div>
          </div>
        </div>

        {/* Weekly grid */}
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-widest text-zinc-500">This week</div>
            <div className="text-[10px] text-zinc-600">{monthWorkouts} workouts · {waterAvg} oz/day</div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {week.map(d => {
              const info = getDayInfo(d);
              const log = logs[dateKey(d)] || {};
              const isViewed = isSameDay(d, viewDate);
              const isTodayCell = isSameDay(d, today);
              const future = d > today && !isTodayCell;
              const compliant = info.type === 'rest' || log.workout;
              return (
                <button
                  key={dateKey(d)}
                  onClick={() => setViewDate(d)}
                  className={`flex flex-col items-center py-2 rounded-lg transition relative ${
                    isViewed ? 'bg-zinc-800 ring-1 ring-zinc-600' : 'hover:bg-zinc-800/50'
                  }`}
                >
                  {info.isOverridden && (
                    <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-amber-400" />
                  )}
                  <div className="text-[10px] text-zinc-500 mb-1">
                    {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </div>
                  <div className={`text-sm font-medium mb-1.5 ${isTodayCell ? 'text-white' : 'text-zinc-400'}`}>
                    {d.getDate()}
                  </div>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold ${
                    future
                      ? 'bg-zinc-800 text-zinc-600'
                      : compliant
                      ? `${info.accent} text-zinc-950`
                      : info.type === 'workout'
                      ? 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {info.short.charAt(0)}
                  </div>
                  {log.sleepQuality && (
                    <div className="flex gap-0.5 mt-1.5">
                      {[1,2,3,4,5].map(n => (
                        <div key={n} className={`w-1 h-1 rounded-full ${
                          n <= log.sleepQuality ? 'bg-indigo-400' : 'bg-zinc-700'
                        }`} />
                      ))}
                    </div>
                  )}
                  {!future && (
                    <div className="w-6 h-1 rounded-full bg-zinc-800 overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{ width: `${Math.min(100, (dayWaterOz(log) / WATER_FULL_OZ) * 100)}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {saveError && (
          <div className="mt-4 text-xs text-amber-400 text-center">
            Save failed — your last change may not persist.
          </div>
        )}

        <div className="text-center text-[10px] text-zinc-700 mt-6">
          Built for discipline, not dopamine · Data stays on your device
        </div>
      </div>

      {/* Day Type Picker (bottom sheet) */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowPicker(false)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 rounded-t-3xl border-t border-zinc-800 p-5 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-base font-semibold">Change day type</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="p-2 -mr-2 -mt-1 text-zinc-400 hover:text-zinc-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-1.5">
              {TYPE_ORDER.map(key => {
                const t = DAY_TYPES[key];
                const isActive = viewDay.typeKey === key;
                const isDefault = key === viewDay.defaultKey;
                return (
                  <button
                    key={key}
                    onClick={() => setDayType(key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition active:scale-[0.99] ${
                      isActive ? 'border-zinc-600 bg-zinc-800' : 'border-zinc-800 hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${t.accent} shrink-0`} />
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium truncate">{t.name}</div>
                      {isDefault && (
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          Plan default for {viewDate.toLocaleDateString('en-US', { weekday: 'long' })}
                        </div>
                      )}
                    </div>
                    {isActive && <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {viewDay.isOverridden && (
              <button
                onClick={resetDay}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 text-sm text-zinc-400 hover:text-zinc-200 rounded-xl border border-zinc-800 hover:bg-zinc-800/50 transition"
              >
                <RotateCcw size={14} />
                Reset to plan default
              </button>
            )}

            <div className="h-2" />
          </div>
        </div>
      )}

      {/* Settings (bottom sheet) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 rounded-t-3xl border-t border-zinc-800 p-5 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-base font-semibold">Settings</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Workout link opens in a new tab.
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 -mr-2 -mt-1 text-zinc-400 hover:text-zinc-100"
              >
                <X size={20} />
              </button>
            </div>

            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
              Start workout link
            </label>
            <input
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveWorkoutUrl(); }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              autoFocus
            />
            <div className="text-[11px] text-zinc-500 mt-2">
              Paste any URL — a Claude chat, a YouTube playlist, your training app, etc.
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-3 text-sm text-zinc-300 rounded-xl border border-zinc-800 hover:bg-zinc-800/50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveWorkoutUrl}
                className="flex-1 py-3 text-sm font-semibold text-zinc-950 bg-zinc-100 rounded-xl hover:brightness-110 active:scale-[0.99] transition"
              >
                Save
              </button>
            </div>

            <div className="h-2" />
          </div>
        </div>
      )}
    </div>
  );
}
