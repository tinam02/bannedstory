'use client';
import ZoomControls from '@/components/atoms/ZoomControls';
import SkinPicker from '@/components/atoms/SkinPicker';
import RandomizeButton from '@/components/atoms/RandomizeButton';
import ExportButton from '@/components/atoms/Export';
import ImportButton from '@/components/atoms/Import';
import { toolbar, toolbarRow } from './toolbar.css';

/**
 * Every tool control lives here, laid out by flexbox */
const Toolbar = () => (
  <div className={toolbar}>
    <div className={toolbarRow}>
      <RandomizeButton />
      <ImportButton />
      <ExportButton />
      <ZoomControls />
    </div>
    <SkinPicker />
  </div>
);

export default Toolbar;
