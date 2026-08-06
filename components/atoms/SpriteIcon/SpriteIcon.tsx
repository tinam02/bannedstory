'use client';
import styles from './SpriteIcon.module.scss';

/**
 * 1 icon out of a packed sheet.
 *
 * The whole tab shares a single image, so this is a crop rather than a fetch.
 * 50 icons on screen is 1 request instead of 50
 */
const SpriteIcon = ({
  sheet,
  x,
  y,
  w,
  h,
  title,
}: {
  sheet: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
}) => (
  <span
    className={styles.icon}
    role='img'
    aria-label={title}
    title={title}
    style={{
      width: w,
      height: h,
      backgroundImage: `url(${sheet})`,
      backgroundPosition: `${-x}px ${-y}px`,
    }}
  />
);

export default SpriteIcon;
