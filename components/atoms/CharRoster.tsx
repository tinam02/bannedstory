'use client';
import useChar, { MAX_CHARS } from '@/app/context/CharCtx';
import { characterRenderUrl } from '@/lib/fetch';
import toolbar from '@/components/molecules/Toolbar/Toolbar.module.scss';
import { Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import styles from './CharRoster.module.scss';

/**
 * The cast list. Add, copy, rename, remove, and pick who the closet points at
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
  } = useChar();
  const [open, { toggle, close }] = useDisclosure(false);

  const full = chars.length >= MAX_CHARS;

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
          title='Add and switch characters'
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
                onClick={() => setActiveId(c.id)}
                title='Select'
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={characterRenderUrl(c)} alt='' draggable={false} />
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
      </Popover.Dropdown>
    </Popover>
  );
};

export default CharRoster;
