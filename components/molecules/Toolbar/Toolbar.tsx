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
import GithubLink from '@/components/atoms/GithubLink';
import styles from './Toolbar.module.scss';

/**
 * Every tool control lives here, laid out by flexbox.
 *
 * The two rows are split by what the control acts on rather than by what kind
 * of widget it is, so there is somewhere to look for a given thing. Top row is
 * the character, bottom row is the scene around it and getting the picture out
 */
const Toolbar = () => (
  <div className={styles.toolbar}>
    <div className={styles.row}>
      <MapPicker />
      <BgPicker />
      <ZoomControls />
      <ImportButton />
      <ExportButton />
      <GithubLink />
    </div>
    <div className={styles.row}>
      <CharRoster />
      <RandomizeButton />
      <SkinPicker />
      <PosePicker />
      <EmotePicker />
      <CaptionPicker />
      <AnimateToggle />
    </div>
  </div>
);

export default Toolbar;
