'use client';
import { useState } from 'react';
import { stArrow, stNumberInput, stPagination } from './pagination.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

const Pagination = ({
  metadata,
  setPage,
}: {
  metadata: any;
  setPage: (page: number) => void;
}) => {
  return (
    <div className={stPagination}>
      {metadata.prevPage ? (
        <FontAwesomeIcon
          onClick={() => setPage(metadata.prevPage)}
          icon={faChevronLeft}
          size='2x'
          className={stArrow}
        />
      ) : (
        ''
      )}
      <input
        placeholder={metadata.page}
        onChange={e => setPage(parseInt(e.target.value))}
        type='number'
        className={stNumberInput}
      />
      {metadata.nextPage && (
        <FontAwesomeIcon
          onClick={() => setPage(metadata.nextPage)}
          icon={faChevronRight}
          size='2x'
          className={stArrow}
        />
      )}
    </div>
  );
};

export default Pagination;
