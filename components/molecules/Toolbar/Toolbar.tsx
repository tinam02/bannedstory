'use client';
import ZoomControls from '@/components/atoms/ZoomControls';
import SkinPicker from '@/components/atoms/SkinPicker';
import EarPicker from '@/components/atoms/EarPicker';
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
import GithubLink from '@/components/atoms/GithubLink';
import styles from './Toolbar.module.scss';

/**
 * Every tool control
 */
const Toolbar = () => (
  <div className={styles.toolbar}>
    <div className={styles.row}>
      <MapPicker />
      <BgPicker />
      <ImportButton />
      <ExportButton />
      <RandomizeButton /> 
      <ZoomControls />
      <GithubLink />
    </div>
    <div className={styles.row}>
      <CharRoster />
      <SkinPicker />
      <EarPicker />
      <PosePicker />
      <EmotePicker />
      <CaptionPicker />
      <AnimateToggle />
    </div>
  </div>
);

export default Toolbar;
