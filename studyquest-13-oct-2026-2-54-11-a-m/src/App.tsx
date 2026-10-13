import { useEffect, useMemo, useState } from 'react';
import { FocusView } from './components/FocusView';
import { HoyView } from './components/HoyView';
import { ProgresoView } from './components/ProgresoView';
import {
  fetchStudentStateFromAntigravity,
  loadLocalBackupState,
  postFocusCompletionToAntigravity,
  postNewTaskToAntigravity,
  postTaskCompletionToAntigravity,
  saveLocalBackupState,
} from './services/antigravity';
import {
  StudentState,
  StudentTask,
  TaskCategory,
  TaskSubType,
} from './types/gamification';
import {
  applyXpChange,
  BASE_TASK_XP,
  calculateTaskCompletionXp,
  FOCUS_SESSION_XP,
  formatDateYYYYMMDD,
  getRankInfo,
  getWeekDaysAroundDate,
} from './utils/gamification';
import { soundEngine } from './utils/soundEngine';

type TabRoute = 'hoy' | 'focus' | 'progreso';

interface ToastState {
  visible: boolean;
  xpAmount: number;
  isBonus: boolean;
  customLabel?: string;
  subLabel: string;
}

interface LevelUpModalState {
  visible: boolean;
  newLevel: number;
  newRankTitle: string;
  tierLabel: string;
}

