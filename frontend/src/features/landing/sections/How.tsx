import type { LayoutChangeEvent } from 'react-native';
import { fluid, landingType } from '../../../shared/theme/landingTokens';
import { FlowCard } from '../components/FlowCard';
import { Grid } from '../components/Grid';
import { Section } from '../components/Section';
import { SectionTitle } from '../components/SectionTitle';
import { StepCard } from '../components/StepCard';
import { ConfirmVisual, EatVisual, SnapVisual } from '../components/StepVisuals';
import { content } from '../content';
import { useLandingLayout } from '../hooks/useLandingLayout';

const visuals = [<SnapVisual key="s" />, <ConfirmVisual key="c" />, <EatVisual key="e" />];

export function How({ onLayout }: { onLayout: (e: LayoutChangeEvent) => void }) {
  const { width } = useLandingLayout();
  return (
    <Section band nativeID="sec-how" onLayout={onLayout} paddingY={fluid(72, 10, 120, width)}>
      <SectionTitle size={landingType.sectionH2}>{content.how.title.join('\n')}</SectionTitle>
      <Grid minCol={300} gap={16} marginTop={fluid(36, 5, 64, width)}>
        {content.how.steps.map((s, i) => (
          <FlowCard key={s.n} side={i % 2 ? 'right' : 'left'}>
            <StepCard n={s.n} title={s.t} body={s.d} visual={visuals[i]} />
          </FlowCard>
        ))}
      </Grid>
    </Section>
  );
}
