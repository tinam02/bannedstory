'use client';
import ZoomControls from '@/components/atoms/ZoomControls';
import SkinPicker from '@/components/atoms/SkinPicker';
import RandomizeButton from '@/components/atoms/RandomizeButton';
import ExportButton from '@/components/atoms/Export';
import ImportButton from '@/components/atoms/Import';
import AnimateToggle from '@/components/atoms/AnimateToggle';
import EmotePicker from '@/components/atoms/EmotePicker';
import styles from './Toolbar.module.scss';

/**
 * Every tool control lives here, laid out by flexbox */
const Toolbar = () => (
  <div className={styles.toolbar}>
    <div className={styles.row}>
      <RandomizeButton />
      <AnimateToggle />
      <ImportButton />
      <ExportButton />
      <ZoomControls />
    </div>
    <div className={styles.row}>
      <EmotePicker />
      <SkinPicker />
    </div>
  </div>
);

export default Toolbar;
