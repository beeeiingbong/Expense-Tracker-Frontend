import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { GlassCard, Txt } from './ui';
import { currentMonth, monthLabel, shiftMonth } from '../utils/format';

// A soft glow made of stacked translucent rings (no blur needed, so it looks the same on iOS and Android).
function Blob({ size, color, ring, style }) {
  return (
    <View style={[{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {Array.from({ length: 9 }).map((_, i) => {
        const s = size * (1 - i * 0.105);
        return <View key={i} style={{ position: 'absolute', width: s, height: s, borderRadius: s / 2, backgroundColor: color, opacity: ring }} />;
      })}
    </View>
  );
}

export function GradientBackground() {
  const { t } = useTheme();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={t.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Blob size={340} color={t.blobs[0]} ring={t.blobRing} style={{ top: -110, left: -120 }} />
      <Blob size={360} color={t.blobs[1]} ring={t.blobRing} style={{ top: '34%', right: -170 }} />
      <Blob size={320} color={t.blobs[2]} ring={t.blobRing} style={{ bottom: -120, left: -100 }} />
    </View>
  );
}

export function Screen({ children, header, onRefresh, refreshing, footer, bottomPad = 150 }) {
  const insets = useSafeAreaInsets();
  const { t, isDark } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg[0] }}>
      <GradientBackground />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: bottomPad, paddingHorizontal: 20, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.accent} /> : undefined}
      >
        {header}
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

export function IconButton({ name, onPress, size = 42, color }) {
  const { t } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <GlassCard radius={size / 2} padding={0}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={name} size={20} color={color || t.text} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <IconButton
      name={isDark ? 'sunny-outline' : 'moon-outline'}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); toggle(); }}
    />
  );
}

export function ScreenHeader({ title, subtitle, onLogout }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Txt variant="display" style={{ fontSize: 28 }}>{title}</Txt>
        {subtitle ? <Txt color="muted" style={{ marginTop: 2 }}>{subtitle}</Txt> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {onLogout ? <IconButton name="log-out-outline" onPress={onLogout} /> : null}
        <ThemeToggle />
      </View>
    </View>
  );
}

// Plan one month ahead at most.
export function MonthSwitcher({ month, onChange }) {
  const { t } = useTheme();
  const canNext = month < shiftMonth(currentMonth(), 1);
  return (
    <GlassCard padding={6} radius={20}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable hitSlop={8} onPress={() => onChange(shiftMonth(month, -1))} style={{ padding: 10 }}>
          <Ionicons name="chevron-back" size={20} color={t.text} />
        </Pressable>
        <Txt variant="heading">{monthLabel(month)}</Txt>
        <Pressable hitSlop={8} disabled={!canNext} onPress={() => onChange(shiftMonth(month, 1))} style={{ padding: 10, opacity: canNext ? 1 : 0.3 }}>
          <Ionicons name="chevron-forward" size={20} color={t.text} />
        </Pressable>
      </View>
    </GlassCard>
  );
}

export function YearSwitcher({ year, onChange }) {
  const { t } = useTheme();
  const canNext = year < new Date().getFullYear();
  return (
    <GlassCard padding={6} radius={20}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable hitSlop={8} onPress={() => onChange(year - 1)} style={{ padding: 10 }}>
          <Ionicons name="chevron-back" size={20} color={t.text} />
        </Pressable>
        <Txt variant="heading">{year}</Txt>
        <Pressable hitSlop={8} disabled={!canNext} onPress={() => onChange(year + 1)} style={{ padding: 10, opacity: canNext ? 1 : 0.3 }}>
          <Ionicons name="chevron-forward" size={20} color={t.text} />
        </Pressable>
      </View>
    </GlassCard>
  );
}
