'use client';
import useScene, { Caption } from '@/app/context/SceneCtx';
import CaptionPreview from '@/components/molecules/Stage/CaptionPreview';
import useUiSprites, { UiSetName } from '@/components/molecules/Stage/useUiSprites';
import { CaptionKind } from '@/components/molecules/Stage/captionDraw';
import toolbar from '@/components/molecules/Toolbar/Toolbar.module.scss';
import { Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import styles from './CaptionPicker.module.scss';

/**
 * Speech balloons and name tags, behind one toolbar button.
 *
 * Kept out of the main toolbar row on purpose: most people are here to dress a
 * character up, and this is a side room for the ones who aren't.
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
  // only mounted once its tab is open, so the manifest isn't fetched until then
  const sprites = useUiSprites(set);
  const entries = sprites ? Object.entries(sprites.styles) : [];

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
          // turning it on the moment there's something to show saves a click,
          // and typing here is unambiguous about wanting to see it
          onChange={e => onChange({ text: e.target.value, on: true })}
        />
      </div>

      <div className={styles.grid}>
        {entries.map(([id, style]) => (
          <button
            key={id}
            className={styles.cell}
            data-active={id === value.style ? '' : undefined}
            // the wz id, on the element rather than only in the tooltip, so it
            // reads straight off the dom when inspecting
            data-style={id}
            title={`${label} ${id}`}
            onClick={() => onChange({ style: id, on: true })}
          >
            <CaptionPreview set={set} kind={kind} style={style} />
          </button>
        ))}

        {sprites && entries.length === 0 && (
          <div className={styles.empty}>
            Nothing in public/ui/{set}. Run the lua dump in scripts/wz.
          </div>
        )}
      </div>
    </>
  );
};

const CaptionPicker = () => {
  const { speech, setSpeech, nametag, setNametag } = useScene();
  const [open, { toggle, close }] = useDisclosure(false);
  const [tab, setTab] = useState<CaptionKind>('balloon');

  const active = TABS.find(t => t.key === tab) ?? TABS[0];

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
          // lit while either one is on, so it's obvious where a caption on the
          // stage came from without opening the panel
          data-active={speech.on || nametag.on ? '' : undefined}
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

        {/* keyed so switching tabs remounts, rather than one panel trying to
            reuse the other's scroll position and lazily loaded previews */}
        <CaptionPanel
          key={active.key}
          kind={active.key}
          set={active.set}
          label={active.label}
          placeholder={active.placeholder}
          value={active.key === 'balloon' ? speech : nametag}
          onChange={active.key === 'balloon' ? setSpeech : setNametag}
        />
      </Popover.Dropdown>
    </Popover>
  );
};

export default CaptionPicker;
