import React, { useEffect, useState } from 'react';
import {
  CreateTaskInput,
  DayScheduleMeta,
  TaskCategory,
  TaskSubType,
} from '../types/gamification';
import { calculateTaskCompletionXp } from '../utils/gamification';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskInput: CreateTaskInput) => void;
  currentDate: string;
  weekDays: DayScheduleMeta[];
  morningOverride: 'auto' | 'morning' | 'afternoon';
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentDate,
  weekDays,
  morningOverride,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(currentDate);
  const [time, setTime] = useState('11:30');
  const [category, setCategory] = useState<TaskCategory>('academic');
  const [subType, setSubType] = useState<TaskSubType>('homework');
  const [priority, setPriority] = useState<'normal' | 'high' | 'exam'>('normal');
  const [subjectId, setSubjectId] = useState<'biologia' | 'fisica' | 'calculo' | ''>('');
  const [location, setLocation] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync date when currentDate prop changes
  useEffect(() => {
    if (isOpen) {
      setDate(currentDate);
      setError(null);
    }
  }, [isOpen, currentDate]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate live XP reward preview based on time / morning bonus
  const [hhStr, mmStr] = time.split(':');
  const simulatedTimeDate = new Date();
  if (hhStr) {
    simulatedTimeDate.setHours(parseInt(hhStr, 10), parseInt(mmStr || '0', 10));
  }
  const xpReward = calculateTaskCompletionXp(simulatedTimeDate, morningOverride);
  const priorityBonus = priority === 'exam' ? 10 : priority === 'high' ? 5 : 0;
  const totalEstimatedXp = xpReward.xp + priorityBonus;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Por favor escribe un nombre para la misión o tarea.');
      return;
    }

    // Format 24h to readable 12h AM/PM
    const hh = parseInt(hhStr || '12', 10);
    const mm = mmStr || '00';
    const period = hh >= 12 ? 'PM' : 'AM';
    const hh12 = hh % 12 === 0 ? 12 : hh % 12;
    const formattedTime = `${String(hh12).padStart(2, '0')}:${mm} ${period}`;

    onSubmit({
      title: cleanTitle,
      subtitle: notes.trim() || undefined,
      date,
      time: formattedTime,
      category,
      subType,
      priority,
      location: location.trim() || undefined,
      durationMinutes: category === 'study' ? durationMinutes : undefined,
      subjectId: subjectId ? subjectId : undefined,
    });

    // Reset fields
    setTitle('');
    setNotes('');
    setLocation('');
    setError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-surface-container-high rounded-2xl p-space-md sm:p-space-lg flex flex-col gap-space-md shadow-2xl border border-white/10 relative my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-container via-secondary-container to-primary flex items-center justify-center text-on-primary shadow-[0_0_16px_rgba(79,70,229,0.4)] shrink-0">
              <span className="material-symbols-outlined text-title-md">
                add_task
              </span>
            </div>
            <div className="flex flex-col">
              <h3
                id="create-task-title"
                className="font-headline-sm text-headline-sm text-on-surface leading-tight"
              >
                Forjar Nueva Misión
              </h3>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Lumina Quest • Agenda Académica
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined text-title-md">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {error && (
            <div className="p-2.5 rounded-xl bg-error-container/30 border border-error/30 text-error flex items-center gap-2 text-body-sm">
              <span className="material-symbols-outlined text-title-md shrink-0">
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {/* 1. Nombre / Título de la Tarea */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Nombre de la Misión / Tarea <span className="text-secondary">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ej. Entregar Informe de Biología, Repaso Cálculo..."
              autoFocus
              className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-md text-body-md border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* 2. Categoría Principal (Gamificación) */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Categoría
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCategory('academic');
                  setSubType('homework');
                }}
                className={`py-2 px-1 rounded-xl font-label-sm text-label-sm flex flex-col items-center justify-center gap-0.5 border transition-all ${
                  category === 'academic'
                    ? 'bg-primary-container/30 border-primary text-primary shadow-[0_0_12px_rgba(79,70,229,0.3)]'
                    : 'bg-surface-container-lowest border-white/5 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="text-base">📚</span>
                <span className="truncate">Académica</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategory('study');
                  setSubType('study');
                }}
                className={`py-2 px-1 rounded-xl font-label-sm text-label-sm flex flex-col items-center justify-center gap-0.5 border transition-all ${
                  category === 'study'
                    ? 'bg-secondary-container/40 border-secondary text-secondary shadow-[0_0_12px_rgba(221,184,255,0.3)]'
                    : 'bg-surface-container-lowest border-white/5 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="text-base">✍️</span>
                <span className="truncate">Estudio / Focus</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategory('health');
                  setSubType('wellness');
                }}
                className={`py-2 px-1 rounded-xl font-label-sm text-label-sm flex flex-col items-center justify-center gap-0.5 border transition-all ${
                  category === 'health'
                    ? 'bg-tertiary-container/40 border-tertiary text-tertiary shadow-[0_0_12px_rgba(78,222,163,0.3)]'
                    : 'bg-surface-container-lowest border-white/5 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="text-base">🔋</span>
                <span className="truncate">Vida &amp; Salud</span>
              </button>
            </div>
          </div>

          {/* 3. Sub-Tipo Específico y Asignatura */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Tipo de Bloque
              </label>
              <select
                value={subType}
                onChange={(e) => setSubType(e.target.value as TaskSubType)}
                className="h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-body-sm text-body-sm border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {category === 'academic' && (
                  <>
                    <option value="homework">✍️ Tarea / Entrega</option>
                    <option value="classes">📚 Clase / Cátedra</option>
                  </>
                )}
                {category === 'study' && (
                  <>
                    <option value="study">🧠 Sesión Pomodoro / Repaso</option>
                  </>
                )}
                {category === 'health' && (
                  <>
                    <option value="wellness">🔋 Vida, Sueño &amp; Hábitos</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Asignatura (Opcional)
              </label>
              <select
                value={subjectId}
                onChange={(e) =>
                  setSubjectId(
                    e.target.value as 'biologia' | 'fisica' | 'calculo' | ''
                  )
                }
                className="h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-body-sm text-body-sm border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">General / Ninguna</option>
                <option value="calculo">Cálculo I</option>
                <option value="fisica">Física II</option>
                <option value="biologia">Biología Celular</option>
              </select>
            </div>
          </div>

          {/* 4. Fecha y Horario */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-body-sm text-body-sm border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Horario
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-body-sm text-body-sm border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Acceso rápido a días de la semana */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <span className="font-label-sm text-[10px] text-outline uppercase shrink-0">
              Día:
            </span>
            {weekDays.slice(0, 5).map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => setDate(d.date)}
                className={`px-2 py-0.5 rounded-lg text-label-sm shrink-0 transition-colors ${
                  date === d.date
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {d.dayShort} {d.dayNumber}
              </button>
            ))}
          </div>

          {/* 5. Prioridad & Ubicación */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Prioridad
              </label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`h-9 rounded-lg text-label-sm font-semibold border transition-all ${
                    priority === 'normal'
                      ? 'bg-surface-container-highest border-outline text-on-surface'
                      : 'bg-surface-container-lowest border-transparent text-outline'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('high')}
                  className={`h-9 rounded-lg text-label-sm font-semibold border transition-all ${
                    priority === 'high'
                      ? 'bg-secondary-container/40 border-secondary text-secondary'
                      : 'bg-surface-container-lowest border-transparent text-outline'
                  }`}
                >
                  Alta
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('exam')}
                  className={`h-9 rounded-lg text-label-sm font-semibold border transition-all ${
                    priority === 'exam'
                      ? 'bg-error-container/40 border-error text-error shadow-[0_0_8px_rgba(255,180,171,0.3)]'
                      : 'bg-surface-container-lowest border-transparent text-outline'
                  }`}
                >
                  Examen
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Ubicación / Plataforma
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Aula 302, Campus..."
                className="h-9 px-3 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-sm text-body-sm border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* 6. Si es categoría estudio: Duración Pomodoro */}
          {category === 'study' && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-lowest border border-white/5">
              <span className="font-body-sm text-body-sm text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-title-md text-primary">
                  timer
                </span>
                Duración Pomodoro:
              </span>
              <div className="flex items-center gap-1.5">
                {[25, 45, 50].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDurationMinutes(min)}
                    className={`px-2.5 py-1 rounded-lg font-label-sm text-label-sm transition-colors ${
                      durationMinutes === min
                        ? 'bg-primary-container text-on-primary-container font-bold'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 7. Notas Adicionales */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Descripción o Instrucciones (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Cargar PDF en Campus Virtual antes de mediodía"
              className="h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-sm text-body-sm border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* 8. Banner de Recompensa Estimada (Gamificación) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-surface-container-lowest to-surface-container-low border border-white/5">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-title-md text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                bolt
              </span>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                  Recompensa Gamificada
                </span>
                <span className="font-body-sm text-[11px] text-on-surface-variant">
                  {xpReward.isBonus
                    ? '1.5x Multiplicador Matutino (< 12 PM)'
                    : 'Puntuación Estándar'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-headline-sm text-headline-sm text-tertiary font-bold">
                +{totalEstimatedXp} XP
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-highest active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary-container via-secondary-container to-primary text-on-primary font-label-md text-label-md font-bold shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-title-md">
                add_task
              </span>
              <span>Forjar Misión</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
