import React from 'react';
import { StudentState } from '../types/gamification';
import { getRankInfo, getXpRequiredForNextLevel } from '../utils/gamification';

interface ProgresoViewProps {
  studentState: StudentState;
  onClaimChest: () => void;
  onNavigateFocus: () => void;
}

export const ProgresoView: React.FC<ProgresoViewProps> = ({
  studentState,
  onClaimChest,
  onNavigateFocus,
}) => {
  const rank = getRankInfo(studentState.level);
  const xpThreshold = getXpRequiredForNextLevel(studentState.level);
  const xpPercentage = Math.min(100, Math.round((studentState.xp / xpThreshold) * 100));
  const xpRemaining = Math.max(0, xpThreshold - studentState.xp);

  // Cálculo dinámico de Equilibrio Vital de Estudio vs Descanso
  const studyAndAcademicXp =
    studentState.weeklyXpBreakdown.academic + studentState.weeklyXpBreakdown.study;
  const healthXp = studentState.weeklyXpBreakdown.health;
  const totalBalanceXp = Math.max(1, studyAndAcademicXp + healthXp);
  const studyRatio = Math.min(85, Math.max(20, Math.round((studyAndAcademicXp / totalBalanceXp) * 100)));
  const healthRatio = 100 - studyRatio;

  const totalWeeklyXp =
    studentState.weeklyXpBreakdown.academic +
    studentState.weeklyXpBreakdown.study +
    studentState.weeklyXpBreakdown.health +
    studentState.weeklyXpBreakdown.morningBonus;

  // Progreso dinámico de asignaturas según tareas completadas
  const bioTasks = studentState.tasks.filter((t) => t.subjectId === 'biologia');
  const bioCompleted = bioTasks.filter((t) => t.completed).length;
  const bioPercent = Math.min(100, 75 + bioCompleted * 10);

  const fisicaTasks = studentState.tasks.filter((t) => t.subjectId === 'fisica');
  const fisicaCompleted = fisicaTasks.filter((t) => t.completed).length;
  const fisicaPercent = Math.min(100, 60 + fisicaCompleted * 12);

  const calculoTasks = studentState.tasks.filter((t) => t.subjectId === 'calculo');
  const calculoCompleted = calculoTasks.filter((t) => t.completed).length;
  const calculoPercent = Math.min(100, 62 + calculoCompleted * 10);

  const focusBadgeUnlocked = studentState.focusSessionsCompleted >= 10;
  const focusBadgeProgress = Math.min(100, Math.round((studentState.focusSessionsCompleted / 10) * 100));

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* 1. RESUMEN DE NIVEL Y RANGO (HERO CARD REPUTACIÓN) */}
      <section className="relative w-full rounded-xl bg-surface-container-high p-space-md shadow-xl overflow-hidden border border-white/5">
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-primary-container/20 blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col gap-space-md">
          {/* Top: Avatar Mascota + Rango + Racha Pill */}
          <div className="flex items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="relative shrink-0 w-14 h-14 rounded-xl bg-surface-container-lowest p-1 shadow-md">
                <img
                  className="w-full h-full rounded-lg object-cover"
                  alt="Cyber-Owl Mascot"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvuuh7Otj_vVF06tGE5KMWppuiDUhACiMuyPrQWPU98UwBT9yWJAJ8jbLPOR0TfLIXZheQGuMqyu2Bi0bGGORexZlJzUJtnLhsispAyoE1gHpDNMM6hnUmNfrfnSebbMhu889h1jD875LCwshGZieBBsf_Lw1fT_Ecum9y3-p_qVf7lTrAdPkI3fKzhR0kL7_3mpqHgLp_HudekqDhUewzJwOjlRsI0N6kEZApeFCjnPIL8FRog2xm"
                />
                <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-tertiary text-on-tertiary">
                  <span
                    className="material-symbols-outlined text-[12px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    bolt
                  </span>
                </span>
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest">
                  Rango Académico
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface truncate">
                  Nivel {studentState.level}: {rank.title}
                </h2>
                <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-body-sm text-tertiary">
                    military_tech
                  </span>{' '}
                  Senda de Maestría ({rank.tier})
                </span>
              </div>
            </div>
            {/* Racha Badge */}
            <div className="shrink-0 flex flex-col items-end">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest shadow-sm">
                <span
                  className="material-symbols-outlined text-title-md text-amber-400"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  local_fire_department
                </span>
                <span className="font-metric-streak text-label-md text-amber-400">
                  {studentState.streakDays}d
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-outline mt-1">
                Récord: {studentState.recordStreakDays}d
              </span>
            </div>
          </div>

          {/* XP Bar Gauge Progress */}
          <div className="flex flex-col gap-space-xs bg-surface-container-low/70 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="font-headline-sm text-headline-sm text-primary-fixed-dim">
                  {studentState.xp}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  / {xpThreshold} XP
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-tertiary uppercase font-bold tracking-wider">
                Faltan {xpRemaining} XP p/ Lvl {studentState.level + 1}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-container-highest overflow-hidden relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-container via-secondary-container to-tertiary transition-all duration-700"
                style={{ width: `${xpPercentage}%` }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MÉTRICA DE EQUILIBRIO: ESTUDIO VS. AUTOCUIDADO */}
      <section className="flex flex-col gap-space-sm bg-surface-container p-space-md rounded-xl shadow-md border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-title-md text-tertiary">
              balance
            </span>
            <h3 className="font-title-md text-title-md text-on-surface">
              Equilibrio Vital de Estudio
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-tertiary-container/30 text-on-tertiary-container font-label-sm text-label-sm font-semibold">
            Semanal
          </span>
        </div>

        {/* Comparativa Bar Visual Track */}
        <div className="flex flex-col gap-space-xs mt-1">
          <div className="h-3.5 w-full rounded-full bg-surface-container-highest flex overflow-hidden p-0.5 gap-0.5">
            <div
              className="h-full rounded-full bg-primary-container transition-all duration-700"
              style={{ width: `${studyRatio}%` }}
            ></div>
            <div
              className="h-full rounded-full bg-tertiary transition-all duration-700"
              style={{ width: `${healthRatio}%` }}
            ></div>
          </div>

          {/* Detail KPIs Split */}
          <div className="grid grid-cols-2 gap-space-sm pt-2">
            {/* Bloque Estudio */}
            <div className="flex flex-col p-2.5 rounded-lg bg-surface-container-low">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-sm text-label-sm text-primary-fixed uppercase tracking-wider">
                  Estudio Activo
                </span>
                <span className="font-metric-streak text-label-md text-primary-fixed">
                  {studyRatio}%
                </span>
              </div>
              <span className="font-title-md text-title-md text-on-surface">
                {(studentState.focusSessionsCompleted * 0.55).toFixed(1)}h
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Promedio diario focus
              </span>
            </div>

            {/* Bloque Descanso & Hábitos */}
            <div className="flex flex-col p-2.5 rounded-lg bg-surface-container-low">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-wider">
                  Descanso &amp; Salud
                </span>
                <span className="font-metric-streak text-label-md text-tertiary">
                  {healthRatio}%
                </span>
              </div>
              <span className="font-title-md text-title-md text-on-surface">
                7.8h
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Sueño reparador
              </span>
            </div>
          </div>
        </div>

        {/* Diagnóstico Positivo de Salud */}
        <div className="flex items-start gap-space-sm p-3 rounded-lg bg-surface-container-high text-on-surface">
          <span className="material-symbols-outlined text-title-md text-tertiary shrink-0 mt-0.5">
            spa
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
            <strong className="text-tertiary font-semibold">
              Equilibrio Óptimo:
            </strong>{' '}
            Estás manteniendo hábitos de sueño saludables mientras avanzas con
            consistencia en tus cátedras.
          </p>
        </div>
      </section>

      {/* 3. TARJETAS DE ASIGNATURAS ACADÉMICAS */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-title-md text-primary">
              menu_book
            </span>
            <h3 className="font-title-md text-title-md text-on-surface">
              Cátedras en Curso
            </h3>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            3 Activas
          </span>
        </div>

        <div className="flex flex-col gap-space-sm">
          {/* Tarjeta 1: Biología Celular */}
          <article
            onClick={onNavigateFocus}
            className="p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors shadow-sm flex flex-col gap-space-sm cursor-pointer border border-white/5"
          >
            <div className="flex items-start justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-lg bg-tertiary-container/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-title-md text-tertiary">
                    biotech
                  </span>
                </div>
                <div className="min-w-0 flex flex-col">
                  <h4 className="font-title-md text-title-md text-on-surface truncate">
                    Biología Celular
                  </h4>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    3/3 clases asistidas (100%)
                  </span>
                </div>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-tertiary">
                  event
                </span>{' '}
                22 Oct
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between font-label-sm text-label-sm">
                <span className="text-on-surface-variant">Tareas completadas</span>
                <span className="text-tertiary font-bold">{bioPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                <div
                  className="h-full rounded-full bg-tertiary transition-all duration-700"
                  style={{ width: `${bioPercent}%` }}
                ></div>
              </div>
            </div>
          </article>

          {/* Tarjeta 2: Física II */}
          <article
            onClick={onNavigateFocus}
            className="p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors shadow-sm flex flex-col gap-space-sm cursor-pointer border border-white/5"
          >
            <div className="flex items-start justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-title-md text-primary">
                    functions
                  </span>
                </div>
                <div className="min-w-0 flex flex-col">
                  <h4 className="font-title-md text-title-md text-on-surface truncate">
                    Física II
                  </h4>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {(studentState.focusSessionsCompleted * 0.5).toFixed(1)}h focus acumuladas esta semana
                  </span>
                </div>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-secondary-container/30 text-secondary font-label-sm text-label-sm">
                2 guías pendientes
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between font-label-sm text-label-sm">
                <span className="text-on-surface-variant">Tareas completadas</span>
                <span className="text-primary-fixed-dim font-bold">
                  {fisicaPercent}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-container transition-all duration-700"
                  style={{ width: `${fisicaPercent}%` }}
                ></div>
              </div>
            </div>
          </article>

          {/* Tarjeta 3: Cálculo I (Alerta) */}
          <article
            onClick={onNavigateFocus}
            className="p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors shadow-sm flex flex-col gap-space-sm cursor-pointer border border-white/5"
          >
            <div className="flex items-start justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-lg bg-error-container/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-title-md text-error">
                    calculate
                  </span>
                </div>
                <div className="min-w-0 flex flex-col">
                  <h4 className="font-title-md text-title-md text-on-surface truncate">
                    Cálculo I
                  </h4>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    90% asistencia general
                  </span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold shadow-[0_0_12px_rgba(147,0,10,0.4)]">
                <span className="material-symbols-outlined text-[13px]">
                  warning
                </span>{' '}
                Parcial Mié
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between font-label-sm text-label-sm">
                <span className="text-on-surface-variant">Progreso temario</span>
                <span className="text-error font-bold">{calculoPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-container to-error transition-all duration-700"
                  style={{ width: `${calculoPercent}%` }}
                ></div>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* 4. INSIGNIAS DE LOGROS ACADÉMICOS (GAMIFICADOS) */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-title-md text-secondary">
              workspace_premium
            </span>
            <h3 className="font-title-md text-title-md text-on-surface">
              Insignias &amp; Logros
            </h3>
          </div>
          <span className="font-label-sm text-label-sm text-secondary font-bold">
            {focusBadgeUnlocked ? '3 / 4' : '2 / 4'} Desbloqueadas
          </span>
        </div>

        <div className="grid grid-cols-2 gap-space-sm">
          {/* Medalla 1: Búho Nocturno */}
          <div className="p-3 rounded-xl bg-surface-container flex flex-col gap-2 relative overflow-hidden shadow-sm border border-white/5">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-secondary-container/40 flex items-center justify-center text-lg">
                🦉
              </div>
              <span className="px-1.5 py-0.5 rounded bg-tertiary-container/30 text-on-tertiary-container font-label-sm text-label-sm flex items-center gap-0.5">
                <span
                  className="material-symbols-outlined text-[10px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>{' '}
                Desbloq.
              </span>
            </div>
            <div className="flex flex-col">
              <h5 className="font-label-lg text-label-lg text-on-surface font-semibold">
                Búho Nocturno
              </h5>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                Completar tarea de madrugada.
              </p>
            </div>
          </div>

          {/* Medalla 2: Madrugador */}
          <div className="p-3 rounded-xl bg-surface-container flex flex-col gap-2 relative overflow-hidden shadow-sm border border-white/5">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-lg">
                🌅
              </div>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-label-sm text-label-sm font-bold">
                x{studentState.morningTasksCount} • 1.5x XP
              </span>
            </div>
            <div className="flex flex-col">
              <h5 className="font-label-lg text-label-lg text-on-surface font-semibold">
                Madrugador
              </h5>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                Estudio activo antes de las 12 PM.
              </p>
            </div>
          </div>

          {/* Medalla 3: Semana Perfecta */}
          <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-2 relative overflow-hidden border border-white/5">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center text-lg opacity-75">
                📅
              </div>
              <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                4 / 5 días
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h5 className="font-label-lg text-label-lg text-on-surface font-semibold">
                Semana Perfecta
              </h5>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                100% asistencia a cátedras.
              </p>
              <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-primary-container"
                  style={{ width: '80%' }}
                ></div>
              </div>
            </div>
          </div>

          {/* Medalla 4: Maestro Focus */}
          <div
            className={`p-3 rounded-xl flex flex-col gap-2 relative overflow-hidden border border-white/5 ${
              focusBadgeUnlocked
                ? 'bg-surface-container shadow-sm'
                : 'bg-surface-container-low'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center text-lg">
                ⏱️
              </div>
              <span
                className={`px-1.5 py-0.5 rounded font-label-sm text-label-sm ${
                  focusBadgeUnlocked
                    ? 'bg-tertiary-container/30 text-on-tertiary-container font-bold'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {focusBadgeUnlocked
                  ? '★ Desbloq.'
                  : `${studentState.focusSessionsCompleted} / 10`}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h5 className="font-label-lg text-label-lg text-on-surface font-semibold">
                Maestro Focus
              </h5>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                10 bloques sin interrupciones.
              </p>
              <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-secondary-container transition-all duration-500"
                  style={{ width: `${focusBadgeProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. RESUMEN SEMANAL DE XP GANADO CON DESGLOSE */}
      <section className="flex flex-col gap-space-sm p-space-md rounded-xl bg-surface-container shadow-md border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-title-md text-amber-400">
              insights
            </span>
            <h3 className="font-title-md text-title-md text-on-surface">
              Rendimiento Semanal
            </h3>
          </div>
          <span className="font-metric-streak text-label-md text-tertiary">
            +{totalWeeklyXp} XP Total
          </span>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary-container/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[16px]">
                  school
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface">
                Clases y Asistencia (📚 academic)
              </span>
            </div>
            <span className="font-metric-streak text-label-sm text-primary-fixed font-bold">
              +{studentState.weeklyXpBreakdown.academic} XP
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-secondary-container/20 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[16px]">
                  timer
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface">
                Bloques Focus (✍️ study)
              </span>
            </div>
            <span className="font-metric-streak text-label-sm text-secondary font-bold">
              +{studentState.weeklyXpBreakdown.study} XP
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-tertiary-container/20 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[16px]">
                  bedtime
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface">
                Hábitos de Salud y Sueño (🔋 health)
              </span>
            </div>
            <span className="font-metric-streak text-label-sm text-tertiary font-bold">
              +{studentState.weeklyXpBreakdown.health} XP
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-400">
                <span className="material-symbols-outlined text-[16px]">
                  wb_sunny
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface">
                Bonus Matutinos (1.5x &lt; 12 PM)
              </span>
            </div>
            <span className="font-metric-streak text-label-sm text-amber-400 font-bold">
              +{studentState.weeklyXpBreakdown.morningBonus} XP
            </span>
          </div>
        </div>
      </section>

      {/* Motivational Gamified Footer Callout */}
      <div className="w-full p-space-md rounded-xl bg-gradient-to-r from-primary-container/20 to-tertiary-container/20 flex items-center justify-between gap-space-sm border border-white/5">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-headline-sm text-tertiary">
            rewarded_ads
          </span>
          <div className="flex flex-col">
            <span className="font-label-lg text-label-lg text-on-surface font-semibold">
              Cofre de Estudio Listo
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Reclama tu recompensa (+30 XP) por racha de {studentState.streakDays} días
            </span>
          </div>
        </div>
        <button
          type="button"
          disabled={studentState.chestClaimed}
          onClick={onClaimChest}
          className={`shrink-0 px-3.5 py-2 rounded-lg font-label-md text-label-md font-bold shadow-md active:scale-95 transition-all ${
            studentState.chestClaimed
              ? 'bg-surface-container-highest text-on-surface-variant cursor-default'
              : 'bg-tertiary text-on-tertiary'
          }`}
        >
          {studentState.chestClaimed ? '¡Reclamado! 🎁' : 'Abrir'}
        </button>
      </div>
    </div>
  );
};
