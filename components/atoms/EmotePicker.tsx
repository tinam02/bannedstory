'use client';
import useChar from '@/app/context/CharCtx';
import { EMOTES, emoteLabel, emotePreviewOutfit } from '@/lib/emotes';
import AvatarCanvas from './AvatarCanvas';
import { Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import styles from './EmotePicker.module.scss';

const EmotePicker = () => {
  const { outfit, emotion, setEmotion } = useChar();
  const [opened, { toggle, close }] = useDisclosure(false);

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
            aria-label='Expression'
            title={`Expression: ${emoteLabel(emotion)}`}
          >
            <AvatarCanvas
              className={styles.triggerImg}
              who={emotePreviewOutfit(outfit, emotion)}
            />
            <span>{emoteLabel(emotion)}</span>
          </button>
        </Popover.Target>
        <Popover.Dropdown>
          <div className={styles.grid}>
            {EMOTES.map(emote => (
              <button
                key={emote}
                className={styles.swatchBtn}
                data-active={emote === emotion ? '' : undefined}
                onClick={() => {
                  setEmotion(emote);
                  close();
                }}
                title={emoteLabel(emote)}
              >
                <AvatarCanvas
                  className={styles.swatchImg}
                  who={emotePreviewOutfit(outfit, emote)}
                />
                <span className={styles.swatchLabel}>{emoteLabel(emote)}</span>
              </button>
            ))}
          </div>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
};

export default EmotePicker;
