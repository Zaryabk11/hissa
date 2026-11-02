import Svg, { Circle, G, Line, Rect } from 'react-native-svg';
import { landingColors } from '../../../shared/theme/landingTokens';

// Flat stand-in for the 3D robot, which only runs on web (three.js needs a browser canvas). 120 x 150 per robot.
type Pose = 'cheer' | 'shake';

function Bot({ light, pose, mirror }: { light?: boolean; pose: Pose; mirror?: boolean }) {
  const body = light ? '#dadcde' : '#4a4d52';
  const dark = light ? '#8e9196' : '#1b1c1e';
  const lime = landingColors.lime;
  const arm = { stroke: body, strokeWidth: 9, strokeLinecap: 'round' } as const;
  return (
    <G transform={mirror ? 'translate(120,0) scale(-1,1)' : undefined}>
      <Rect x={40} y={104} width={14} height={34} rx={3} fill={dark} />
      <Rect x={66} y={104} width={14} height={34} rx={3} fill={dark} />
      <Rect x={36} y={136} width={22} height={9} rx={4} fill={dark} />
      <Rect x={62} y={136} width={22} height={9} rx={4} fill={dark} />
      {pose === 'cheer' ? (
        <>
          <Line x1={34} y1={66} x2={18} y2={32} {...arm} />
          <Line x1={86} y1={66} x2={102} y2={32} {...arm} />
          <Circle cx={16} cy={27} r={7} fill={lime} />
          <Circle cx={104} cy={27} r={7} fill={lime} />
        </>
      ) : (
        <>
          <Line x1={34} y1={66} x2={28} y2={100} {...arm} />
          <Line x1={86} y1={68} x2={112} y2={80} {...arm} />
          <Circle cx={116} cy={81} r={7} fill={lime} />
        </>
      )}
      <Rect x={34} y={56} width={52} height={50} rx={8} fill={body} />
      <Rect x={46} y={68} width={28} height={14} rx={3} fill={lime} />
      <Rect x={40} y={100} width={40} height={8} rx={3} fill={dark} />
      <Rect x={54} y={50} width={12} height={8} fill={dark} />
      <Line x1={46} y1={22} x2={38} y2={8} stroke={dark} strokeWidth={3} strokeLinecap="round" />
      <Line x1={74} y1={22} x2={82} y2={8} stroke={dark} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={37} cy={6} r={5} fill={lime} />
      <Circle cx={83} cy={6} r={5} fill={lime} />
      <Rect x={38} y={20} width={44} height={34} rx={10} fill={dark} />
      <Rect x={44} y={30} width={32} height={14} rx={7} fill="#0b0b0c" />
      <Circle cx={54} cy={37} r={3} fill={lime} />
      <Circle cx={66} cy={37} r={3} fill={lime} />
    </G>
  );
}

/** One robot with its arms up, for the hero stage. `size` is its height in px. */
export function RobotArt({ size }: { size: number }) {
  return (
    <Svg width={(size * 120) / 150} height={size} viewBox="0 0 120 150">
      <Bot pose="cheer" />
    </Svg>
  );
}

/** Two robots shaking hands, for the buddy section. `size` is their height in px. */
export function RobotPair({ size }: { size: number }) {
  return (
    <Svg width={(size * 232) / 150} height={size} viewBox="0 0 232 150">
      <Bot pose="shake" />
      <G transform="translate(112,0)">
        <Bot pose="shake" light mirror />
      </G>
    </Svg>
  );
}
