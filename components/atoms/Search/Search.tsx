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
