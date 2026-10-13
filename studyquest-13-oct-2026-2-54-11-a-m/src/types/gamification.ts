export type TaskCategory = 'academic' | 'study' | 'health';

export type TaskSubType = 'classes' | 'homework' | 'study' | 'wellness';

export type WorkloadLevel = 'light' | 'medium' | 'heavy';

export interface StudentTask {
  id: string;
  title: string;
  subtitle?: string;
  location?: string;
  time: string;
  date: string; // YYYY-MM-DD
  category: TaskCategory;
  subType: TaskSubType;
  completed: boolean;
  completedAt?: string;
  earnedXp?: number;
  wasMorningBonus?: boolean;
  priority?: 'normal' | 'high' | 'exam';
  durationMinutes?: number;
  subjectId?: 'biologia' | 'fisica' | 'calculo';
}

export interface CreateTaskInput {
  title: string;
  subtitle?: string;
  date: string; // YYYY-MM-DD
  time: string;
  category: TaskCategory;
  subType: TaskSubType;
  priority?: 'normal' | 'high' | 'exam';
  location?: string;
  durationMinutes?: number;
  subjectId?: 'biologia' | 'fisica' | 'calculo';
}

export interface DayScheduleMeta {
  date: string; // YYYY-MM-DD
  dayShort: string; // LUN, MAR, MIÉ...
  dayNumber: string; // 12, 13...
  monthName: string;
  workload: WorkloadLevel;
  hasExam?: boolean;
  alertTitle: string;
  alertSubtitle: string;
}

export interface WeeklyXpBreakdown {
  academic: number;
  study: number;
  health: number;
  morningBonus: number;
}

export interface StudentState {
  level: number;
  xp: number;
  xpToNextLevel: number;
  streakDays: number;
  recordStreakDays: number;
  focusSessionsCompleted: number;
  morningTasksCount: number;
  chestClaimed: boolean;
  tasks: StudentTask[];
  weeklyXpBreakdown: WeeklyXpBreakdown;
  lastSyncedAt: string;
}

export interface CompleteTaskPayload {
  task_id: string;
  completed_at: string;
  completed: boolean;
  is_morning_bonus: boolean;
}

export interface CompleteTaskResponse {
  success: boolean;
  task: StudentTask;
  xpDelta: number;
  leveledUp: boolean;
  newLevel: number;
  newXp: number;
  newXpToNextLevel: number;
  newRankTitle: string;
  syncedAt: string;
}
