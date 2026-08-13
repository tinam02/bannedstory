'use client';
import useChar from '@/app/context/CharCtx';
import { POSE_GROUPS, Pose, poseLabel, posePreviewOutfit, samePose } from '@/lib/poses';
import AvatarCanvas from './AvatarCanvas';
import toolbar from '@/components/molecules/Toolbar/Toolbar.module.scss';
import { Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import styles from './PosePicker.module.scss';

/** Which stance the selected character stands in. Writes `outfit.action` */
const PosePicker = () => {
  const { outfit, setOutfit } = useChar();
  const [opened, { toggle, close }] = useDisclosure(false);

  // carry is written on every pick, not only by the standing row, so choosing
  // any other pose drops back to the weapon's own carry rather than quietly
  // keeping a gun hold that the cell you clicked says nothing about
  const choose = (pose: Pose) => {
    setOutfit(prev => ({ ...prev, action: pose.stance, carry: pose.carry }));
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
        >
          {poseLabel(outfit.action, outfit.carry)}
        </button>
      </Popover.Target>
      <Popover.Dropdown>
        {POSE_GROUPS.map(group => (
          <div key={group.name} className={styles.group}>
            <p className={styles.heading}>{group.name}</p>
            <div className={styles.grid}>
              {group.poses.map(pose => (
                <button
                  key={`${pose.stance}-${pose.carry ?? ''}`}
                  className={styles.cell}
                  data-active={
                    samePose(pose, outfit.action, outfit.carry) ? '' : undefined
                  }
                  data-stance={pose.stance}
                  title={
                    pose.carry
                      ? `${pose.label}  (${pose.stance}, weapon type ${pose.carry})`
                      : `${pose.label}  (${pose.stance})`
                  }
                  onClick={() => choose(pose)}
                >
                  <AvatarCanvas
                    className={styles.shot}
                    effects={false}
                    who={posePreviewOutfit(outfit, pose)}
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
