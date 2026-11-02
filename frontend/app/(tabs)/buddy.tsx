import { BuddyPanel } from '../../src/features/buddy/components/BuddyPanel';
import { HissaScreen } from '../../src/shared/ui/hissa/HissaScreen';
import { HissaText } from '../../src/shared/ui/hissa/HissaText';

export default function Buddy() {
  return (
    <HissaScreen>
      <HissaText variant="title" accessibilityRole="header" style={{ marginBottom: 20 }}>Buddy</HissaText>
      <BuddyPanel />
    </HissaScreen>
  );
}
