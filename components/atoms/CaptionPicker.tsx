'use client';
import useChar from '@/app/context/CharCtx';
import { Caption } from '@/types';
import CaptionPreview from '@/components/molecules/Stage/CaptionPreview';
import useUiSprites, {
  useCaptionNames,
  UiSetName,
} from '@/components/molecules/Stage/useUiSprites';
import { CaptionKind } from '@/components/molecules/Stage/captionDraw';
import toolbar from '@/components/molecules/Toolbar/Toolbar.module.scss';
import { Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import styles from './CaptionPicker.module.scss';

/**
 * Speech balloons and name tags, behind one toolbar button.
 *
 * Tucked behind a button rather than sat in the toolbar bc its less important
 */

const TABS: {
  key: CaptionKind;
  set: UiSetName;
  label: string;
  placeholder: string;
}[] = [
  { key: 'balloon', set: 'balloons', label: 'Balloon', placeholder: 'Say something' },
  { key: 'tag', set: 'nametags', label: 'Name tag', placeholder: 'Name' },
];

const CaptionPanel = ({
  kind,
  set,
  label,
  placeholder,
  value,
  onChange,
}: {
  kind: CaptionKind;
  set: UiSetName;
  label: string;
  placeholder: string;
  value: Caption;
  onChange: (patch: Partial<Caption>) => void;
}) => {
  // only mounted while its tab is open, so the manifest waits until then
  const sprites = useUiSprites(set);
  const names = useCaptionNames(set);
  const [query, setQuery] = useState('');

  const all = sprites ? Object.entries(sprites.styles) : [];
  const q = query.trim().toLowerCase();
  const entries = q
    ? all.filter(([id]) => id.includes(q) || names[id]?.toLowerCase().includes(q))
    : all;

  return (
    <>
      <div className={styles.controls}>
        <button
          className={styles.toggle}
          data-active={value.on ? '' : undefined}
          onClick={() => onChange({ on: !value.on })}
        >
          {value.on ? 'Shown' : 'Hidden'}
        </button>
        <input
          className={styles.input}
          value={value.text}
          placeholder={placeholder}
          onChange={e => onChange({ text: e.target.value, on: true })}
        />
      </div>

      <input
        className={styles.search}
        value={query}
        placeholder={
          sprites ? `Search` : 'Loading...'
        }
        onChange={e => setQuery(e.target.value)}
      />

      <div className={styles.grid}>
        {entries.map(([id, style]) => (
          <button
            key={id}
            className={styles.cell}
            data-active={id === value.style ? '' : undefined}
            data-style={id}
            // the styles carry no names of their own, these come from the ring
            // that grants them, so plenty have none
            title={names[id] ? `${names[id]}  (${id})` : `${label} ${id}`}
            onClick={() => onChange({ style: id, on: true })}
          >
            <CaptionPreview set={set} kind={kind} style={style} />
          </button>
        ))}

        {sprites && all.length === 0 && (
          <div className={styles.empty}>
            Nothing in public/ui/{set}. Run the lua dump in scripts/wz.
          </div>
        )}

        {sprites && all.length > 0 && entries.length === 0 && (
          <div className={styles.empty}>No style matches “{query}”.</div>
        )}
      </div>
    </>
  );
};

// always the selected character, so picking someone else on the stage points this panel at them too
const CaptionPicker = () => {
  const { activeId, captionsOf, setCaption } = useChar();
  const [open, { toggle, close }] = useDisclosure(false);
  const [tab, setTab] = useState<CaptionKind>('balloon');

  const active = TABS.find(t => t.key === tab) ?? TABS[0];
  const mine = captionsOf(activeId);
  const which = active.key === 'balloon' ? 'speech' : 'nametag';

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
          // lit while the selected character has one showing
          data-active={mine.speech.on || mine.nametag.on ? '' : undefined}
          onClick={toggle}
          aria-label='Speech balloon and name tag'
        >
          Speech
        </button>
      </Popover.Target>
      <Popover.Dropdown>
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={styles.tab}
              data-active={t.key === tab ? '' : undefined}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* keyed on the tab and the character, so switching either remounts
            rather than inheriting the other's scroll and loaded previews */}
        <CaptionPanel
          key={`${active.key}-${activeId}`}
          kind={active.key}
          set={active.set}
          label={active.label}
          placeholder={active.placeholder}
          value={mine[which]}
          onChange={patch => setCaption(activeId, which, patch)}
        />
      </Popover.Dropdown>
    </Popover>
  );
};

export default CaptionPicker;