export default function App() {
  // 1. Estado Global centralizado `currentDate` (YYYY-MM-DD) inicializado en el día de hoy
  const [todayDateStr] = useState<string>(() => formatDateYYYYMMDD(new Date()));
  const [currentDate, setCurrentDate] = useState<string>(() => formatDateYYYYMMDD(new Date()));

  // Navegación entre Hoy, Focus (/focus) y Progreso
  const [activeTab, setActiveTab] = useState<TabRoute>(() => {
    if (typeof window !== 'undefined') {
      if (
        window.location.pathname === '/focus' ||
        window.location.hash === '#focus'
      ) {
        return 'focus';
      }
      if (
        window.location.pathname === '/progreso' ||
        window.location.hash === '#progreso'
      ) {
        return 'progreso';
      }
    }
    return 'hoy';
  });

  // Estado del estudiante sincronizado con Antigravity
  const [studentState, setStudentState] = useState<StudentState>(() =>
    loadLocalBackupState(todayDateStr)
  );
  const [activeFocusTask, setActiveFocusTask] = useState<StudentTask | null>(null);
  const [burstTaskId, setBurstTaskId] = useState<string | null>(null);

  // Modo de evaluación matutina ('auto' evalúa new Date().getHours() < 12; permite simular mañana/tarde con un clic)
  const [morningOverride, setMorningOverride] = useState<'auto' | 'morning' | 'afternoon'>('auto');

  // Toast interactivo de XP
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    xpAmount: 15,
    isBonus: true,
    subLabel: 'Sincronizado con Antigravity Core',
  });

  // Modal interactivo de celebración Level Up
  const [levelUpModal, setLevelUpModal] = useState<LevelUpModalState>({
    visible: false,
    newLevel: 4,
    newRankTitle: 'Maestro Pomodoro',
    tierLabel: 'Academia Tier II',
  });

  const weekDays = useMemo(() => getWeekDaysAroundDate(todayDateStr), [todayDateStr]);

  // Carga inicial asíncrona: GET /student/state
  useEffect(() => {
    let mounted = true;
    fetchStudentStateFromAntigravity(todayDateStr).then(({ state }) => {
      if (mounted) {
        setStudentState(state);
      }
    });
    return () => {
      mounted = false;
    };
  }, [todayDateStr]);

  const triggerToast = (
    xpAmount: number,
    isBonus: boolean,
    customLabel?: string,
    subLabel: string = 'Sincronizado con Antigravity Core'
  ) => {
    setToast({
      visible: true,
      xpAmount,
      isBonus,
      customLabel,
      subLabel,
    });
  };

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleTabChange = (tab: TabRoute) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const targetHash = tab === 'hoy' ? '#hoy' : `#${tab}`;
      window.history.replaceState(null, '', targetHash);
    }
  };

  const handleCycleMorningOverride = () => {
    setMorningOverride((prev) => {
      if (prev === 'auto') return 'morning';
      if (prev === 'morning') return 'afternoon';
      return 'auto';
    });
  };

  /**
   * 2. Completado de Tarea con Actualización Optimista (Optimistic UI) y reconciliación con POST /tasks/{id}/complete
   */
  const handleToggleTask = async (taskId: string) => {
    const targetTask = studentState.tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const now = new Date();
    const completedAtIso = now.toISOString();
    const isNowCompleted = !targetTask.completed;

    const xpCalc = calculateTaskCompletionXp(now, morningOverride);
    const xpDelta = isNowCompleted
      ? xpCalc.xp
      : -(targetTask.earnedXp || BASE_TASK_XP);

    // Calcular progresión de nivel inmediata (Optimistic UI)
    const progression = applyXpChange(
      studentState.level,
      studentState.xp,
      xpDelta
    );

    const updatedTasks = studentState.tasks.map((t) => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        completed: isNowCompleted,
        completedAt: isNowCompleted ? completedAtIso : undefined,
        earnedXp: isNowCompleted ? xpCalc.xp : undefined,
        wasMorningBonus: isNowCompleted ? xpCalc.isBonus : undefined,
      };
    });

    const newBreakdown = { ...studentState.weeklyXpBreakdown };
    const cat = targetTask.category;
    newBreakdown[cat] = Math.max(
      0,
      newBreakdown[cat] + (isNowCompleted ? BASE_TASK_XP : -BASE_TASK_XP)
    );
    if (isNowCompleted && xpCalc.isBonus) {
      newBreakdown.morningBonus += xpCalc.xp - BASE_TASK_XP;
    }

    const optimisticState: StudentState = {
      ...studentState,
      level: progression.level,
      xp: progression.xp,
      xpToNextLevel: progression.xpToNextLevel,
      morningTasksCount:
        isNowCompleted && xpCalc.isBonus
          ? studentState.morningTasksCount + 1
          : studentState.morningTasksCount,
      tasks: updatedTasks,
      weeklyXpBreakdown: newBreakdown,
      lastSyncedAt: completedAtIso,
    };

    // Aplicar estado optimista instantáneamente (cero latencia)
    setStudentState(optimisticState);
    saveLocalBackupState(optimisticState);

    if (isNowCompleted) {
      setBurstTaskId(taskId);
      setTimeout(() => setBurstTaskId(null), 900);

      soundEngine.playXpChime(xpCalc.isBonus);
      triggerToast(
        xpCalc.xp,
        xpCalc.isBonus,
        xpCalc.isBonus ? `+${xpCalc.xp} XP ⚡ ¡Bonus Matutino!` : `+${xpCalc.xp} XP Obtenido`,
        'Sincronizando con Antigravity Core...'
      );

      if (progression.leveledUp) {
        const rankInfo = getRankInfo(progression.level);
        soundEngine.playLevelUpFanfare();
        setLevelUpModal({
          visible: true,
          newLevel: progression.level,
          newRankTitle: progression.newRankTitle,
          tierLabel: rankInfo.tier,
        });
      }
    }

    // Llamada asíncrona al backend: POST /tasks/{id}/complete
    const serverRes = await postTaskCompletionToAntigravity({
      task_id: taskId,
      completed_at: completedAtIso,
      completed: isNowCompleted,
      is_morning_bonus: xpCalc.isBonus,
    });

    // Reconciliación con la respuesta del servidor Antigravity
    if (serverRes) {
      setStudentState((prev) => ({
        ...prev,
        level: serverRes.newLevel,
        xp: serverRes.newXp,
        xpToNextLevel: serverRes.newXpToNextLevel,
        lastSyncedAt: serverRes.syncedAt,
      }));
      if (isNowCompleted) {
        setToast((prev) => ({
          ...prev,
          subLabel: 'Sincronizado con Antigravity Core ✓',
        }));
      }
    }
  };

  /**
   * Crear nueva tarea completa en Antigravity y estado local
   */
  const handleCreateTask = (taskInput: import('./types/gamification').CreateTaskInput) => {
    const newTask: StudentTask = {
      id: `task-${Date.now()}`,
      title: taskInput.title,
      subtitle:
        taskInput.subtitle ||
        (taskInput.category === 'study'
          ? `${taskInput.durationMinutes || 25} min Pomodoro programado`
          : taskInput.category === 'health'
          ? 'Hábito de bienestar estudiantil'
          : 'Misión académica registrada'),
      time: taskInput.time,
      date: taskInput.date,
      category: taskInput.category,
      subType: taskInput.subType,
      completed: false,
      priority: taskInput.priority || 'normal',
      location: taskInput.location,
      durationMinutes: taskInput.durationMinutes,
      subjectId: taskInput.subjectId,
    };

    const nextState: StudentState = {
      ...studentState,
      tasks: [...studentState.tasks, newTask],
      lastSyncedAt: new Date().toISOString(),
    };

    setStudentState(nextState);
    saveLocalBackupState(nextState);
    postNewTaskToAntigravity(newTask);

    soundEngine.playXpChime(false);
    triggerToast(
      0,
      false,
      '¡Misión Forjada con Éxito! ✨',
      `Agendada para ${taskInput.date} a las ${taskInput.time}`
    );
  };

  /**
   * 3. Recompensa automática por Finalización de Sesión Pomodoro / Focus (+20 XP)
   */
  const handleCompleteFocusBlock = async (taskId?: string) => {
    const xpDelta = FOCUS_SESSION_XP;
    const progression = applyXpChange(
      studentState.level,
      studentState.xp,
      xpDelta
    );

    const updatedTasks = studentState.tasks.map((t) => {
      if (taskId && t.id === taskId && !t.completed) {
        return {
          ...t,
          completed: true,
          completedAt: new Date().toISOString(),
          earnedXp: FOCUS_SESSION_XP,
        };
      }
      return t;
    });

    const optimisticState: StudentState = {
      ...studentState,
      level: progression.level,
      xp: progression.xp,
      xpToNextLevel: progression.xpToNextLevel,
      focusSessionsCompleted: studentState.focusSessionsCompleted + 1,
      tasks: updatedTasks,
      weeklyXpBreakdown: {
        ...studentState.weeklyXpBreakdown,
        study: studentState.weeklyXpBreakdown.study + xpDelta,
      },
      lastSyncedAt: new Date().toISOString(),
    };

    setStudentState(optimisticState);
    saveLocalBackupState(optimisticState);

    soundEngine.playXpChime(true);
    triggerToast(
      FOCUS_SESSION_XP,
      true,
      `+${FOCUS_SESSION_XP} XP por Sesión de Estudio`,
      'Bloque Focus registrado en Antigravity Core ✓'
    );

    if (progression.leveledUp) {
      const rankInfo = getRankInfo(progression.level);
      soundEngine.playLevelUpFanfare();
      setLevelUpModal({
        visible: true,
        newLevel: progression.level,
        newRankTitle: progression.newRankTitle,
        tierLabel: rankInfo.tier,
      });
    }

    const serverRes = await postFocusCompletionToAntigravity(taskId);
    if (serverRes) {
      setStudentState((prev) => ({
        ...prev,
        level: serverRes.newLevel,
        xp: serverRes.newXp,
        xpToNextLevel: serverRes.newXpToNextLevel,
        lastSyncedAt: serverRes.syncedAt,
      }));
    }
  };

  /**
   * Reclamar Cofre de Racha en la pestaña Progreso (+30 XP)
   */
  const handleClaimChest = () => {
    if (studentState.chestClaimed) return;
    const chestXp = 30;
    const progression = applyXpChange(
      studentState.level,
      studentState.xp,
      chestXp
    );

    const nextState: StudentState = {
      ...studentState,
      level: progression.level,
      xp: progression.xp,
      xpToNextLevel: progression.xpToNextLevel,
      chestClaimed: true,
    };

    setStudentState(nextState);
    saveLocalBackupState(nextState);

    soundEngine.playXpChime(true);
    triggerToast(
      chestXp,
      true,
      `+${chestXp} XP 🎁 ¡Cofre de Racha!`,
      'Recompensa semanal acreditada'
    );

    if (progression.leveledUp) {
      const rankInfo = getRankInfo(progression.level);
      soundEngine.playLevelUpFanfare();
      setLevelUpModal({
        visible: true,
        newLevel: progression.level,
        newRankTitle: progression.newRankTitle,
        tierLabel: rankInfo.tier,
      });
    }
  };

  const tabSubtitle =
    activeTab === 'hoy' ? 'HOY' : activeTab === 'focus' ? 'FOCUS' : 'PROGRESO';

  return (
    <div className="bg-surface font-body-md text-on-surface flex flex-col min-h-screen max-w-lg mx-auto relative shadow-2xl">
      {/* Top App Bar (Stitch Header - Persistente en todas las páginas con cambio dinámico de nombre de página) */}
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-xl pt-safe max-w-lg mx-auto border-b border-white/5 transition-all">
        <div className="h-16 px-margin flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-container/20 text-primary shadow-[0_0_12px_rgba(79,70,229,0.25)]">
              <span className="material-symbols-outlined text-title-md">
                swords
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
                Lumina Quest
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">
                {tabSubtitle}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-surface-container-high border border-white/5">
              <span
                className="material-symbols-outlined text-title-md text-tertiary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_fire_department
              </span>
              <span className="font-metric-streak text-label-md text-tertiary">
                {studentState.streakDays}
              </span>
            </div>
            <div className="flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-secondary-container/30 border border-secondary/20">
              <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wide">
                LVL {studentState.level}
              </span>
            </div>
            <img
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1vBiN-ufSNs4HRPkIIJEPagAkNUAR6ZnrfsEAFXof_5Mk49jNudDCM2rFQYMpWWWHuQ9LlDNj-jZV06vk37n6tgNnwT2-ZtEYC6CsdnTbAimmPygTr6FnKWFmOtCf0PsKnJtiKuP4z-3dG_iMvd_5aPbUlouAmfofr_XPsZC-pTdg8iMWF1n6B15XEdGOwFt9oYkXTer7UdpPy5H4VRo7PHVWXMhi3uXJggcmYRgXp7tcBeigvnmo"
            />
          </div>
        </div>
      </header>

      {/* Interactive Toast Notification */}
      <div
        className={`fixed top-20 left-4 right-4 max-w-md mx-auto z-50 transform transition-all duration-500 ease-out ${
          toast.visible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-24 opacity-0 pointer-events-none'
        }`}
        id="xp-toast"
      >
        <div className="bg-surface-container-high rounded-xl p-space-sm shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex items-center gap-space-sm border border-white/10">
          <div className="w-10 h-10 rounded-lg bg-tertiary-container flex items-center justify-center text-on-tertiary-container shrink-0">
            <span className="material-symbols-outlined text-title-md">
              bolt
            </span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-headline-sm text-label-md text-tertiary">
                {toast.customLabel || `+${toast.xpAmount} XP Obtenido`}
              </span>
              {toast.isBonus && (
                <span className="px-1.5 py-0.5 rounded-full bg-secondary-container/40 text-secondary font-label-sm text-label-sm">
                  Bonus 1.5x
                </span>
              )}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
              {toast.subLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
            className="p-1 text-on-surface-variant active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-title-md">
              close
            </span>
          </button>
        </div>
      </div>

      {/* Interactive Level Up Celebration Modal */}
      {levelUpModal.visible && (
        <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-surface-container-high rounded-2xl p-space-lg flex flex-col items-center text-center gap-space-md shadow-[0_0_48px_rgba(124,3,211,0.45)] border border-secondary/30 relative overflow-hidden">
            <div className="absolute -top-16 -left-16 w-40 h-40 rounded-full bg-primary-container/30 blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-16 -right-16 w-40 h-40 rounded-full bg-tertiary/25 blur-3xl pointer-events-none"></div>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-container via-secondary-container to-tertiary flex items-center justify-center text-on-primary shadow-[0_0_24px_rgba(78,222,163,0.5)]">
              <span
                className="material-symbols-outlined text-display-lg-mobile"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                workspace_premium
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-widest">
                {levelUpModal.tierLabel} • NIVEL {levelUpModal.newLevel}
              </span>
              <h3 className="font-headline-md text-headline-md text-on-surface">
                ¡Level Up! 🎉 Has ascendido a {levelUpModal.newRankTitle}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Nuevo umbral desbloqueado:{' '}
                <strong className="text-primary">
                  {levelUpModal.newLevel * 100} XP
                </strong>{' '}
                para el Nivel {levelUpModal.newLevel + 1}. ¡Sigue acumulando rachas!
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setLevelUpModal((prev) => ({ ...prev, visible: false }))
              }
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-on-primary font-label-lg text-label-lg shadow-[0_0_20px_rgba(79,70,229,0.4)] active:scale-95 transition-transform"
            >
              ¡Continuar Aventura! ⚡
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 flex flex-col relative w-full px-margin-mobile pt-16 pb-28 bg-surface">
        {activeTab === 'hoy' && (
          <HoyView
            studentState={studentState}
            currentDate={currentDate}
            onSelectDate={setCurrentDate}
            weekDays={weekDays}
            onToggleTask={handleToggleTask}
            onCreateTask={handleCreateTask}
            onNavigateFocus={(task) => {
              if (task) setActiveFocusTask(task);
              handleTabChange('focus');
            }}
            morningOverride={morningOverride}
            onCycleMorningOverride={handleCycleMorningOverride}
            burstTaskId={burstTaskId}
          />
        )}

        {activeTab === 'focus' && (
          <FocusView
            studentState={studentState}
            activeFocusTask={activeFocusTask}
            onSelectFocusTask={setActiveFocusTask}
            onCompleteFocusBlock={handleCompleteFocusBlock}
          />
        )}

        {activeTab === 'progreso' && (
          <ProgresoView
            studentState={studentState}
            onClaimChest={handleClaimChest}
            onNavigateFocus={() => handleTabChange('focus')}
          />
        )}
      </main>

      {/* Bottom Navigation Bar (Stitch Mobile Tab Shell) */}
      <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] max-w-lg mx-auto border-t border-white/5">
        <div className="flex justify-around items-center h-20 px-gutter-mobile">
          <button
            type="button"
            onClick={() => handleTabChange('hoy')}
            aria-current={activeTab === 'hoy' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-space-xs min-w-[56px] min-h-[44px] transition-colors ${
              activeTab === 'hoy'
                ? 'text-primary-fixed'
                : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-title-md">
              calendar_today
            </span>
            <span className="font-label-sm text-label-sm">Hoy</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('focus')}
            aria-current={activeTab === 'focus' ? 'page' : undefined}
            className={`relative -top-3 flex flex-col items-center justify-center min-w-[56px] min-h-[44px] group transition-transform active:scale-95 ${
              activeTab === 'focus'
                ? 'text-primary-fixed'
                : 'text-on-surface-variant'
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary-container to-secondary-container flex items-center justify-center shadow-[0_0_24px_-4px_rgba(147,51,234,0.40)] text-on-primary">
              <span className="material-symbols-outlined text-headline-md">
                timer
              </span>
            </div>
            <span className="font-label-sm text-label-sm mt-1 text-primary-fixed">
              Focus
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('progreso')}
            aria-current={activeTab === 'progreso' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-space-xs min-w-[56px] min-h-[44px] transition-colors ${
              activeTab === 'progreso'
                ? 'text-primary-fixed'
                : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-title-md">
              military_tech
            </span>
            <span className="font-label-sm text-label-sm">Progreso</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
