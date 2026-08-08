import { useState } from 'react';
import type { Task } from '../../shared/types';

interface TasksPanelProps {
  tasks: Task[];
  onAdd: (title: string) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TasksPanel({ tasks, onAdd, onToggle, onDelete }: TasksPanelProps) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await onAdd(title);
      setDraft('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tasks">
      <form className="task-form" onSubmit={submit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add objective…"
          aria-label="New task"
        />
        <button type="submit" disabled={busy || draft.trim() === ''}>
          +
        </button>
      </form>
      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} className={task.done ? 'task done' : 'task'}>
            <button
              type="button"
              className="task-check"
              onClick={() => void onToggle(task.id)}
              aria-label={task.done ? `Reopen ${task.title}` : `Complete ${task.title}`}
            >
              {task.done ? '×' : ''}
            </button>
            <span className="task-title">{task.title}</span>
            <span className={`task-tag ${task.priority}`}>{task.priority}</span>
            <span className="task-source">{task.source}</span>
            <button
              type="button"
              className="task-delete"
              onClick={() => void onDelete(task.id)}
              aria-label={`Delete ${task.title}`}
            >
              ⌫
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
