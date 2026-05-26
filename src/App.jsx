import { useState, useEffect } from 'react';
import {
  CheckCircle2, Circle, Dumbbell, ExternalLink, Flame, Moon,
  ChevronLeft, ChevronRight, Bed, X, Pencil, RotateCcw, Settings,
} from 'lucide-react';
import { DAY_TYPES, TYPE_ORDER } from './schedule.js';
import { DEFAULT_SCHEDULE } from './config.js';
import { dateKey, isSameDay, addDays, startOfWeek } from './dateUtils.js';
import { storage } from './storage.js';

export default function App() {
  const [logs, setLogs] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [saveError, setSaveError] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [workoutUrl, setWorkoutUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  useEffect(() => {
    let cancelled = false;
    const finish = (data, url) => {
      if (cancelled) return;
      if (data) setLogs(data);
      if (url) setWorkoutUrl(url);
      setLoaded(true);
    };
    const timeout = setTimeout(() => finish(null, ''), 2500);
    (async () => {
      try {
        const [data, url] = await Promise.all([
          storage.getLogs(),
          storage.getWorkoutUrl(),
        ]);
        clearTimeout(timeout);
        finish(data, url);
      } catch {
        clearTimeout(timeout);
        finish(null, '');
      }
    })();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  const saveLog = async (date, updates) => {
    const key = dateKey(date);
    const next = { ...logs, [key]: { ...(logs[key] || {}), ...updates } };
    setLogs(next);
    const ok = await storage.setLogs(next);
    setSaveError(!ok);
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
    for (let i = 0; i < 30; i++) {
      const d = addDays(today, -i);
      const log = logs[dateKey(d)] || {};
      if (log.workout) workouts++;
      if (log.sleepQuality) {
        sleepSum += log.sleepQuality;
        sleepCount++;
      }
    }
    return {
      workouts,
      avgSleep: sleepCount ? (sleepSum / sleepCount).toFixed(1) : '—',
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
  const { workouts: monthWorkouts, avgSleep } = loaded ? monthStats() : { workouts: 0, avgSleep: '—' };

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

        {/* Sleep Card */}
        <div className="bg-zinc-900 rounded-2xl p-5 mb-4 border border-zinc-800">
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
              <label className="text-xs text-zinc-500 mb-1 block">Bedtime</label>
              <input
                type="time"
                value={viewLog.bedtime || ''}
                onChange={(e) => saveLog(viewDate, { bedtime: e.target.value })}
                className="w-full min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="min-w-0">
              <label className="text-xs text-zinc-500 mb-1 block">{isFuture ? 'Planned wake' : 'Wake'}</label>
              <input
                type="time"
                value={viewLog.waketime || ''}
                onChange={(e) => saveLog(viewDate, { waketime: e.target.value })}
                className="w-full min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
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
        </div>

        {/* Weekly grid */}
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-widest text-zinc-500">This week</div>
            <div className="text-[10px] text-zinc-600">{monthWorkouts} workouts / 30 days</div>
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
