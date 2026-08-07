'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './CashCoin.module.scss';

/**
 * NX coin flippable
 *
 * One strip and background-position rather than four images, so a flip is a
 * repaint and never a fetch.
 */

type Frame = { x: number; y: number; w: number; h: number; ms: number };
type Coin = { file: string; w: number; h: number; frames: Frame[] };

let once: Promise<Coin | null> | null = null;
const load = () => {
  once ??= fetch('/ui/cash/coin.json')
    .then(r => (r.ok ? (r.json() as Promise<Coin>) : null))
    .catch(() => null);
  return once;
};

/** how many full turns one click plays */
const TURNS = 2;

const CashCoin = ({ flipKey }: { flipKey: number }) => {
  const [coin, setCoin] = useState<Coin | null>(null);
  const [frame, setFrame] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    let stale = false;
    load().then(c => {
      if (!stale) setCoin(c);
    });
    return () => {
      stale = true;
    };
  }, []);

  useEffect(() => {
    // nothing on mount, only when the button is actually pressed
    if (first.current) {
      first.current = false;
      return;
    }
    if (!coin?.frames.length) return;

    const steps = coin.frames.length * TURNS;
    let at = 0;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    const next = () => {
      timer = setTimeout(() => {
        if (stopped) return;
        at += 1;
        if (at >= steps) {
          // rest face on, not mid turn
          setFrame(0);
          return;
        }
        setFrame(at % coin.frames.length);
        next();
      }, coin.frames[at % coin.frames.length].ms);
    };
    next();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [flipKey, coin]);

  if (!coin?.frames.length) return <span className={styles.coin} aria-hidden />;

  const f = coin.frames[Math.min(frame, coin.frames.length - 1)];
  const box = Math.max(...coin.frames.map(x => x.w));

  return (
    <span
      className={styles.coin}
      aria-hidden
      style={{
        width: box,
        height: coin.h,
        backgroundImage: `url(/ui/cash/${coin.file})`,
        // centred in the box, so a narrower frame does not shift the label
        backgroundPosition: `${Math.round((box - f.w) / 2) - f.x}px ${-f.y}px`,
      }}
    />
  );
};

export default CashCoin;
