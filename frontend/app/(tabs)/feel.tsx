import { CheckinPanel } from '../../src/features/feel/components/CheckinPanel';
import { HissaScreen } from '../../src/shared/ui/hissa/HissaScreen';
import { HissaText } from '../../src/shared/ui/hissa/HissaText';

export default function Feel() {
  return (
    <HissaScreen>
      <HissaText variant="title" accessibilityRole="header" style={{ marginBottom: 20 }}>Food & Feel</HissaText>
      <CheckinPanel />
    </HissaScreen>
  );
}
