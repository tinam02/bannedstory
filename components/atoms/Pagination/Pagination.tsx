'use client';
import { Icon } from '../Icon';
import styles from './Pagination.module.scss';

/**
 * Parked
 *  these are the in-game BtGather arrows and they're worth keeping for the next thing that steps through a
 * sequence (frames, poses, saved outfits). Whatever that turns out to be will
 * probably want just the arrow pair without the page-number input
 */
const Pagination = ({
  metadata,
  setPage,
}: {
  metadata: any;
  setPage: (page: number) => void;
}) => {
  return (
    <div className={styles.pagination}>
      <>
        {/* <Icon
            defaultImg='/ui/buttons/end/Item.BtSmall.normal.0.png'
            activeImg='/ui/buttons/end/Item.BtSmall.pressed.0.png'
            onClick={() => setPage(0)}
          /> */}
        <Icon
          defaultImg='/ui/buttons/arrow/Item.BtGather.normal.0.png'
          activeImg='/ui/buttons/arrow/Item.BtGather.pressed.0.png'
          disabledImg={
            typeof metadata.prevPage !== 'number' &&
            '/ui/buttons/arrow/Item.BtGather.disabled.0.png'
          }
          onClick={() => setPage(metadata.prevPage)}
          imgStyle={{ transform: 'rotate(-90deg)' }}
        />
      </>

      <input
        placeholder={metadata.page}
        onBlur={e => setPage(parseInt(e.target.value))}
        type='number'
        className={styles.numberInput}
        style={{ maxWidth: 50 }}
      />

      <Icon
        defaultImg='/ui/buttons/arrow/Item.BtGather.normal.0.png'
        activeImg='/ui/buttons/arrow/Item.BtGather.pressed.0.png'
        disabledImg={
          !metadata.nextPage && '/ui/buttons/arrow/Item.BtGather.disabled.0.png'
        }
        onClick={() => setPage(metadata.nextPage)}
        imgStyle={{ transform: 'rotate(90deg)' }}
      />
    </div>
  );
};

export default Pagination;
