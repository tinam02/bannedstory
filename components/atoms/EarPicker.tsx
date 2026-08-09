'use client';
import AvatarCanvas from './AvatarCanvas';
import useChar from '@/app/context/CharCtx';
import { EAR_KINDS, earLabel, earOf, earSwatchOutfit, withEars } from '@/lib/ears';
import { Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import styles from './EarPicker.module.scss';

const EarPicker = () => {
  const { outfit, setOutfit } = useChar();
  const [opened, { toggle, close }] = useDisclosure(false);
  const current = earOf(outfit);

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
            aria-label='Ears'
          >
            <AvatarCanvas
              className={styles.triggerImg}
              effects={false}
              who={earSwatchOutfit(outfit, current)}
            />
            <span>EARS</span>
          </button>
        </Popover.Target>
        <Popover.Dropdown>
          <div className={styles.grid}>
            {EAR_KINDS.map(({ kind, label }) => (
              <button
                key={kind}
                className={styles.swatchBtn}
                data-active={kind === current ? '' : undefined}
                onClick={() => {
                  setOutfit(prev => withEars(prev, kind));
                  close();
                }}
                title={`${label} ears`}
              >
                <AvatarCanvas
                  className={styles.swatchImg}
                  effects={false}
                  who={earSwatchOutfit(outfit, kind)}
                />
                <span className={styles.swatchLabel}>{label}</span>
              </button>
            ))}
          </div>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
};

export default EarPicker;
