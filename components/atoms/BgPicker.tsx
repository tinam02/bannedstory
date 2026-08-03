'use client';
import { ColorPicker, Popover } from '@mantine/core';
import useScene, { DEFAULT_BG } from '@/app/context/SceneCtx';
import styles from '@/components/molecules/Toolbar/Toolbar.module.scss';

// starting palette
const SWATCHES = [
  DEFAULT_BG,
  '#000000',
  '#3c3c46',
  '#6b7a8f',
  '#9fb4c7',
  '#cfd8e3',
  '#ffffff',
];

/** Sets the colour of whatever the map doesn't cover. */
const BgPicker = () => {
  const { bg, setBg } = useScene();

  return (
    <Popover position='bottom-end' withinPortal shadow='md'>
      <Popover.Target>
        <button
          className={`${styles.btn}`}
          title='Backdrop colour'
          aria-label='Background colour'
        >
          <span className={styles.swatch} style={{ background: bg }} />
        </button>
      </Popover.Target>
      <Popover.Dropdown>
        <ColorPicker
          format='hex'
          value={bg}
          onChange={setBg}
          swatches={SWATCHES}
        />
      </Popover.Dropdown>
    </Popover>
  );
};

export default BgPicker;
