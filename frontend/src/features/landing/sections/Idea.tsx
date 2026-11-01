import { Text } from 'react-native';
import { fluid, landingColors, landingType } from '../../../shared/theme/landingTokens';
import { FlowCard } from '../components/FlowCard';
import { Eyebrow } from '../components/Eyebrow';
import { Grid } from '../components/Grid';
import { PillarCard } from '../components/PillarCard';
import { Section } from '../components/Section';
import { SectionTitle } from '../components/SectionTitle';
import { content } from '../content';
import { useLandingLayout } from '../hooks/useLandingLayout';

export function Idea() {
  const { width } = useLandingLayout();
  const c = content.idea;
  return (
    <Section paddingY={fluid(72, 11, 140, width)}>
      <Eyebrow>{c.eyebrow}</Eyebrow>
      <SectionTitle variant="statement" size={landingType.ideaH2} maxEm={15} marginTop={20}>
        {c.titleBefore}
        <Text style={{ color: landingColors.lime }}>{c.titleAccent}</Text>
        {c.titleAfter}
      </SectionTitle>
      <Grid minCol={260} gap={16} marginTop={fluid(40, 6, 72, width)}>
        {c.pillars.map((p, i) => (
          <FlowCard key={p.n} side={i % 2 ? 'right' : 'left'}>
            <PillarCard n={p.n} title={p.t} body={p.d} />
          </FlowCard>
        ))}
      </Grid>
    </Section>
  );
}
