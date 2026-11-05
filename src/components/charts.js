import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Rect, Stop, LinearGradient as SvgGradient, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme';
import { formatCompact } from '../utils/format';

const niceMax = (v) => {
  if (v <= 0) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
};

// Income vs expense per month. data: [{ key, label, a, b }] in paise.
export function GroupedBars({ data, aColor, bColor, height = 200, selectedIndex, onSelect }) {
  const { t } = useTheme();
  const [w, setW] = useState(0);
  const padL = 40, padB = 22, padT = 8;
  const max = niceMax(Math.max(1, ...data.flatMap((d) => [d.a, d.b])));
  const innerW = Math.max(0, w - padL), innerH = height - padB - padT;
  const groupW = innerW / Math.max(1, data.length);
  const barW = Math.min(10, groupW * 0.3);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {[0, 0.5, 1].map((f) => {
            const y = padT + innerH * (1 - f);
            return (
              <G key={f}>
                <Line x1={padL} x2={w} y1={y} y2={y} stroke={t.track} strokeWidth={1} />
                <SvgText x={0} y={y + 4} fontSize={10} fontFamily="Manrope_600SemiBold" fill={t.faint}>{formatCompact(max * f)}</SvgText>
              </G>
            );
          })}
          {data.map((d, i) => {
            const cx = padL + groupW * i + groupW / 2;
            const ha = (d.a / max) * innerH, hb = (d.b / max) * innerH;
            const sel = selectedIndex === i;
            return (
              <G key={d.key} onPress={() => onSelect && onSelect(i)} opacity={selectedIndex == null || sel ? 1 : 0.4}>
                <Rect x={padL + groupW * i} y={0} width={groupW} height={height} fill="transparent" />
                <Rect x={cx - barW - 1} y={padT + innerH - ha} width={barW} height={Math.max(ha, d.a > 0 ? 2 : 0)} rx={barW / 2.6} fill={aColor} />
                <Rect x={cx + 1} y={padT + innerH - hb} width={barW} height={Math.max(hb, d.b > 0 ? 2 : 0)} rx={barW / 2.6} fill={bColor} />
                <SvgText x={cx} y={height - 6} fontSize={9} fontFamily="Manrope_600SemiBold" textAnchor="middle" fill={sel ? t.text : t.faint}>{d.label}</SvgText>
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

// segments: [{ value, color }]. Children render in the donut's centre.
export function Donut({ segments, size = 176, stroke = 22, children }) {
  const { t } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.track} strokeWidth={stroke} fill="none" />
          {total > 0 && segments.map((s, i) => {
            const len = (s.value / total) * c;
            const draw = Math.max(len - (segments.length > 1 ? 3 : 0), 0);
            const el = (
              <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={s.color} strokeWidth={stroke} fill="none"
                strokeDasharray={`${draw} ${c - draw}`} strokeDashoffset={-acc} />
            );
            acc += len;
            return el;
          })}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: size - stroke * 2 - 8 }}>{children}</View>
    </View>
  );
}

// data: [{ label, value }] in paise (can be negative).
export function LineArea({ data, color, height = 130 }) {
  const { t } = useTheme();
  const [w, setW] = useState(0);
  const padT = 10, padB = 20;
  const vals = data.map((d) => d.value);
  const hi = Math.max(0, ...vals), lo = Math.min(0, ...vals);
  const span = hi - lo || 1;
  const innerH = height - padT - padB;
  const y = (v) => padT + innerH * (1 - (v - lo) / span);
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  const pts = data.map((d, i) => ({ x: i * step, y: y(d.value) }));
  const line = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `C${(pts[i - 1].x + p.x) / 2},${pts[i - 1].y} ${(pts[i - 1].x + p.x) / 2},${p.y} ${p.x},${p.y}`)).join(' ');
  const base = y(0);
  const area = pts.length ? `${line} L${pts[pts.length - 1].x},${base} L${pts[0].x},${base} Z` : '';
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && pts.length > 1 && (
        <Svg width={w} height={height}>
          <Defs>
            <SvgGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.4" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </SvgGradient>
          </Defs>
          <Line x1={0} x2={w} y1={base} y2={base} stroke={t.track} strokeWidth={1} />
          <Path d={area} fill="url(#area)" />
          <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          {pts.map((p, i) => (
            <SvgText key={i} x={Math.min(Math.max(p.x, 8), w - 8)} y={height - 5} fontSize={9} fontFamily="Manrope_600SemiBold" textAnchor="middle" fill={t.faint}>{data[i].label}</SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

export function SplitBar({ aPercent, aColor, bColor, height = 12 }) {
  const a = Math.max(0, Math.min(100, aPercent || 0));
  return (
    <View style={{ flexDirection: 'row', height, borderRadius: height, overflow: 'hidden', gap: 2 }}>
      <View style={{ flex: Math.max(a, 0.001), backgroundColor: aColor }} />
      <View style={{ flex: Math.max(100 - a, 0.001), backgroundColor: bColor }} />
    </View>
  );
}
