'use client';
import { useState } from 'react';

const Pagination = ({
  metadata,
  setPage,
}: {
  metadata: any;
  setPage: (page: number) => void;
}) => {
  return (
    <>
      {metadata.prevPage && (
        <button onClick={() => setPage(metadata.prevPage)}>Prev</button>
      )}
      <p>{metadata.page}</p>
      {metadata.nextPage && (
        <button onClick={() => setPage(metadata.nextPage)}>Next</button>
      )}
    </>
  );
};

export default Pagination;
