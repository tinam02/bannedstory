'use client';

import useChar from '@/app/context/CharCtx';
import { outfitFilename } from '@/lib/outfit';
import styles from '@/components/molecules/Toolbar/Toolbar.module.scss';

const ExportButton = () => {
  const { outfit } = useChar();

  function exportToJson() {
    // State is already the interchange format, so there is nothing to convert.
    const now = Date.now();
    const blob = new Blob([JSON.stringify({ ...outfit, id: now }, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = outfitFilename(now);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      className={styles.btn}
      onClick={exportToJson}
      aria-label='Export outfit as JSON'
      title='Export outfit as JSON'
    >
      EXPORT
    </button>
  );
};

export default ExportButton;
