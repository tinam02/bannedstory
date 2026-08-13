'use client';
import { Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import useScene from '@/app/context/SceneCtx';
import toolbar from '@/components/molecules/Toolbar/Toolbar.module.scss';
import { useState } from 'react';
import styles from './MapPicker.module.scss';

/** picks which map the Stage stands the character on */
const MapPicker = () => {
  const { mapId, setMapId, maps } = useScene();
  const [open, { toggle, close }] = useDisclosure(false);
  const [query, setQuery] = useState('');

  const current = maps.find(m => m.id === mapId);

  // street as well as name, bc half of these are only findable by their region
  const q = query.trim().toLowerCase();
  const shown = q
    ? maps.filter(
        m => m.name.toLowerCase().includes(q) || m.street.toLowerCase().includes(q),
      )
    : maps;

  const choose = (id: string | null) => {
    setMapId(id);
    setQuery('');
    close();
  };

  return (
    <Popover
      opened={open}
      onChange={close}
      position='bottom-end'
      withinPortal
      classNames={{ dropdown: styles.dropdown }}
    >
      <Popover.Target>
        <button
          className={toolbar.btn}
          onClick={toggle}
          aria-label='Choose map'
        >
          {current?.name ?? 'No map'}
        </button>
      </Popover.Target>
      <Popover.Dropdown>
        <div className={styles.panel}>
          <input
            className={styles.search}
            value={query}
            placeholder='Search'
            onChange={e => setQuery(e.target.value)}
          />

          <div className={styles.list}>
            {/* the reset, and nothing to search for, so it sits out a query */}
            {!q && (
              <button
                className={styles.row}
                data-active={mapId === null ? '' : undefined}
                onClick={() => choose(null)}
              >
                <span className={styles.name}>No map</span>
              </button>
            )}

            {shown.map(m => (
              <button
                key={m.id}
                className={styles.row}
                data-active={m.id === mapId ? '' : undefined}
                onClick={() => choose(m.id)}
              >
                <span className={styles.name}>{m.name}</span>
                <span className={styles.street}>{m.street}</span>
              </button>
            ))}

            {/* the only way this is empty is an empty public/maps */}
            {maps.length === 0 && (
              <div className={styles.empty}>
                No maps yet. Add plates under public/maps then run npm run maps
              </div>
            )}

            {maps.length > 0 && shown.length === 0 && (
              <div className={styles.empty}>No match for “{query}”.</div>
            )}
          </div>
        </div>
      </Popover.Dropdown>
    </Popover>
  );
};

export default MapPicker;
