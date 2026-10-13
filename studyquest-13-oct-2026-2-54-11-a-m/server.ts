import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import {
  applyXpChange,
  BASE_TASK_XP,
  buildInitialStudentState,
  FOCUS_SESSION_XP,
  formatDateYYYYMMDD,
  MORNING_MULTIPLIER,
} from './src/utils/gamification';
import { StudentState, StudentTask } from './src/types/gamification';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Estado en memoria de Antigravity Core
  let studentState: StudentState = buildInitialStudentState(formatDateYYYYMMDD());

  // 1. Carga Inicial: GET /student/state
  app.get(['/student/state', '/api/student/state'], (req, res) => {
    const clientDate = typeof req.query.today === 'string' ? req.query.today : undefined;
    if (clientDate && !studentState.tasks.some((t) => t.date === clientDate)) {
      studentState = buildInitialStudentState(clientDate);
    }
    res.json({
      status: 'ok',
      source: 'antigravity-core-v2',
      state: studentState,
    });
  });

  // 2. Completado de Tarea: POST /tasks/:id/complete
  app.post(['/tasks/:id/complete', '/api/tasks/:id/complete'], (req, res) => {
    const taskId = req.params.id;
    const { completed_at, completed = true, is_morning_bonus } = req.body || {};

    const taskIndex = studentState.tasks.findIndex((t) => t.id === taskId);
    const completionDate = completed_at ? new Date(completed_at) : new Date();
    const isMorning =
      typeof is_morning_bonus === 'boolean'
        ? is_morning_bonus
        : completionDate.getHours() < 12;

    const calculatedXp = isMorning
      ? Math.round(BASE_TASK_XP * MORNING_MULTIPLIER)
      : BASE_TASK_XP;

    let xpDelta = 0;
    let updatedTask: StudentTask | null = null;

    if (taskIndex !== -1) {
      const existing = studentState.tasks[taskIndex];
      if (completed && !existing.completed) {
        xpDelta = calculatedXp;
        updatedTask = {
          ...existing,
          completed: true,
          completedAt: completed_at || new Date().toISOString(),
          earnedXp: calculatedXp,
          wasMorningBonus: isMorning,
        };
      } else if (!completed && existing.completed) {
        xpDelta = -(existing.earnedXp || BASE_TASK_XP);
        updatedTask = {
          ...existing,
          completed: false,
          completedAt: undefined,
          earnedXp: undefined,
          wasMorningBonus: undefined,
        };
      } else {
        updatedTask = existing;
      }
      studentState.tasks[taskIndex] = updatedTask;
    }

    const progression = applyXpChange(studentState.level, studentState.xp, xpDelta);
    studentState.level = progression.level;
    studentState.xp = progression.xp;
    studentState.xpToNextLevel = progression.xpToNextLevel;
    studentState.lastSyncedAt = new Date().toISOString();

    if (updatedTask && xpDelta !== 0) {
      const cat = updatedTask.category;
      studentState.weeklyXpBreakdown[cat] = Math.max(
        0,
        studentState.weeklyXpBreakdown[cat] + (xpDelta > 0 ? BASE_TASK_XP : -BASE_TASK_XP)
      );
      if (isMorning && xpDelta > 0) {
        const bonusPart = calculatedXp - BASE_TASK_XP;
        studentState.weeklyXpBreakdown.morningBonus += bonusPart;
        studentState.morningTasksCount += 1;
      }
    }

    res.json({
      success: true,
      task_id: taskId,
      completed_at: completed_at || new Date().toISOString(),
      task: updatedTask,
      xpDelta,
      leveledUp: progression.leveledUp,
      newLevel: progression.level,
      newXp: progression.xp,
      newXpToNextLevel: progression.xpToNextLevel,
      newRankTitle: progression.newRankTitle,
      state: studentState,
      syncedAt: studentState.lastSyncedAt,
    });
  });

  // 3. Crear nueva tarea en Antigravity
  app.post(['/tasks', '/api/tasks'], (req, res) => {
    const newTask: StudentTask = req.body;
    if (newTask && newTask.id) {
      studentState.tasks.push(newTask);
      studentState.lastSyncedAt = new Date().toISOString();
    }
    res.json({
      success: true,
      task: newTask,
      state: studentState,
    });
  });

  // 4. Recompensa por Sesión Focus / Pomodoro: POST /focus/complete
  app.post(['/focus/complete', '/api/focus/complete'], (req, res) => {
    const { taskId, completed_at } = req.body || {};
    const xpDelta = FOCUS_SESSION_XP;

    if (taskId) {
      const idx = studentState.tasks.findIndex((t) => t.id === taskId);
      if (idx !== -1 && !studentState.tasks[idx].completed) {
        studentState.tasks[idx] = {
          ...studentState.tasks[idx],
          completed: true,
          completedAt: completed_at || new Date().toISOString(),
          earnedXp: FOCUS_SESSION_XP,
        };
      }
    }

    const progression = applyXpChange(studentState.level, studentState.xp, xpDelta);
    studentState.level = progression.level;
    studentState.xp = progression.xp;
    studentState.xpToNextLevel = progression.xpToNextLevel;
    studentState.focusSessionsCompleted += 1;
    studentState.weeklyXpBreakdown.study += xpDelta;
    studentState.lastSyncedAt = new Date().toISOString();

    res.json({
      success: true,
      xpDelta,
      leveledUp: progression.leveledUp,
      newLevel: progression.level,
      newXp: progression.xp,
      newXpToNextLevel: progression.xpToNextLevel,
      newRankTitle: progression.newRankTitle,
      state: studentState,
      syncedAt: studentState.lastSyncedAt,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lumina Quest + Antigravity Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
