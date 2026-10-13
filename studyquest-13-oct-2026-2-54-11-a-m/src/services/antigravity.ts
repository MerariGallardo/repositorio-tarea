import {
  CompleteTaskPayload,
  CompleteTaskResponse,
  StudentState,
  StudentTask,
} from '../types/gamification';
import { buildInitialStudentState, formatDateYYYYMMDD } from '../utils/gamification';

const STORAGE_KEY = 'lumina_quest_antigravity_state_v1';

export function loadLocalBackupState(todayStr: string = formatDateYYYYMMDD()): StudentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StudentState;
      if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.some((t) => t.date === todayStr)) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  const initial = buildInitialStudentState(todayStr);
  saveLocalBackupState(initial);
  return initial;
}

export function saveLocalBackupState(state: StudentState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

/**
 * 1. Carga Inicial: GET /student/state
 */
export async function fetchStudentStateFromAntigravity(
  todayStr: string = formatDateYYYYMMDD()
): Promise<{ state: StudentState; source: string }> {
  try {
    const response = await fetch(`/student/state?today=${encodeURIComponent(todayStr)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.state) {
        saveLocalBackupState(data.state);
        return { state: data.state, source: data.source || 'antigravity-remote' };
      }
    }
  } catch {
    // Fallback to local state if offline
  }
  return {
    state: loadLocalBackupState(todayStr),
    source: 'antigravity-local-cache',
  };
}

/**
 * 2. Completado de Tarea: POST /tasks/{id}/complete
 */
export async function postTaskCompletionToAntigravity(
  payload: CompleteTaskPayload
): Promise<CompleteTaskResponse | null> {
  try {
    const response = await fetch(`/tasks/${encodeURIComponent(payload.task_id)}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.state) {
        saveLocalBackupState(data.state);
      }
      return data as CompleteTaskResponse;
    }
  } catch {
    // Handled gracefully by optimistic UI state
  }
  return null;
}

/**
 * 3. Crear Nueva Misión: POST /tasks
 */
export async function postNewTaskToAntigravity(task: StudentTask): Promise<void> {
  try {
    await fetch('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
  } catch {
    // Handled by optimistic UI
  }
}

/**
 * 4. Sesión de Estudio Focus Completada: POST /focus/complete
 */
export async function postFocusCompletionToAntigravity(
  taskId?: string
): Promise<CompleteTaskResponse | null> {
  try {
    const response = await fetch('/focus/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        completed_at: new Date().toISOString(),
      }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.state) {
        saveLocalBackupState(data.state);
      }
      return data as CompleteTaskResponse;
    }
  } catch {
    // Handled by optimistic UI
  }
  return null;
}
