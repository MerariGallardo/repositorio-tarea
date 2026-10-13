import React, { useState } from 'react';
import {
  CreateTaskInput,
  DayScheduleMeta,
  StudentState,
  StudentTask,
  TaskCategory,
} from '../types/gamification';
import {
  BASE_TASK_XP,
  calculateTaskCompletionXp,
  getRankInfo,
  getXpRequiredForNextLevel,
} from '../utils/gamification';
import { CreateTaskModal } from './CreateTaskModal';

interface HoyViewProps {
  studentState: StudentState;
  currentDate: string;
  onSelectDate: (date: string) => void;
  weekDays: DayScheduleMeta[];
  onToggleTask: (taskId: string) => void;
  onCreateTask: (taskInput: CreateTaskInput) => void;
  onNavigateFocus: (task?: StudentTask) => void;
  morningOverride: 'auto' | 'morning' | 'afternoon';
  onCycleMorningOverride: () => void;
  burstTaskId: string | null;
}

type FilterMode = 'all' | 'academic' | 'study' | 'health';

export const HoyView: React.FC<HoyViewProps> = ({
  studentState,
  currentDate,
  onSelectDate,
  weekDays,
  onToggleTask,
  onCreateTask,
  onNavigateFocus,
  morningOverride,
  onCycleMorningOverride,
  burstTaskId,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const currentRank = getRankInfo(studentState.level);
  const nextRank = getRankInfo(studentState.level + 1);
  const xpThreshold = getXpRequiredForNextLevel(studentState.level);
  const xpPercentage = Math.min(100, Math.round((studentState.xp / xpThreshold) * 100));
  const xpRemaining = Math.max(0, xpThreshold - studentState.xp);

  const xpEval = calculateTaskCompletionXp(new Date(), morningOverride);

  // Tareas correspondientes únicamente a la fecha seleccionada (currentDate)
  const tasksForSelectedDate = studentState.tasks.filter((t) => t.date === currentDate);
  const completedForDateCount = tasksForSelectedDate.filter((t) => t.completed).length;

  // Filtrado por categoría
  const filteredTasks = tasksForSelectedDate.filter((t) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'academic') return t.category === 'academic';
    if (activeFilter === 'study') return t.category === 'study';
    if (activeFilter === 'health') return t.category === 'health';
    return true;
  });

  const selectedDayMeta =
    weekDays.find((d) => d.date === currentDate) ||
    weekDays[0];

  const pendingStudyCount = tasksForSelectedDate.filter(
    (t) => !t.completed && t.category === 'study'
  ).length;
  const pendingAcademicCount = tasksForSelectedDate.filter(
    (t) => !t.completed && t.category === 'academic'
  ).length;
  const hasExamToday = tasksForSelectedDate.some((t) => t.priority === 'exam');

  const handleModalSubmit = (input: CreateTaskInput) => {
    onCreateTask(input);
    if (input.date !== currentDate) {
      onSelectDate(input.date);
    }
  };

  return (
    <div className="flex flex-col w-full relative">
      {/* Gamification Status Hero */}
      <section className="flex flex-col gap-space-sm mb-space-lg">
        {/* Rank and Level Stats Tile */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-md relative overflow-hidden border border-white/5">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary-container/10 blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between gap-space-sm mb-space-sm">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm">
                  NIVEL {studentState.level}
                </span>
                <span className="font-label-sm text-label-sm text-secondary tracking-wider uppercase">
                  {currentRank.tier}
                </span>
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface truncate">
                {currentRank.title}
              </h2>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-baseline gap-1">
                <span className="font-headline-lg text-headline-lg text-primary transition-all duration-300">
                  {studentState.xp}
                </span>
                <span className="font-label-sm text-label-sm text-outline">
                  / {xpThreshold} XP
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-tertiary font-bold tracking-tight">
                {xpPercentage}% Completado
              </span>
            </div>
          </div>

          {/* XP Bar with smooth CSS animation */}
          <div className="w-full h-3 rounded-full bg-surface-container-highest overflow-hidden p-0.5 relative mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-container via-secondary-container to-tertiary transition-all duration-700 ease-out shadow-[0_0_12px_rgba(79,70,229,0.5)] relative overflow-hidden"
              style={{ width: `${xpPercentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer"></div>
            </div>
          </div>

          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-body-sm text-body-sm flex items-center gap-1 truncate">
              <span
                className="material-symbols-outlined text-title-md text-tertiary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                stars
              </span>
              +{xpEval.xp} XP por misión → Nivel {studentState.level + 1}: {nextRank.title}
            </span>
            <span className="font-label-sm text-label-sm text-outline font-semibold shrink-0 ml-2">
              Faltan {xpRemaining} XP
            </span>
          </div>
        </div>

        {/* Streak & Multiplier Status Grid */}
        <div className="grid grid-cols-2 gap-gutter-mobile">
          {/* Streak Protection Card */}
          <div className="rounded-xl bg-surface-container p-space-sm flex flex-col justify-between shadow-sm border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Racha de Fuego
              </span>
              <span
                className="material-symbols-outlined text-title-md text-tertiary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_fire_department
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-0.5">
              <span className="font-metric-streak text-metric-streak text-on-surface">
                {studentState.streakDays}
              </span>
              <span className="font-label-md text-label-md text-tertiary font-bold">
                DÍAS
              </span>
            </div>
            <div className="flex items-center gap-1 pt-1.5 mt-1 bg-surface-container-high/40 rounded-lg px-2 py-1">
              <span className="material-symbols-outlined text-body-sm text-tertiary">
                shield
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                Salud + Estudio Protegidos
              </span>
            </div>
          </div>

          {/* Bonus Pill Tile (Interactive toggle to test < 12:00 PM Morning Multiplier at any hour) */}
          <button
            type="button"
            onClick={onCycleMorningOverride}
            title="Haz clic para alternar simulación de horario (< 12:00 PM Bonus 1.5x vs Tarde 1.0x)"
            className={`rounded-xl p-space-sm flex flex-col justify-between shadow-sm text-left transition-all active:scale-95 border ${
              xpEval.isBonus
                ? 'bg-secondary-container/25 border-secondary/30 shadow-[0_0_16px_rgba(124,3,211,0.2)]'
                : 'bg-surface-container border-white/5'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="font-label-sm text-label-sm text-secondary font-bold uppercase">
                Multiplicador
              </span>
              <span
                className="material-symbols-outlined text-title-md text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                bolt
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-0.5">
              <span className="font-metric-streak text-metric-streak text-secondary">
                {xpEval.isBonus ? '1.5x' : '1.0x'}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {xpEval.isBonus ? 'XP Activo (15 XP)' : 'XP Base (10 XP)'}
              </span>
            </div>
            <div className="flex items-center justify-between w-full gap-1 pt-1.5 mt-1 bg-secondary-container/30 rounded-lg px-2 py-1">
              <div className="flex items-center gap-1 min-w-0">
                <span className="material-symbols-outlined text-body-sm text-secondary">
                  schedule
                </span>
                <span className="font-label-sm text-label-sm text-secondary truncate">
                  {xpEval.isBonus ? 'Hasta las 12:00 PM' : 'Horario Tarde (>12 PM)'}
                </span>
              </div>
              {morningOverride !== 'auto' && (
                <span className="px-1 rounded bg-primary-container text-on-primary text-[9px] font-bold shrink-0">
                  SIM
                </span>
              )}
            </div>
          </button>
        </div>
      </section>

      {/* Interactive Weekly Mini-Calendar */}
      <section className="flex flex-col gap-space-xs mb-space-lg">
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-title-md text-primary">
              calendar_month
            </span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              {selectedDayMeta?.monthName || 'Octubre 2026'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm text-primary px-2 py-0.5 rounded-full bg-primary-container/20">
              Semana 42
            </span>
          </div>
        </div>

        {/* Horizontal Scroll Days */}
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 -mx-margin-mobile px-margin-mobile scroll-smooth no-scrollbar">
          {weekDays.map((day) => {
            const isSelected = day.date === currentDate;
            const dayTasks = studentState.tasks.filter((t) => t.date === day.date);
            const hasExamOnDay = day.hasExam || dayTasks.some((t) => t.priority === 'exam');

            // Indicador visual según carga académica:
            // Rojo para días con exámenes, Violeta para carga media, Verde para carga ligera
            let dotClasses = 'bg-tertiary shadow-[0_0_6px_#4edea3]';
            if (hasExamOnDay || day.workload === 'heavy') {
              dotClasses = 'bg-error shadow-[0_0_6px_#ffb4ab]';
            } else if (day.workload === 'medium' || dayTasks.length >= 4) {
              dotClasses = 'bg-secondary shadow-[0_0_6px_#ddb8ff]';
            }

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => onSelectDate(day.date)}
                data-date={day.date}
                className={`flex flex-col items-center justify-between min-w-[58px] h-20 rounded-xl p-2 shrink-0 transition-all ${
                  isSelected
                    ? 'bg-primary-container text-on-primary-container shadow-[0_0_16px_rgba(79,70,229,0.35)] scale-105'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container active:scale-95'
                }`}
              >
                <span
                  className={`font-label-sm text-label-sm tracking-wider ${
                    isSelected ? 'font-bold' : 'font-semibold'
                  }`}
                >
                  {day.dayShort}
                </span>
                <span
                  className={`font-headline-sm text-headline-sm ${
                    isSelected ? 'font-bold text-on-primary-container' : 'text-on-surface'
                  }`}
                >
                  {day.dayNumber}
                </span>
                <span className={`w-2 h-2 rounded-full ${dotClasses}`}></span>
              </button>
            );
          })}
        </div>

        {/* Exam / Focus Alert Callout */}
        <div className="flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container-high mt-1 text-on-surface border border-white/5">
          <div
            className={`w-2 h-8 rounded-full shrink-0 ${
              hasExamToday || selectedDayMeta?.workload === 'heavy'
                ? 'bg-error shadow-[0_0_8px_#ffb4ab]'
                : selectedDayMeta?.workload === 'medium'
                ? 'bg-secondary'
                : 'bg-tertiary'
            }`}
          ></div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-title-md text-title-md leading-tight text-on-surface">
              {selectedDayMeta?.alertTitle}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {hasExamToday
                ? '⚠️ Examen Parcial agendado hoy • Prioridad máxima'
                : `${pendingStudyCount} misiones pendientes de estudio y ${pendingAcademicCount} académica(s)`}
            </span>
          </div>
          <span className="material-symbols-outlined text-outline text-title-md">
            tune
          </span>
        </div>
      </section>

      {/* Interactive Category Filter Chips */}
      <section className="flex flex-col gap-space-xs mb-space-md">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-margin-mobile px-margin-mobile no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-full font-label-md text-label-md shrink-0 flex items-center gap-1.5 transition-colors ${
              activeFilter === 'all'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <span>Todas</span>
            <span
              className={`px-1.5 py-0.2 rounded-full font-label-sm text-label-sm ${
                activeFilter === 'all'
                  ? 'bg-on-primary/20 text-on-primary'
                  : 'bg-surface-container-highest text-on-surface'
              }`}
            >
              {tasksForSelectedDate.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('academic')}
            className={`px-3 py-1.5 rounded-full font-label-md text-label-md shrink-0 flex items-center gap-1.5 transition-colors ${
              activeFilter === 'academic'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <span>📚 Clases &amp; Cátedras</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm">
              {tasksForSelectedDate.filter((t) => t.category === 'academic').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('study')}
            className={`px-3 py-1.5 rounded-full font-label-md text-label-md shrink-0 flex items-center gap-1.5 transition-colors ${
              activeFilter === 'study'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <span>✍️ Tareas &amp; Entregas</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm">
              {tasksForSelectedDate.filter((t) => t.category === 'study').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('health')}
            className={`px-3 py-1.5 rounded-full font-label-md text-label-md shrink-0 flex items-center gap-1.5 transition-colors ${
              activeFilter === 'health'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <span>🔋 Vida &amp; Hábitos</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm">
              {tasksForSelectedDate.filter((t) => t.category === 'health').length}
            </span>
          </button>
        </div>
      </section>

      {/* Timeline Digest / Daily Quests List */}
      <section className="flex flex-col gap-space-sm mb-space-xl" id="quest-list">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              Bloques del Día
            </span>
            <span className="font-label-sm text-label-sm text-tertiary">
              {completedForDateCount}/{tasksForSelectedDate.length} Concluidos
            </span>
          </div>

          {/* Quick Header + Button */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-primary-container/20 hover:bg-primary-container/40 text-primary font-label-sm text-label-sm flex items-center gap-1 border border-primary/20 transition-all active:scale-95"
            title="Crear nueva tarea para este día"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Nueva Misión</span>
          </button>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="rounded-xl bg-surface-container p-space-lg flex flex-col items-center justify-center text-center gap-2 border border-white/5">
            <span className="material-symbols-outlined text-headline-lg text-outline">
              event_available
            </span>
            <p className="font-title-md text-title-md text-on-surface">
              Sin bloques en esta categoría para {currentDate}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Toca el botón + para forjar una nueva misión con horario, categoría y recompensa de XP.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-title-md">add</span>
              <span>Crear Misión Ahora</span>
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isJustCompleted = burstTaskId === task.id;
            const isHighPriorityPending =
              !task.completed && (task.priority === 'high' || task.priority === 'exam');

            // Visual differentiation by category (academic, study, health)
            let categoryPill = (
              <span className="px-2 py-0.5 rounded-full bg-primary-container/30 text-primary font-label-sm text-label-sm">
                📚 Clases &amp; Cátedras
              </span>
            );
            let categoryGlowClass = '';

            if (task.category === 'academic' && task.subType === 'homework') {
              categoryPill = (
                <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary font-label-sm text-label-sm">
                  ✍️ Tareas &amp; Entregas
                </span>
              );
            } else if (task.category === 'study') {
              categoryPill = (
                <span className="px-2 py-0.5 rounded-full bg-primary-container/20 text-primary font-label-sm text-label-sm">
                  🧠 Sesiones Focus
                </span>
              );
            } else if (task.category === 'health') {
              categoryPill = (
                <span className="px-2 py-0.5 rounded-full bg-tertiary-container/40 text-tertiary font-label-sm text-label-sm">
                  🔋 Vida &amp; Salud
                </span>
              );
            }

            if (isJustCompleted) {
              if (task.category === 'academic') {
                categoryGlowClass = 'ring-2 ring-primary shadow-[0_0_24px_rgba(79,70,229,0.5)] scale-[1.01]';
              } else if (task.category === 'study') {
                categoryGlowClass = 'ring-2 ring-secondary shadow-[0_0_24px_rgba(221,184,255,0.5)] scale-[1.01]';
              } else {
                categoryGlowClass = 'ring-2 ring-tertiary shadow-[0_0_24px_rgba(78,222,163,0.5)] scale-[1.01]';
              }
            }

            const displayedXp = task.completed
              ? task.earnedXp || BASE_TASK_XP
              : xpEval.xp;

            return (
              <div
                key={task.id}
                data-category={task.category}
                className={`quest-card rounded-xl p-space-md flex items-center gap-space-md transition-all duration-300 relative overflow-hidden ${
                  isHighPriorityPending
                    ? 'bg-surface-container-high shadow-md'
                    : 'bg-surface-container shadow-sm'
                } ${categoryGlowClass}`}
              >
                {isHighPriorityPending && (
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      task.priority === 'exam' ? 'bg-error' : 'bg-secondary-container'
                    }`}
                  ></div>
                )}

                {/* Checkbox Button */}
                <button
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  aria-label={task.completed ? 'Desmarcar tarea' : 'Completar tarea'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all ${
                    task.completed
                      ? 'bg-tertiary text-on-tertiary shadow-[0_0_12px_rgba(78,222,163,0.4)]'
                      : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-title-md">
                    {task.completed ? 'check' : 'radio_button_unchecked'}
                  </span>
                </button>

                {/* Task Center Content */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {categoryPill}
                    <span
                      className={`font-body-sm text-body-sm ${
                        isHighPriorityPending
                          ? 'text-secondary font-semibold'
                          : 'text-outline'
                      }`}
                    >
                      {task.time}
                    </span>

                    {/* Etiqueta dinámica de Bonus Matutino 1.5x */}
                    {!task.completed && xpEval.isBonus && (
                      <span className="px-1.5 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold flex items-center gap-0.5 shadow-sm">
                        <span className="material-symbols-outlined text-label-sm">
                          bolt
                        </span>{' '}
                        +{xpEval.xp} XP ⚡ ¡Bonus Matutino!
                      </span>
                    )}
                    {task.completed && task.wasMorningBonus && (
                      <span className="px-1.5 py-0.5 rounded-full bg-secondary-container/40 text-secondary font-label-sm text-label-sm font-bold">
                        ⚡ 1.5x Bonus Matutino
                      </span>
                    )}
                  </div>

                  <h4
                    className={`font-title-md text-title-md text-on-surface truncate transition-all ${
                      task.completed ? 'line-through opacity-70' : 'font-semibold'
                    }`}
                  >
                    {task.title}
                  </h4>

                  {/* Subtitle / XP Status line */}
                  {task.completed ? (
                    <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm mt-0.5">
                      {task.location && (
                        <>
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-body-sm">
                              location_on
                            </span>{' '}
                            {task.location}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span className="text-tertiary font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-body-sm">
                          check_circle
                        </span>
                        +{displayedXp} XP {task.wasMorningBonus ? '⚡ Bonus Reclamado' : 'Base Reclamado'}
                      </span>
                    </div>
                  ) : task.category === 'study' ? (
                    <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm mt-0.5">
                      <span className="flex items-center gap-1 text-primary">
                        <span className="material-symbols-outlined text-body-sm">
                          timer
                        </span>{' '}
                        {task.durationMinutes || 25} min Pomodoro
                      </span>
                      <span>•</span>
                      <span className="text-tertiary font-bold">
                        +{displayedXp} XP tarea / +20 XP Focus
                      </span>
                    </div>
                  ) : task.category === 'health' ? (
                    <span className="font-body-sm text-body-sm text-tertiary font-semibold mt-0.5">
                      +{displayedXp} XP Vitalidad {xpEval.isBonus ? '⚡ (1.5x Matutino)' : ''}
                    </span>
                  ) : (
                    <span className="font-body-sm text-body-sm text-on-surface-variant truncate mt-0.5">
                      {task.subtitle || 'Completar entrega académica'}
                    </span>
                  )}
                </div>

                {/* Right Action / Status Indicator */}
                <div className="shrink-0 flex items-center">
                  {task.completed ? (
                    task.category === 'health' ? (
                      <span className="px-2 py-1 rounded-lg bg-surface-container-high text-tertiary font-label-sm text-label-sm font-bold">
                        Hecho
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-tertiary text-title-md">
                        verified
                      </span>
                    )
                  ) : isHighPriorityPending ? (
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-on-primary font-label-md text-label-md font-bold shadow-[0_0_14px_rgba(124,3,211,0.3)] active:scale-95 transition-transform"
                    >
                      Completar
                    </button>
                  ) : task.category === 'study' ? (
                    <button
                      type="button"
                      onClick={() => onNavigateFocus(task)}
                      title="Iniciar sesión Pomodoro en modo Focus"
                      className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-primary active:scale-90 transition-transform"
                    >
                      <span className="material-symbols-outlined text-title-md">
                        play_arrow
                      </span>
                    </button>
                  ) : (
                    <span className="material-symbols-outlined text-outline text-title-md">
                      {task.category === 'health' ? 'water_drop' : 'school'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Floating Action Button (FAB) + en la página main */}
      <div className="fixed bottom-24 z-40 right-4 sm:right-[max(1rem,calc(50%-236px))]">
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          aria-label="Crear Nueva Tarea o Misión"
          title="Crear Nueva Misión (Nombre, Horario y Categoría)"
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary-container via-secondary-container to-primary text-on-primary flex items-center justify-center shadow-[0_0_24px_rgba(79,70,229,0.6)] hover:scale-105 active:scale-90 transition-all border border-white/20"
        >
          <span className="material-symbols-outlined text-headline-sm">add</span>
        </button>
      </div>

      {/* Interactive Quick Create Quest Modal con formulario completo */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleModalSubmit}
        currentDate={currentDate}
        weekDays={weekDays}
        morningOverride={morningOverride}
      />
    </div>
  );
};
