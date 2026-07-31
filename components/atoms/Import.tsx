'use client';

import { useRef, useState } from 'react';
import { style } from 'typestyle';
import useChar from '@/app/context/CharCtx';
import { parseOutfit } from '@/lib/outfit';
import { toolbarBtn } from '@/components/molecules/Toolbar/toolbar.css';

const ImportButton = () => {
  const { setOutfit } = useChar();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function onFile(file: File) {
    try {
      const { outfit, warnings } = parseOutfit(
        JSON.parse(await file.text()),
        Date.now(),
      );
      setOutfit(outfit);
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
        className={toolbarBtn}
        onClick={() => inputRef.current?.click()}
        aria-label='Import outfit from JSON'
        title='Import an outfit JSON'
      >
        IMPORT
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
          className={toast}
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

const toast = style({
  position: 'fixed',
  top: 78,
  right: 12,
  maxWidth: 260,
  padding: '6px 10px',
  borderRadius: 8,
  background: 'rgba(0, 0, 0, 0.8)',
  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.35)',
  color: '#ffe39a',
  fontSize: 11,
  lineHeight: 1.4,
  cursor: 'pointer',
  $nest: {
    '&[data-failed]': {
      color: '#ff9a9a',
    },
  },
});
