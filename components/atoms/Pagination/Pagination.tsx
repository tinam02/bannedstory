'use client';
import { useState } from 'react';
import { stNumberInput, stPagination } from './pagination.css';

const Pagination = ({
  metadata,
  setPage,
}: {
  metadata: any;
  setPage: (page: number) => void;
}) => {
  console.log(metadata);
  return (
    <div className={stPagination}>
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
        className={stNumberInput}
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

const Icon = ({
  defaultImg,
  activeImg,
  disabledImg,
  onClick,
  imgStyle,
}: any) => {
  const [isActive, setIsActive] = useState(false);
  console.log('disabledImg', disabledImg, !!disabledImg);
  return (
    <button
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onMouseLeave={() => setIsActive(false)}
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'contents',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={disabledImg || (isActive ? activeImg : defaultImg)}
        alt='Arrow button'
        style={imgStyle}
      />
    </button>
  );
};
