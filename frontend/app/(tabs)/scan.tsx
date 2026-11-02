import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { CameraScreen } from '../../src/features/scan/CameraScreen';
import { setMockNoPlate } from '../../src/features/scan/store';

export default function Scan() {
  // /scan?mock=noplate makes the mock recognition find nothing, to see the "couldn't see a plate" screen.
  const { mock } = useLocalSearchParams<{ mock?: string }>();
  useEffect(() => {
    if (mock !== undefined) setMockNoPlate(mock === 'noplate');
  }, [mock]);
  return <CameraScreen />;
}
