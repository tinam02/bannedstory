'use client';
import useChar, { MAX_CHARS } from '@/app/context/CharCtx';
import { downloadOutfit, parseOutfit } from '@/lib/outfit';
import AvatarCanvas from './AvatarCanvas';
import toolbar from '@/components/molecules/Toolbar/Toolbar.module.scss';
import { Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useRef, useState } from 'react';
import styles from './CharRoster.module.scss';

/**
 * down for save and up for load
 */
const TrayArrow = ({ up }: { up?: boolean }) => (
  <svg
    width='12'
    height='12'
    viewBox='0 0 16 16'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.8'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    {up ? (
      <>
        <path d='M8 11V2' />
        <path d='M4.5 5.5 8 2l3.5 3.5' />
      </>
    ) : (
      <>
        <path d='M8 2v9' />
        <path d='M4.5 7.5 8 11l3.5-3.5' />
      </>
    )}
    <path d='M3 13.5h10' />
  </svg>
);

/**
 * The cast list. Add, import, copy, export, rename, remove, and pick who the
 * closet points at
 */
const CharRoster = () => {
  const {
    chars,
    activeId,
    setActiveId,
    addChar,
    duplicateChar,
    removeChar,
    renameChar,
    importChar,
    focusChar,
  } = useChar();
  const [open, { toggle, close }] = useDisclosure(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // whatever the last import had to say, shown in the panel rather than as a
  // toast, bc a toast would land on top of this dropdown
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const full = chars.length >= MAX_CHARS;

  async function onFile(file: File) {
    try {
      const { outfit, warnings } = parseOutfit(
        JSON.parse(await file.text()),
        Date.now(),
      );
      if (!importChar(outfit)) {
        setFailed(true);
        setNote(
          `The cast is full at ${MAX_CHARS}: remove one before importing.`,
        );
        return;
      }
      setFailed(false);
      setNote(warnings.length ? warnings.join(' ') : null);
    } catch (err) {
      setFailed(true);
      setNote(
        err instanceof SyntaxError
          ? "That file isn't valid JSON."
          : (err as Error).message,
      );
    }
  }

  return (
    <Popover
      opened={open}
      onChange={close}
      position='bottom-end'
      withinPortal
      classNames={{ dropdown: styles.dropdown }}
    >
      <Popover.Target>
        <button
          className={toolbar.btn}
          onClick={toggle}
          aria-label='Characters'
        >
          Chars {chars.length > 1 ? `(${chars.length})` : ''}
        </button>
      </Popover.Target>
      <Popover.Dropdown>
        <div className={styles.list}>
          {chars.map((c, i) => (
            <div
              key={c.id}
              className={styles.row}
              data-active={c.id === activeId ? '' : undefined}
            >
              <button
                className={styles.face}
                onClick={() => focusChar(c.id)}
                title='Select and focus'
              >
                <AvatarCanvas who={c} />
              </button>

              <input
                className={styles.name}
                value={c.name}
                placeholder={`Character ${i + 1}`}
                onChange={e => renameChar(c.id, e.target.value)}
                onFocus={() => setActiveId(c.id)}
              />

              <button
                className={styles.act}
                onClick={() => downloadOutfit(c, Date.now())}
                title='Export as JSON'
                aria-label={`Export ${c.name || `character ${i + 1}`} as JSON`}
              >
                <TrayArrow />
              </button>
              <button
                className={styles.act}
                onClick={() => duplicateChar(c.id)}
                disabled={full}
                title={full ? `${MAX_CHARS} is the limit` : 'Duplicate'}
              >
                ⧉
              </button>
              <button
                className={styles.act}
                onClick={() => removeChar(c.id)}
                // removing the last one just resets it
                title={chars.length === 1 ? 'Reset this character' : 'Remove'}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          className={styles.add}
          onClick={addChar}
          disabled={full}
          title={full ? `${MAX_CHARS} is the limit` : 'Add a character'}
        >
          {full ? `Limit is ${MAX_CHARS}` : '+ Add character'}
        </button>

        <button
          className={styles.add}
          onClick={() => fileRef.current?.click()}
          disabled={full}
          title={full ? `${MAX_CHARS} is the limit` : undefined}
        >
          <TrayArrow up />
          Import outfit JSON
        </button>
        <input
          ref={fileRef}
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

        {note && (
          <div
            className={styles.note}
            data-failed={failed ? '' : undefined}
            role='status'
            onClick={() => setNote(null)}
            title='Dismiss'
          >
            {note}
          </div>
        )}
      </Popover.Dropdown>
    </Popover>
  );
};

export default CharRoster;
