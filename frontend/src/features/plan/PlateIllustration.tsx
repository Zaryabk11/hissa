import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { hissaFonts } from '../../shared/theme/hissaTokens';
import { dishById } from '../nutrition/catalog';
import { portionText, type Item } from '../nutrition/engine';

const CX = 110; // plate centre, in plate coordinates
const FULL = 96;
const MAX_WEDGES = 5;

const point = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CX + r * Math.sin(a)] as const;
};

/**
 * The plate seen from above. Each non-bread dish gets an equal wedge (the first is tinted); bread is drawn as a
 * stack beside the plate with its portion written under it. `light` draws smaller wedges on a paler plate (the light plan). `active` is the dish id whose wedge is highlighted.
 */
export function PlateIllustration({ items, light, label, active }: { items: Item[]; light: boolean; label: string; active?: string }) {
  const t = useHissaTheme();
  const dishes = items.flatMap((it) => {
    const d = dishById(it.dishId);
    return d && !d.bread && d.unit !== 'cup' ? [d] : [];
  }).slice(0, MAX_WEDGES);
  const bread = items.find((it) => dishById(it.dishId)?.bread);
  const n = dishes.length;
  const R = light ? 76 : FULL;
  const step = 360 / Math.max(n, 1);
  const stroke = { stroke: t.rim, strokeWidth: 2.5, strokeLinejoin: 'round' } as const;

  return (
    <Svg width={350} height={233} viewBox="0 0 360 240" accessibilityRole="image" accessibilityLabel={label} style={{ alignSelf: 'center', marginTop: 4 }}>
      <G transform={`translate(${bread ? 40 : 76},10)`}>
        <Circle cx={CX} cy={CX} r={104} fill={t.plate} fillOpacity={light ? 0.5 : 1} stroke={t.rim} strokeWidth={3} />
        {n === 1 && <Circle cx={CX} cy={CX} r={R} fill={t.turt} {...stroke} />}
        {n > 1 &&
          dishes.map((d, k) => {
            const [x1, y1] = point(-90 + k * step, R);
            const [x2, y2] = point(-90 + (k + 1) * step, R);
            return <Path key={d.id} d={`M${CX} ${CX} L${x1} ${y1} A${R} ${R} 0 ${step > 180 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={(active ? d.id === active : k === 0) ? t.turt : 'none'} {...stroke} />;
          })}
        <Circle cx={CX} cy={CX} r={7} fill={t.surf} stroke={t.rim} strokeWidth={2} />
        {n >= 1 &&
          n <= 4 &&
          dishes.map((d, k) => {
            const [x, y] = point(-90 + (k + 0.5) * step, n === 1 ? 52 : 62);
            return (
              <SvgText key={d.id} x={x} y={y + 4} fontSize={13} fontWeight="600" fontFamily={hissaFonts.body600} fill={t.ink} textAnchor="middle">
                {d.name.split(' ')[0]}
              </SvgText>
            );
          })}
      </G>
      {bread && (
        <>
          {Array.from({ length: Math.min(3, Math.ceil(bread.qty)) }, (_, k) => (
            <Circle key={k} cx={298 + k * 6} cy={138 - k * 12} r={30} fill={t.tint} stroke={t.tintInk} strokeWidth={2} />
          ))}
          <SvgText x={310} y={206} fontSize={13} fontWeight="600" fontFamily={hissaFonts.body600} fill={t.ink} textAnchor="middle">
            {portionText(bread)}
          </SvgText>
        </>
      )}
    </Svg>
  );
}
