'use client';
import { useState } from 'react';
import { stNumberInput } from '../Pagination/pagination.css';

const Search = ({
  setNameText,
  setPage,
}: {
  setNameText: (q: string) => void;
  setPage: (page: number) => void;
}) => {
  return (
    <div>
      <input
        onBlur={e => {
          setNameText(e.target.value);
          setPage(0);
        }}
        type='text'
       className={stNumberInput}
        placeholder='Search Items'
      />
    </div>
  );
};

export default Search;

const Icon = ({ defaultImg, activeImg, onClick, imgStyle }: any) => {
  const [isActive, setIsActive] = useState(false);

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
        src={isActive ? activeImg : defaultImg}
        alt='Arrow button'
        style={imgStyle}
      />
    </button>
  );
};
