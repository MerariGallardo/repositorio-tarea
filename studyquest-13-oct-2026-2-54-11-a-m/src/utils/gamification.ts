import { DayScheduleMeta, StudentState, StudentTask, TaskCategory } from '../types/gamification';

export const BASE_TASK_XP = 10;
export const MORNING_MULTIPLIER = 1.5;
export const FOCUS_SESSION_XP = 20;

export const RANK_TITLES: Record<number, { title: string; tier: string }> = {
  1: { title: 'Iniciado del Campus', tier: 'Academia Tier I' },
  2: { title: 'Aprendiz Constante', tier: 'Academia Tier I' },
  3: { title: 'Repasador Nocturno', tier: 'Academia Tier I' },
  4: { title: 'Maestro Pomodoro', tier: 'Academia Tier II' },
  5: { title: 'Estratega Académico', tier: 'Academia Tier II' },
  6: { title: 'Erudito Cuántico', tier: 'Academia Tier III' },
  7: { title: 'Arquitecto del Saber', tier: 'Academia Tier III' },
  8: { title: 'Leyenda Lumina', tier: 'Academia Tier IV' },
};

export function getRankInfo(level: number): { title: string; tier: string } {
  return RANK_TITLES[level] || {
    title: `Gran Maestro Nvl. ${level}`,
    tier: 'Academia Élite',
  };
}

/**
 * Fórmula de umbral: XP Requerido para Siguiente Nivel = Nivel Actual * 100
 */
export function getXpRequiredForNextLevel(currentLevel: number): number {
  return currentLevel * 100;
}

/**
 * Evalúa si la hora local del dispositivo (< 12:00 PM) aplica para el Multiplicador Matutino 1.5x.
 * Soporta un override opcional para demostración interactiva en cualquier horario.
 */
export function isMorningBonusActive(date: Date = new Date(), overrideMode: 'auto' | 'morning' | 'afternoon' = 'auto'): boolean {
  if (overrideMode === 'morning') return true;
  if (overrideMode === 'afternoon') return false;
  return date.getHours() < 12;
}

/**
 * Calcula el XP otorgado al completar una tarea:
 * Base = 10 XP. Si es antes de las 12:00 PM -> 1.5x = 15 XP.
 */
export function calculateTaskCompletionXp(
  date: Date = new Date(),
  overrideMode: 'auto' | 'morning' | 'afternoon' = 'auto'
): { xp: number; isBonus: boolean; multiplier: number; label: string } {
  const isBonus = isMorningBonusActive(date, overrideMode);
  const xp = isBonus ? Math.round(BASE_TASK_XP * MORNING_MULTIPLIER) : BASE_TASK_XP;
  return {
    xp,
    isBonus,
    multiplier: isBonus ? MORNING_MULTIPLIER : 1.0,
    label: isBonus ? `+${xp} XP ⚡ ¡Bonus Matutino!` : `+${xp} XP Base`,
  };
}

/**
 * Calcula la nueva progresión de nivel y XP al sumar o restar experiencia.
 */
export function applyXpChange(
  currentLevel: number,
  currentXp: number,
  xpDelta: number
): {
  level: number;
  xp: number;
  xpToNextLevel: number;
  leveledUp: boolean;
  newRankTitle: string;
} {
  let level = currentLevel;
  let xp = currentXp + xpDelta;
  let leveledUp = false;

  let threshold = getXpRequiredForNextLevel(level);

  while (xp >= threshold) {
    xp -= threshold;
    level += 1;
    leveledUp = true;
    threshold = getXpRequiredForNextLevel(level);
  }

  while (xp < 0 && level > 1) {
    level -= 1;
    threshold = getXpRequiredForNextLevel(level);
    xp += threshold;
  }

  if (xp < 0) {
    xp = 0;
  }

  return {
    level,
    xp,
    xpToNextLevel: threshold,
    leveledUp,
    newRankTitle: getRankInfo(level).title,
  };
}

/**
 * Formatea una instancia Date a YYYY-MM-DD usando hora local
 */
