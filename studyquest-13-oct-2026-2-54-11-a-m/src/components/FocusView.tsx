import React, { useEffect, useRef, useState } from 'react';
import { StudentState, StudentTask } from '../types/gamification';
import { FOCUS_SESSION_XP } from '../utils/gamification';
import { soundEngine } from '../utils/soundEngine';

interface FocusViewProps {
  studentState: StudentState;
  activeFocusTask: StudentTask | null;
  onSelectFocusTask: (task: StudentTask) => void;
  onCompleteFocusBlock: (taskId?: string) => void;
}

type FocusModeId = 'pomodoro' | 'deep' | 'free';

interface FocusModeConfig {
  id: FocusModeId;
  label: string;
  focusSeconds: number;
  breakSeconds: number;
  metaLabel: string;
}

const FOCUS_MODES: FocusModeConfig[] = [
  {
    id: 'pomodoro',
    label: 'Pomodoro 25/5m',
    focusSeconds: 25 * 60,
    breakSeconds: 5 * 60,
    metaLabel: '25m Foco / 5m Pausa',
  },
  {
    id: 'deep',
    label: 'Profundo 50/10m',
    focusSeconds: 50 * 60,
    breakSeconds: 10 * 60,
    metaLabel: '50m Foco / 10m Pausa',
  },
  {
    id: 'free',
    label: 'Sprint 5s (Demo)',
    focusSeconds: 5,
    breakSeconds: 3,
    metaLabel: 'Prueba rápida 00:00',
  },
];

const AMBIENT_SOUNDS = [
  {
    id: 'Lluvia Ligera',
    emoji: '🌧️',
    title: 'Lluvia Ligera',
    subtitle: 'Bioacústica',
  },
  {
    id: 'Café Biblioteca',
    emoji: '☕',
    title: 'Café Biblioteca',
    subtitle: 'Murmullo suave',
  },
  {
    id: 'Lo-Fi Sintetizador',
    emoji: '🎧',
    title: 'Lo-Fi Sintetizador',
    subtitle: 'Ritmo 70 BPM',
  },
  {
    id: 'Marea Blanca',
    emoji: '🌊',
    title: 'Marea Blanca',
    subtitle: 'Filtro alfa',
  },
];

