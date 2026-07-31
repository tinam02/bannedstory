'use client';

import useChar from '@/app/context/CharCtx';
import { buildOutfit, outfitFilename } from '@/lib/outfit';
import { loadSavedBody } from '@/lib/utils';
import { style } from 'typestyle';

const ExportButton = () => {
  const { selectedItems, skinId, zoom } = useChar();

  function exportToJson() {
    const now = Date.now();
    const outfit = buildOutfit({
      selectedItems,
      skinId,
      zoom,
      // Pose / emote / ears live on the saved body, not in context.
      body: loadSavedBody(),
      now,
    });

    const blob = new Blob([JSON.stringify(outfit, null, 2)], {
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
      className={btn}
      onClick={exportToJson}
      aria-label='Export outfit as JSON'
      title='Export outfit as JSON'
    >
      EXPORT
    </button>
  );
};

export default ExportButton;

const btn = style({
  position: 'fixed',
  top: 12,
  right: 225,
  zIndex: 10,
  padding: '3px 10px',
  height: 22,
  border: 0,
  borderRadius: 8,
  background: 'rgba(0, 0, 0, 0.55)',
  boxShadow:
    'inset 0 0 0 1px #eee, inset 0 0 0 2px rgba(8, 8, 8, 0.76), inset 0 0 2px 3px rgba(252, 252, 252, 0.36)',
  color: '#ffe39a',
  fontSize: 11,
  fontFamily: 'inherit',
  fontWeight: 'bold',
  cursor: 'pointer',
  textShadow: '0 0 2px rgba(0, 0, 0, 0.9), 0 0 1px rgba(0, 0, 0, 0.9)',
  userSelect: 'none',
  $nest: {
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.12)',
    },
  },
});
