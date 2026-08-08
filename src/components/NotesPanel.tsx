import { useEffect, useRef, useState } from 'react';
import type { DailyNote } from '../../shared/types';

interface NotesPanelProps {
  note: DailyNote;
  onSave: (body: string) => Promise<void>;
}

export function NotesPanel({ note, onSave }: NotesPanelProps) {
  const [body, setBody] = useState(note.body);
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remote = useRef(note.body);

  useEffect(() => {
    if (note.body !== remote.current) {
      remote.current = note.body;
      setBody(note.body);
    }
  }, [note.body]);

  function change(value: string) {
    setBody(value);
    setState('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void onSave(value).then(() => {
        remote.current = value;
        setState('saved');
      });
    }, 700);
  }

  return (
    <div className="notes">
      <textarea
        value={body}
        onChange={(event) => change(event.target.value)}
        placeholder="Daily log — decisions, blockers, wins…"
        aria-label="Daily note"
        spellCheck={false}
      />
      <p className="notes-status">
        {state === 'saving' ? 'SYNCING…' : state === 'saved' ? 'SYNCED' : `LOG ${note.date}`}
      </p>
    </div>
  );
}