export const FocusView: React.FC<FocusViewProps> = ({
  studentState,
  activeFocusTask,
  onSelectFocusTask,
  onCompleteFocusBlock,
}) => {
  const [selectedMode, setSelectedMode] = useState<FocusModeConfig>(FOCUS_MODES[0]);
  const [isBreakPhase, setIsBreakPhase] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState<number>(FOCUS_MODES[0].focusSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(FOCUS_MODES[0].focusSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hadInterruption, setHadInterruption] = useState<boolean>(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState<boolean>(false);

  // Ambient audio state
  const [activeSound, setActiveSound] = useState<string>('Lluvia Ligera');
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(65);

  const circumference = 691.15; // 2 * PI * 110
  const onCompleteRef = useRef(onCompleteFocusBlock);
  onCompleteRef.current = onCompleteFocusBlock;

  const studyTasks = studentState.tasks.filter(
    (t) => t.category === 'study' || t.category === 'academic'
  );
  const currentSubjectTask =
    activeFocusTask ||
    studyTasks.find((t) => !t.completed && t.category === 'study') ||
    studyTasks[0];

  // setInterval countdown logic
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev > 1) {
          return prev - 1;
        }
        // Reached 00:00!
        clearInterval(interval);
        setIsRunning(false);
        return 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Trigger automatic +20 XP reward when countdown reaches 00:00 in Focus phase
  const prevRemainingRef = useRef<number>(remainingSeconds);
  useEffect(() => {
    if (prevRemainingRef.current > 0 && remainingSeconds === 0) {
      if (!isBreakPhase) {
        onCompleteRef.current(currentSubjectTask?.id);
        // Automatically prepare break phase after short delay
        setTimeout(() => {
          setIsBreakPhase(true);
          setTotalSeconds(selectedMode.breakSeconds);
          setRemainingSeconds(selectedMode.breakSeconds);
        }, 1200);
      } else {
        // Finished break, switch back to focus phase
        setIsBreakPhase(false);
        setTotalSeconds(selectedMode.focusSeconds);
        setRemainingSeconds(selectedMode.focusSeconds);
      }
    }
    prevRemainingRef.current = remainingSeconds;
  }, [remainingSeconds, isBreakPhase, selectedMode, currentSubjectTask]);

  useEffect(() => {
    return () => {
      soundEngine.stopAmbient();
    };
  }, []);

  const handleModeSelect = (mode: FocusModeConfig) => {
    setIsRunning(false);
    setSelectedMode(mode);
    setIsBreakPhase(false);
    setHadInterruption(false);
    setTotalSeconds(mode.focusSeconds);
    setRemainingSeconds(mode.focusSeconds);
    prevRemainingRef.current = mode.focusSeconds;
  };

  const handlePlayPause = () => {
    if (isRunning) {
      setIsRunning(false);
      setHadInterruption(true);
    } else {
      if (remainingSeconds === 0) {
        const nextTotal = isBreakPhase ? selectedMode.breakSeconds : selectedMode.focusSeconds;
        setTotalSeconds(nextTotal);
        setRemainingSeconds(nextTotal);
        prevRemainingRef.current = nextTotal;
      }
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setHadInterruption(false);
    const target = isBreakPhase ? selectedMode.breakSeconds : selectedMode.focusSeconds;
    setTotalSeconds(target);
    setRemainingSeconds(target);
    prevRemainingRef.current = target;
  };

  const handleSkipOrComplete = () => {
    setIsRunning(false);
    if (!isBreakPhase) {
      // Simulate reaching 00:00 to award the +20 XP Focus Session immediately
      prevRemainingRef.current = 1;
      setRemainingSeconds(0);
    } else {
      setIsBreakPhase(false);
      setTotalSeconds(selectedMode.focusSeconds);
      setRemainingSeconds(selectedMode.focusSeconds);
      prevRemainingRef.current = selectedMode.focusSeconds;
    }
  };

  const handleSoundSelect = (soundId: string) => {
    if (activeSound === soundId && !isSoundMuted) {
      setIsSoundMuted(true);
      soundEngine.stopAmbient();
    } else {
      setActiveSound(soundId);
      setIsSoundMuted(false);
      soundEngine.toggleAmbientSound(soundId, volume, true);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (!isSoundMuted) {
      soundEngine.setAmbientVolume(newVol);
    }
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const fraction = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const dashOffset = circumference * (1 - fraction);

  return (
    <div className="flex flex-col w-full gap-space-lg select-none">
      {/* Subject & Session Context Banner */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-high p-space-md shadow-md border border-white/5">
        <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-primary-container/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative flex items-center justify-between gap-space-sm">
          <button
            type="button"
            onClick={() => setShowSubjectPicker((v) => !v)}
            className="flex items-center gap-space-sm min-w-0 text-left flex-1"
          >
            <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary-container/30 text-primary shrink-0">
              <span className="material-symbols-outlined text-headline-sm">
                menu_book
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-sm text-headline-sm text-on-surface truncate">
                  {currentSubjectTask?.title || 'Física II (Termodinámica)'}
                </span>
                <span className="material-symbols-outlined text-title-md text-on-surface-variant">
                  expand_more
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-wider truncate">
                {currentSubjectTask?.subtitle || 'Parcial Final en 3 Días • Alta Prioridad'}
              </span>
            </div>
          </button>
          <div className="flex flex-col items-end shrink-0">
            <span className="font-label-md text-label-md text-secondary-fixed">
              Bloque {(studentState.focusSessionsCompleted % 4) + 1} / 4
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {selectedMode.metaLabel}
            </span>
          </div>
        </div>

        {/* Dropdown Subject Selector */}
        {showSubjectPicker && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-1.5">
            <span className="font-label-sm text-label-sm text-outline uppercase">
              Seleccionar Misión de Enfoque:
            </span>
            {studyTasks.slice(0, 5).map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => {
                  onSelectFocusTask(task);
                  setShowSubjectPicker(false);
                }}
                className={`flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                  currentSubjectTask?.id === task.id
                    ? 'bg-primary-container/30 text-primary-fixed'
                    : 'bg-surface-container hover:bg-surface-container-highest text-on-surface'
                }`}
              >
                <span className="font-body-sm text-body-sm font-semibold truncate">
                  {task.title}
                </span>
                <span className="font-label-sm text-label-sm text-tertiary shrink-0 ml-2">
                  {task.completed ? 'Completada' : '+20 XP'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Study Technique Selector (Toggle Pills: Pomodoro 25/5m, Estudio Profundo 50/10m, Sprint Demo) */}
      <div className="grid grid-cols-3 gap-space-xs p-1.5 rounded-full bg-surface-container-low shadow-sm">
        {FOCUS_MODES.map((mode) => {
          const isActive = selectedMode.id === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleModeSelect(mode)}
              className={`technique-pill flex items-center justify-center py-2 px-1 rounded-full font-label-md text-label-md transition-all active:scale-95 ${
                isActive
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* Big Interactive Circular Timer Section */}
      <div className="relative flex flex-col items-center justify-center py-space-sm">
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Glow Underlay */}
          <div
            className={`absolute inset-4 rounded-full blur-xl pointer-events-none transition-colors duration-500 ${
              isBreakPhase ? 'bg-tertiary/15' : 'bg-primary-container/15'
            }`}
          ></div>

          {/* Circular SVG Progress Ring */}
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 256 256">
            <circle
              className="text-surface-container-highest"
              cx="128"
              cy="128"
              fill="transparent"
              r="110"
              stroke="currentColor"
              strokeWidth="12"
            ></circle>
            <circle
              className={`${
                isBreakPhase ? 'text-tertiary' : 'text-primary-container'
              } transition-[stroke-dashoffset] duration-500 ease-linear`}
              cx="128"
              cy="128"
              fill="transparent"
              r="110"
              stroke="currentColor"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              strokeWidth="12"
            ></circle>
          </svg>

          {/* Center Telemetry Display */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full bg-surface-container-highest/80 shadow-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRunning ? 'bg-tertiary animate-ping' : 'bg-secondary'
                }`}
              ></span>
              <span className="font-label-sm text-label-sm text-tertiary tracking-widest uppercase">
                {isBreakPhase
                  ? 'Descanso Reparador'
                  : isRunning
                  ? 'Enfoque Activo'
                  : 'Listo para Iniciar'}
              </span>
            </div>
            <span
              className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight tabular-nums"
              id="timer-display"
            >
              {formattedTime}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              {isBreakPhase
                ? 'Fase de Oxigenación'
                : hadInterruption
                ? 'Pausado Temporalmente'
                : 'Fase de Absorción'}
            </span>
          </div>
        </div>

        {/* Live XP Reward Incentive Badge */}
        <div className="mt-space-md flex items-center gap-space-xs px-3.5 py-1.5 rounded-full bg-surface-container-high shadow-sm border border-white/5">
          <span
            className="material-symbols-outlined text-title-md text-secondary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            bolt
          </span>
          <span className="font-label-sm text-label-sm text-on-surface">
            +{FOCUS_SESSION_XP} XP por Sesión de Estudio al llegar a 00:00
          </span>
          <span
            className="material-symbols-outlined text-title-md text-tertiary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            local_fire_department
          </span>
        </div>
      </div>

      {/* Timer Primary Control Action Buttons (Reset, Play/Pause, Complete/Skip) */}
      <div className="flex items-center justify-center gap-space-md px-space-md">
        <button
          type="button"
          onClick={handleReset}
          aria-label="Reiniciar ciclo"
          title="Reiniciar temporizador"
          className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface active:scale-90 transition-transform shadow-sm"
        >
          <span className="material-symbols-outlined text-headline-sm">
            replay
          </span>
        </button>

        <button
          type="button"
          onClick={handlePlayPause}
          aria-label={isRunning ? 'Pausar' : 'Iniciar'}
          className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-primary-container to-secondary-container text-on-primary shadow-xl active:scale-95 transition-transform"
        >
          <span
            className="material-symbols-outlined text-display-lg-mobile"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {isRunning ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleSkipOrComplete}
          aria-label="Completar sesión y reclamar +20 XP"
          title="Completar bloque actual (00:00) y otorgar +20 XP"
          className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-high text-on-surface-variant hover:text-tertiary active:scale-90 transition-transform shadow-sm"
        >
          <span className="material-symbols-outlined text-headline-sm">
            skip_next
          </span>
        </button>
      </div>

      {/* White Noise / Ambient Audio Section */}
      <div className="flex flex-col gap-space-sm mt-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-title-md text-primary">
              graphic_eq
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface">
              Sonidos de Inmersión
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-tertiary uppercase">
            {isSoundMuted
              ? `${activeSound} (Silenciado - Toca para activar)`
              : `${activeSound} Activa (${volume}%)`}
          </span>
        </div>

        {/* Ambience Horizontal Cards */}
        <div className="grid grid-cols-2 gap-space-sm">
          {AMBIENT_SOUNDS.map((snd) => {
            const isSelected = activeSound === snd.id;
            const isPlayingThis = isSelected && !isSoundMuted;
            return (
              <button
                key={snd.id}
                type="button"
                onClick={() => handleSoundSelect(snd.id)}
                className={`sound-card flex flex-col p-space-sm rounded-xl text-left shadow-sm active:scale-98 transition-all ${
                  isSelected
                    ? 'bg-surface-container-highest opacity-100 border border-primary/30'
                    : 'bg-surface-container-low opacity-80 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-title-md text-title-md">{snd.emoji}</span>
                  <span
                    className={`material-symbols-outlined text-title-md ${
                      isPlayingThis ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                    style={{
                      fontVariationSettings: isPlayingThis ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    {isPlayingThis ? 'volume_up' : 'volume_mute'}
                  </span>
                </div>
                <span className="font-label-md text-label-md text-on-surface truncate">
                  {snd.title}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {snd.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Volume Adjuster Bar */}
        <div className="flex items-center gap-space-sm px-space-md py-2.5 rounded-xl bg-surface-container-low shadow-sm">
          <span className="material-symbols-outlined text-body-lg text-on-surface-variant">
            volume_down
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary-container"
          />
          <span className="material-symbols-outlined text-body-lg text-on-surface-variant">
            volume_up
          </span>
        </div>
      </div>

      {/* Gamified Streak Protection Reward Card */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-high p-space-md shadow-lg border border-white/5">
        <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-tertiary-container/30 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-start gap-space-sm">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-tertiary-container/30 text-tertiary shrink-0">
            <span
              className="material-symbols-outlined text-headline-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              security
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-label-md text-label-md text-tertiary uppercase tracking-wide">
                Racha Protegida Activa
              </span>
              <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-tertiary-container text-on-tertiary-container font-bold">
                +{FOCUS_SESSION_XP} XP
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
              Completar este bloque sumará{' '}
              <span className="text-on-surface font-semibold">
                {FOCUS_SESSION_XP} XP
              </span>{' '}
              a tu meta de Nivel {studentState.level + 1} y blindará tu racha de{' '}
              {studentState.streakDays} días contra ausencias imprevistas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
