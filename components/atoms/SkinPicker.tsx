'use client';
import useChar from '@/app/context/CharCtx';
import { SKIN_IDS, skinLabel, skinSwatchUrl } from '@/lib/skins';
import { Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import styles from './SkinPicker.module.scss';

const SkinPicker = () => {
  const { skinId, setSkinId } = useChar();
  const [opened, { toggle, close }] = useDisclosure(false);
  const currentLabel = skinLabel(skinId);
  return (
    <div className={styles.picker}>
      <Popover
        opened={opened}
        onChange={close}
        position='bottom-end'
        offset={6}
        classNames={{ dropdown: styles.dropdown }}
      >
        <Popover.Target>
          <button
            className={styles.triggerBtn}
            onClick={toggle}
            aria-label='Skin tone'
            title={`${currentLabel} (${skinId})`}
          >
            <img
              src={skinSwatchUrl(skinId)}
              alt=''
              className={styles.triggerImg}
            />
            <span>{currentLabel.toUpperCase()}</span>
          </button>
        </Popover.Target>
        <Popover.Dropdown>
          <div className={styles.grid}>
            {SKIN_IDS.map(id => {
              const label = skinLabel(id);
              return (
                <button
                  key={id}
                  className={styles.swatchBtn}
                  data-active={id === skinId ? '' : undefined}
                  onClick={() => {
                    setSkinId(id);
                    close();
                  }}
                  title={`${label} (${id})`}
                >
                  <img
                    src={skinSwatchUrl(id)}
                    alt=''
                    loading='lazy'
                    className={styles.swatchImg}
                  />
                  <span className={styles.swatchLabel}>{label}</span>
                </button>
              );
            })}
          </div>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
};

export default SkinPicker;
