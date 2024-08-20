import React, { useEffect, useState } from 'react';

const DebouncedInput = ({
  onDebouncedChange,
  waitMs = 1000,
}: {
  onDebouncedChange: any;
  waitMs?: number;
}) => {
  const [value, setValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, waitMs);

    // Cleanup the timeout if value changes or component unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, waitMs]);

  useEffect(() => {
    if (onDebouncedChange) {
      onDebouncedChange(debouncedValue);
    }
  }, [debouncedValue, onDebouncedChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  return (
    <input
      type='text'
      value={value}
      onChange={handleChange}
      placeholder='Type something...'
    />
  );
};

export default DebouncedInput;
