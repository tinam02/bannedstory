'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AvatarHandle } from './AvatarCanvas';
import {
  canvasToBlob,
  copyToClipboard,
  save,
  snapshotFilename,
} from '@/lib/snapshot';
import styles from './AvatarMenu.module.scss';

/**
 * What right clicking the character offers.
 *
 * A canvas gets no "save image as" from the browser, that is an <img> only, so
 * someone who right clicks an avatar gets the plain page menu and concludes
 * the site cannot do it. This is that menu, put back.
 */

/** big enough to be worth having, small enough to not be a surprise download */
const SCALE = 4;

type Job = 'png' | 'webp' | 'apng' | 'gif' | 'copy' | null;

/**
 * What the soft pixels of a gif sit on.
 *
 * gif alpha is one bit, so there is no third answer. A colour keeps the glows
 * smooth and bakes in a background; transparent keeps the cut-out and steps
 * the edges. Which one is right depends entirely on where it is going
 */
const BACKGROUNDS: [label: string, value: string | null][] = [
  ['None', null],
  ['White', '#ffffff'],
  ['Black', '#000000'],
];

const AvatarMenu = ({
  at,
  target,
  onClose,
}: {
  at: { x: number; y: number };
  target: React.RefObject<AvatarHandle | null>;
  onClose: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<Job>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pos, setPos] = useState(at);
  const [bg, setBg] = useState<string | null>(null);

  // dismiss on anything that is not this menu
  useEffect(() => {
    const away = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    // capture, or the pointerdown that opened it can close it again
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', key);
    window.addEventListener('blur', onClose);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', away, true);
      document.removeEventListener('keydown', key);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  // keep it on screen. opening near the right edge would otherwise put half of
  // it past the fold with no way to read it
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: Math.max(4, Math.min(at.x, window.innerWidth - r.width - 4)),
      y: Math.max(4, Math.min(at.y, window.innerHeight - r.height - 4)),
    });
  }, [at.x, at.y]);

  const run = async (job: Exclude<Job, null>) => {
    if (busy) return;
    const handle = target.current;
    // never fail quietly. a menu item that returns without a word is
    // indistinguishable from one that is not wired up at all
    if (!handle) {
      setErr('the character is not ready yet');
      return;
    }
    setBusy(job);
    setErr(null);
    try {
      if (job === 'apng' || job === 'gif') {
        const blob = await handle.animation(SCALE, job, job === 'gif' ? bg : null);
        if (!blob) throw new Error('nothing to animate');
        save(blob, snapshotFilename(job === 'gif' ? 'gif' : 'png', true));
      } else {
        const canvas = handle.still(SCALE);
        if (!canvas) throw new Error('nothing drawn yet');
        if (job === 'copy') await copyToClipboard(canvas);
        else {
          const type = job === 'webp' ? 'image/webp' : 'image/png';
          save(await canvasToBlob(canvas, type), snapshotFilename(job));
        }
      }
      onClose();
    } catch (e) {
      // saying nothing looks identical to a menu that does not work
      console.error('[avatar menu]', job, e);
      setErr(e instanceof Error ? e.message : 'could not do that');
      setBusy(null);
    }
  };

  const animatable = target.current?.animatable() ?? false;

  return (
    <div
      ref={ref}
      className={styles.menu}
      style={{ left: pos.x, top: pos.y }}
      role='menu'
      // swallow our own pointerdown, the way the captions do.
      //
      // this lives in document.body but react bubbles synthetic events up the
      // REACT tree, so it still reaches the charAnchor that wraps every
      // character. that one calls setPointerCapture, which retargets every
      // later event for this pointer at the character, so the click never
      // arrives here and every item silently does nothing
      onPointerDown={e => e.stopPropagation()}
      // and no browser menu on top of our own
      onContextMenu={e => e.preventDefault()}
    >
      <button className={styles.item} role='menuitem' onClick={() => run('png')}>
        Save as PNG <span className={styles.hint}>{SCALE}x</span>
      </button>
      <button className={styles.item} role='menuitem' onClick={() => run('webp')}>
        Save as WebP <span className={styles.hint}>smaller</span>
      </button>
      <div className={styles.rule} />
      <div className={styles.group} data-disabled={animatable ? undefined : ''}>
        <div className={styles.groupLabel}>
          Save animated
          {!animatable && <span className={styles.hint}>one frame only</span>}
        </div>
        <div className={styles.row}>
          <button
            className={styles.chip}
            disabled={!animatable}
            onClick={() => run('gif')}
            title='Plays everywhere, including sites that re-encode uploads. 256 colours and one bit of alpha'
          >
            GIF
          </button>
          <button
            className={styles.chip}
            disabled={!animatable}
            onClick={() => run('apng')}
            title='Lossless with real transparency. Plays in browsers and on Discord, but sites that re-encode uploads tend to flatten it, and Windows Photos shows only the first frame'
          >
            APNG
          </button>
        </div>
        <div className={styles.row}>
          <span className={styles.hint}>GIF background</span>
          {BACKGROUNDS.map(([label, value]) => (
            <button
              key={label}
              className={styles.chip}
              data-on={bg === value ? '' : undefined}
              disabled={!animatable}
              onClick={() => setBg(value)}
              title={
                value
                  ? 'Soft edges blend into this colour'
                  : 'Transparent, at the cost of stepped edges on the glows'
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.rule} />
      <button className={styles.item} role='menuitem' onClick={() => run('copy')}>
        Copy image
      </button>
      {busy && (
        <div className={styles.busy}>
          {busy === 'apng' ? 'Rendering frames...' : 'Working...'}
        </div>
      )}
      {err && <div className={styles.busy}>{err}</div>}
    </div>
  );
};

export default AvatarMenu;
