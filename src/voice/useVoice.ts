import { useCallback, useEffect, useRef, useState } from 'react';
import { createRecognition, speechSupported, type SpeechRecognitionLike } from './speech';

export interface VoiceState {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: string | null;
}

interface UseVoiceOptions {
  /** Called with a final utterance once the speaker pauses. */
  onUtterance: (text: string) => void;
}

export function useVoice({ onUtterance }: UseVoiceOptions) {
  const supported = speechSupported();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const wantListening = useRef(false);
  const handler = useRef(onUtterance);
  handler.current = onUtterance;

  useEffect(() => {
    if (!supported) return;
    const instance = createRecognition();
    if (!instance) return;
    recognition.current = instance;

    instance.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          setTranscript(text.trim());
          handler.current(text);
        } else {
          interim += text;
        }
      }
      if (interim) setTranscript(interim.trim());
    };

    instance.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(
        event.error === 'not-allowed'
          ? 'Microphone permission denied — allow mic access to use voice.'
          : `Voice error: ${event.error}`,
      );
      wantListening.current = false;
      setListening(false);
    };

    // Chrome ends recognition every ~60s; restart while the user wants it on.
    instance.onend = () => {
      if (wantListening.current) {
        try {
          instance.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    return () => {
      wantListening.current = false;
      instance.onend = null;
      instance.abort();
      recognition.current = null;
    };
  }, [supported]);

  const start = useCallback(() => {
    const instance = recognition.current;
    if (!instance) return;
    setError(null);
    wantListening.current = true;
    try {
      instance.start();
      setListening(true);
    } catch {
      // start() throws if already running — already listening, nothing to do.
      setListening(true);
    }
  }, []);

  const stop = useCallback(() => {
    wantListening.current = false;
    recognition.current?.stop();
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (wantListening.current) stop();
    else start();
  }, [start, stop]);

  return {
    state: { supported, listening, transcript, error } satisfies VoiceState,
    start,
    stop,
    toggle,
    clearTranscript: () => setTranscript(''),
  };
}
