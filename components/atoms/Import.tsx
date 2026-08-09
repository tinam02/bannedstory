'use client';

import { useRef, useState } from 'react';
import useChar, { MAX_CHARS } from '@/app/context/CharCtx';
import { parseOutfit } from '@/lib/outfit';
import styles from '@/components/molecules/Toolbar/Toolbar.module.scss';

const ImportButton = () => {
  const { importChar } = useChar();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function onFile(file: File) {
    try {
      const { outfit, warnings } = parseOutfit(
        JSON.parse(await file.text()),
        Date.now(),
      );
      // new character
      if (!importChar(outfit)) {
        setFailed(true);
        setMessage(
          `The cast is full at ${MAX_CHARS}: remove one before importing.`,
        );
        return;
      }
      setFailed(false);
      setMessage(warnings.length ? warnings.join(' ') : null);
    } catch (err) {
      setFailed(true);
      setMessage(
        err instanceof SyntaxError
          ? "That file isn't valid JSON."
          : (err as Error).message,
      );
    }
  }

  return (
    <>
      <button
        className={styles.btn}
        onClick={() => inputRef.current?.click()}
        aria-label='Import outfit from JSON'
      >
        Import
      </button>
      <input
        ref={inputRef}
        type='file'
        accept='application/json,.json'
        hidden
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          // Reset so picking the same file twice still fires a change.
          e.target.value = '';
        }}
      />
      {message && (
        <div
          className={styles.toast}
          data-failed={failed ? '' : undefined}
          role='status'
          onClick={() => setMessage(null)}
          title='Dismiss'
        >
          {message}
        </div>
      )}
    </>
  );
};

export default ImportButton;
