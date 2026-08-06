'use client';
import useScene from '@/app/context/SceneCtx';
import styles from '@/components/molecules/Toolbar/Toolbar.module.scss';

/**
 * Swaps the character between the maplestory.io png and our own wz stacking.
 *
 * Temporary, for the migration. The wz side still draws the one character the
 * spike dumped rather than the closet's, so this is for comparing renderers
 */
const WzAvatarToggle = () => {
  const { wzAvatar, setWzAvatar } = useScene();

  return (
    <button
      className={styles.btn}
      data-active={wzAvatar ? '' : undefined}
      onClick={() => setWzAvatar(!wzAvatar)}
      aria-label='Character renderer'
      title={
        wzAvatar
          ? 'Drawing from wz layers. Click for the maplestory.io render'
          : 'Drawing from maplestory.io. Click for the wz layers'
      }
    >
      {wzAvatar ? 'WZ' : 'API'}
    </button>
  );
};

export default WzAvatarToggle;
