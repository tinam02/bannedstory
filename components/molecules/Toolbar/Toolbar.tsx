'use client';
import ZoomControls from '@/components/atoms/ZoomControls';
import SkinPicker from '@/components/atoms/SkinPicker';
import RandomizeButton from '@/components/atoms/RandomizeButton';
import ExportButton from '@/components/atoms/Export';
import ImportButton from '@/components/atoms/Import';
import AnimateToggle from '@/components/atoms/AnimateToggle';
import EmotePicker from '@/components/atoms/EmotePicker';
import BgPicker from '@/components/atoms/BgPicker';
import MapPicker from '@/components/atoms/MapPicker';
import CaptionPicker from '@/components/atoms/CaptionPicker';
import CharRoster from '@/components/atoms/CharRoster';
import PosePicker from '@/components/atoms/PosePicker';
import styles from './Toolbar.module.scss';

/**
 * Every tool control lives here, laid out by flexbox */
const Toolbar = () => (
  <div className={styles.toolbar}>
    <div className={styles.row}>
      <CharRoster />
      <RandomizeButton />
      <AnimateToggle />
      <ImportButton />
      <ExportButton />
      <ZoomControls />
    </div>
    <div className={styles.row}>
      <EmotePicker />
      <PosePicker />
      <SkinPicker />
      <CaptionPicker />
      <MapPicker />
      <BgPicker />
    </div>
  </div>
);

export default Toolbar;
