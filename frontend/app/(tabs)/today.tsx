import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { clearAllData, fillDemoData } from '../../src/features/today/demoData';
import { TodayScreen } from '../../src/features/today/TodayScreen';
import type { MockState } from '../../src/features/today/mockData';

const STATES = ['meals', 'empty', 'loading', 'over'];

export default function Today() {
  const { mock, demo } = useLocalSearchParams<{ mock?: string; demo?: string }>();
  // Demo helpers, URL only: /today?demo=1 fills the last 7 days, /today?demo=clear wipes all saved data.
  useEffect(() => {
    if (demo === '1') fillDemoData();
    else if (demo === 'clear') clearAllData();
  }, [demo]);
  return <TodayScreen mock={STATES.includes(mock ?? '') ? (mock as MockState) : undefined} />;
}