export function formatDateYYYYMMDD(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene los 7 días de la semana actual (Lunes a Domingo) centrados en la fecha actual
 */
export function getWeekDaysAroundDate(baseDateStr: string): DayScheduleMeta[] {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const baseDate = new Date(y, m - 1, d);
  const dayOfWeek = baseDate.getDay(); // 0 = Sun, 1 = Mon...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(y, m - 1, d + diffToMonday);
  const dayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const workloadConfig: Array<{
    workload: 'light' | 'medium' | 'heavy';
    hasExam?: boolean;
    alertTitle: (dayShort: string, dayNum: string) => string;
    alertSubtitle: string;
  }> = [
    {
      workload: 'light',
      alertTitle: (ds, dn) => `Carga Ligera hoy (${ds} ${dn})`,
      alertSubtitle: '2 misiones pendientes de estudio y 1 entrega importante',
    },
    {
      workload: 'medium',
      alertTitle: (ds, dn) => `Carga Moderada (${ds} ${dn})`,
      alertSubtitle: 'Laboratorio de Física II y bloque de repaso activo',
    },
    {
      workload: 'heavy',
      hasExam: true,
      alertTitle: (ds, dn) => `¡Día de Parcial! (${ds} ${dn})`,
      alertSubtitle: 'Examen Parcial de Cálculo I • Prioridad Máxima',
    },
    {
      workload: 'light',
      alertTitle: (ds, dn) => `Carga Ligera (${ds} ${dn})`,
      alertSubtitle: 'Cátedra de Biología y recuperación de sueño',
    },
    {
      workload: 'medium',
      alertTitle: (ds, dn) => `Cierre de Semana (${ds} ${dn})`,
      alertSubtitle: 'Entrega de guía de Termodinámica y sesión Pomodoro',
    },
    {
      workload: 'light',
      alertTitle: (ds, dn) => `Sábado de Repaso (${ds} ${dn})`,
      alertSubtitle: '1 sesión de estudio libre y descanso activo',
    },
    {
      workload: 'light',
      alertTitle: (ds, dn) => `Planificación Semanal (${ds} ${dn})`,
      alertSubtitle: 'Organización de metas y bienestar integral',
    },
  ];

  return dayNames.map((dayShort, idx) => {
    const current = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
    const dateStr = formatDateYYYYMMDD(current);
    const dayNum = String(current.getDate());
    const cfg = workloadConfig[idx];
    const formattedDayLabel = dayShort.charAt(0) + dayShort.slice(1).toLowerCase();

    return {
      date: dateStr,
      dayShort,
      dayNumber: dayNum,
      monthName: `${monthNames[current.getMonth()]} ${current.getFullYear()}`,
      workload: cfg.workload,
      hasExam: cfg.hasExam,
      alertTitle: cfg.alertTitle(formattedDayLabel, dayNum),
      alertSubtitle: cfg.alertSubtitle,
    };
  });
}

export function getCategoryVisualMeta(category: TaskCategory) {
  switch (category) {
    case 'academic':
      return {
        emoji: '📚',
        badgeText: '📚 Clases & Entregas',
        badgeClass: 'bg-primary-container/30 text-primary',
        completedRing: 'shadow-[0_0_16px_rgba(79,70,229,0.55)]',
        accentColor: 'text-primary',
      };
    case 'study':
      return {
        emoji: '✍️',
        badgeText: '✍️ Estudio & Focus',
        badgeClass: 'bg-secondary-container/40 text-secondary',
        completedRing: 'shadow-[0_0_16px_rgba(221,184,255,0.55)]',
        accentColor: 'text-secondary',
      };
    case 'health':
      return {
        emoji: '🔋',
        badgeText: '🔋 Vida & Salud',
        badgeClass: 'bg-tertiary-container/40 text-tertiary',
        completedRing: 'shadow-[0_0_16px_rgba(78,222,163,0.55)]',
        accentColor: 'text-tertiary',
      };
  }
}

export function buildInitialStudentState(todayStr: string = formatDateYYYYMMDD()): StudentState {
  const weekDays = getWeekDaysAroundDate(todayStr);
  // Ensure tasks exist for every day of the week, with today having the exact Stitch tasks
  const d0 = weekDays[0]?.date || todayStr;
  const d1 = weekDays[1]?.date || todayStr;
  const d2 = weekDays[2]?.date || todayStr;
  const d3 = weekDays[3]?.date || todayStr;
  const d4 = weekDays[4]?.date || todayStr;
  const d5 = weekDays[5]?.date || todayStr;
  const d6 = weekDays[6]?.date || todayStr;

  // Put the main 5 Stitch tasks on `todayStr`, and if `todayStr` is not d0, also populate d0
  const primaryDate = todayStr;

  const tasks: StudentTask[] = [
    // Primary day (Today) - Exact 5 Stitch tasks mapped to the 3 core categories
    {
      id: 'task-1',
      title: 'Dormir al menos 8 horas',
      subtitle: 'Hábito de recuperación neuronal',
      time: '08:00 AM',
      date: primaryDate,
      category: 'health',
      subType: 'wellness',
      completed: true,
      earnedXp: 10,
      wasMorningBonus: false,
      priority: 'normal',
    },
    {
      id: 'task-2',
      title: 'Cálculo I: Límites y Continuidad',
      subtitle: 'Asistencia a cátedra teórica',
      location: 'Aula 302',
      time: '08:30 AM',
      date: primaryDate,
      category: 'academic',
      subType: 'classes',
      completed: true,
      earnedXp: 15,
      wasMorningBonus: true,
      priority: 'normal',
      subjectId: 'calculo',
    },
    {
      id: 'task-3',
      title: 'Entregar Informe Biología Celular',
      subtitle: 'Cargar PDF en Campus Virtual antes de mediodía',
      time: '11:30 AM',
      date: primaryDate,
      category: 'academic',
      subType: 'homework',
      completed: false,
      priority: 'high',
      subjectId: 'biologia',
    },
    {
      id: 'task-4',
      title: 'Física II: Termodinámica',
      subtitle: '45 min Pomodoro',
      time: '04:00 PM',
      date: primaryDate,
      category: 'study',
      subType: 'study',
      completed: false,
      durationMinutes: 45,
      priority: 'normal',
      subjectId: 'fisica',
    },
    {
      id: 'task-5',
      title: 'Almuerzo nutritivo e hidratación (1L)',
      subtitle: 'Pausa activa lejos de pantallas',
      time: '01:00 PM',
      date: primaryDate,
      category: 'health',
      subType: 'wellness',
      completed: false,
      priority: 'normal',
    },

    // Martes (d1)
    {
      id: 'task-mar-1',
      title: 'Hidratación matutina + Estiramiento 10m',
      subtitle: 'Activación física antes de clase',
      time: '07:45 AM',
      date: d1 === primaryDate ? d0 : d1,
      category: 'health',
      subType: 'wellness',
      completed: false,
      priority: 'normal',
    },
    {
      id: 'task-mar-2',
      title: 'Laboratorio de Física II: Calorimetría',
      subtitle: 'Práctica grupal en Pabellón II',
      location: 'Lab 104',
      time: '10:00 AM',
      date: d1 === primaryDate ? d0 : d1,
      category: 'academic',
      subType: 'classes',
      completed: false,
      priority: 'high',
      subjectId: 'fisica',
    },
    {
      id: 'task-mar-3',
      title: 'Simulacro de Ejercicios: Derivadas',
      subtitle: '50 min Estudio Profundo',
      time: '05:00 PM',
      date: d1 === primaryDate ? d0 : d1,
      category: 'study',
      subType: 'study',
      completed: false,
      durationMinutes: 50,
      priority: 'normal',
      subjectId: 'calculo',
    },

    // Miércoles (d2 - Exam day!)
    {
      id: 'task-mie-1',
      title: 'Desayuno energético pre-examen',
      subtitle: 'Avena, proteína y descanso visual',
      time: '08:00 AM',
      date: d2,
      category: 'health',
      subType: 'wellness',
      completed: false,
      priority: 'normal',
    },
    {
      id: 'task-mie-2',
      title: 'EXAMEN PARCIAL: Cálculo I',
      subtitle: 'Unidades 1 a 3: Límites, Continuidad y Derivadas',
      location: 'Aula Magna',
      time: '09:30 AM',
      date: d2,
      category: 'academic',
      subType: 'homework',
      completed: false,
      priority: 'exam',
      subjectId: 'calculo',
    },
    {
      id: 'task-mie-3',
      title: 'Repaso Flashcards Biología Celular',
      subtitle: '25 min Pomodoro • Membrana Plasmática',
      time: '04:30 PM',
      date: d2,
      category: 'study',
      subType: 'study',
      completed: false,
      durationMinutes: 25,
      priority: 'normal',
      subjectId: 'biologia',
    },

    // Jueves (d3)
    {
      id: 'task-jue-1',
      title: 'Cátedra Biología Celular: Mitosis',
      subtitle: 'Teórico-práctico con microscopía',
      location: 'Aula 208',
      time: '09:00 AM',
      date: d3,
      category: 'academic',
      subType: 'classes',
      completed: false,
      priority: 'normal',
      subjectId: 'biologia',
    },
    {
      id: 'task-jue-2',
      title: 'Bloque Pomodoro: Guía 4 Física II',
      subtitle: '25 min Pomodoro • Entropía y Segunda Ley',
      time: '03:00 PM',
      date: d3,
      category: 'study',
      subType: 'study',
      completed: false,
      durationMinutes: 25,
      priority: 'normal',
      subjectId: 'fisica',
    },
    {
      id: 'task-jue-3',
      title: 'Caminata de desconexión 30 min',
      subtitle: 'Salud mental y oxigenación',
      time: '07:00 PM',
      date: d3,
      category: 'health',
      subType: 'wellness',
      completed: false,
      priority: 'normal',
    },

    // Viernes (d4)
    {
      id: 'task-vie-1',
      title: 'Entregar Guía Práctica Física II',
      subtitle: 'Resolver problemas 1 al 12 de Termodinámica',
      time: '11:00 AM',
      date: d4,
      category: 'academic',
      subType: 'homework',
      completed: false,
      priority: 'high',
      subjectId: 'fisica',
    },
    {
      id: 'task-vie-2',
      title: 'Síntesis Semanal de Apuntes',
      subtitle: '50 min Estudio Profundo • Método Cornell',
      time: '04:00 PM',
      date: d4,
      category: 'study',
      subType: 'study',
      completed: false,
      durationMinutes: 50,
      priority: 'normal',
    },

    // Sábado (d5)
    {
      id: 'task-sab-1',
      title: 'Repaso Ligero: Lectura Cap. 5 Biología',
      subtitle: '25 min Pomodoro sin presión',
      time: '10:30 AM',
      date: d5,
      category: 'study',
      subType: 'study',
      completed: false,
      durationMinutes: 25,
      priority: 'normal',
      subjectId: 'biologia',
    },
    {
      id: 'task-sab-2',
      title: 'Dormir 8.5h sin alarma',
      subtitle: 'Recuperación de fin de semana',
      time: '09:00 AM',
      date: d5,
      category: 'health',
      subType: 'wellness',
      completed: false,
      priority: 'normal',
    },

    // Domingo (d6)
    {
      id: 'task-dom-1',
      title: 'Planificar Misiones de la Semana 43',
      subtitle: 'Organizar entregas y bloques Pomodoro',
      time: '06:00 PM',
      date: d6,
      category: 'study',
      subType: 'study',
      completed: false,
      durationMinutes: 25,
      priority: 'normal',
    },
    {
      id: 'task-dom-2',
      title: 'Meal Prep saludable para la semana',
      subtitle: 'Preparar viandas para días de cursada',
      time: '08:00 PM',
      date: d6,
      category: 'health',
      subType: 'wellness',
      completed: false,
      priority: 'normal',
    },
  ];

  // Nivel 3 requiere Nivel Actual * 100 = 300 XP para subir a Nivel 4.
  // Iniciamos en 285 / 300 XP (95%) para que al completar 1 misión matutina (+15 XP) o 1 sesión Focus (+20 XP)
  // el usuario experimente de inmediato el Level Up a Nivel 4: Maestro Pomodoro.
  return {
    level: 3,
    xp: 285,
    xpToNextLevel: 300, // 3 * 100
    streakDays: 7,
    recordStreakDays: 12,
    focusSessionsCompleted: 8,
    morningTasksCount: 5,
    chestClaimed: false,
    tasks,
    weeklyXpBreakdown: {
      academic: 105,
      study: 140,
      health: 70,
      morningBonus: 40,
    },
    lastSyncedAt: new Date().toISOString(),
  };
}
