'use client';
import useChar from '@/app/context/CharCtx';
import { POSE_GROUPS, poseLabel, posePreviewUrl } from '@/lib/poses';
import toolbar from '@/components/molecules/Toolbar/Toolbar.module.scss';
import { Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import styles from './PosePicker.module.scss';

/** Which stance the selected character stands in. Writes `outfit.action` */
const PosePicker = () => {
  const { outfit, setOutfit } = useChar();
  const [opened, { toggle, close }] = useDisclosure(false);

  const choose = (stance: string) => {
    setOutfit(prev => ({ ...prev, action: stance }));
    close();
  };

  return (
    <Popover
      opened={opened}
      onChange={close}
      position='bottom-end'
      offset={6}
      withinPortal
      classNames={{ dropdown: styles.dropdown }}
    >
      <Popover.Target>
        <button
          className={toolbar.btn}
          onClick={toggle}
          aria-label='Pose'
          title={`Pose: ${poseLabel(outfit.action)}`}
        >
          {poseLabel(outfit.action)}
        </button>
      </Popover.Target>
      <Popover.Dropdown>
        {POSE_GROUPS.map(group => (
          <div key={group.name} className={styles.group}>
            <p className={styles.heading}>{group.name}</p>
            <div className={styles.grid}>
              {group.poses.map(pose => (
                <button
                  key={pose.stance}
                  className={styles.cell}
                  data-active={pose.stance === outfit.action ? '' : undefined}
                  data-stance={pose.stance}
                  title={`${pose.label}  (${pose.stance})`}
                  onClick={() => choose(pose.stance)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.shot}
                    src={posePreviewUrl(outfit, pose.stance)}
                    alt=''
                    loading='lazy'
                    draggable={false}
                  />
                  <span className={styles.label}>{pose.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </Popover.Dropdown>
    </Popover>
  );
};

export default PosePicker;
