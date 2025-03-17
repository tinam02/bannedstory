'use client';

import { IChar } from '@/types';

const ExportBtn = () => {
  function exportToJson() {
    const charData = localStorage.getItem('char') || '[]';
    const equipData = localStorage.getItem('equippedItems') || '[]';

    if (!charData && !equipData) return;
    try {
      const char: IChar = JSON.parse(charData);
      const equippedItems = JSON.parse(equipData);

      const exportData = { char, equippedItems };

      const filename = 'export.json';
      const contentType = 'application/json;charset=utf-8;';
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: contentType,
      });

      // trigger download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.log('Error exporting JSON', e);
    }
  }

  return (
    <div>
      <button onClick={exportToJson}>Export json</button>
    </div>
  );
};

export default ExportBtn;
