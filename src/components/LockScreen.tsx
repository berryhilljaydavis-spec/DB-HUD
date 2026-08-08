import { useState } from 'react';
import { api } from '../api';

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.login(passcode);
      setPasscode('');
      onUnlock();
    } catch {
      setError('ACCESS DENIED');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="boot">
      <form className="lock" onSubmit={submit}>
        <h1>DB HUD</h1>
        <p>Locked console — enter passcode.</p>
        <input
          type="password"
          aria-label="Passcode"
          autoFocus
          value={passcode}
          onChange={(event) => {
            setPasscode(event.target.value);
            setError(null);
          }}
        />
        <button type="submit" disabled={busy || passcode === ''}>
          {busy ? 'VERIFYING…' : 'UNLOCK'}
        </button>
        {error ? <p className="lock-error">{error}</p> : null}
      </form>
    </div>
  );
}
