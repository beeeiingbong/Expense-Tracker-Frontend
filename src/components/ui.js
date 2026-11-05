import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { withAlpha } from '../utils/format';

// Sora for headings and numbers (geometric, confident), Manrope for reading text.
const type = {
  display: { fontFamily: 'Sora_700Bold', fontSize: 34, letterSpacing: -0.8 },
  title: { fontFamily: 'Sora_600SemiBold', fontSize: 20, letterSpacing: -0.3 },
  heading: { fontFamily: 'Sora_600SemiBold', fontSize: 16 },
  num: { fontFamily: 'Sora_600SemiBold', fontSize: 18, letterSpacing: -0.2 },
  body: { fontFamily: 'Manrope_500Medium', fontSize: 15 },
  bodyBold: { fontFamily: 'Manrope_700Bold', fontSize: 15 },
  caption: { fontFamily: 'Manrope_600SemiBold', fontSize: 12.5 },
};

export function Txt({ variant = 'body', color = 'text', style, children, ...rest }) {
  const { t } = useTheme();
  return (
    <Text {...rest} style={[type[variant], { color: t[color] || color }, style]}>
      {children}
    </Text>
  );
}

export function GlassCard({ children, style, padding = 18, radius = 24, borderColor, wash }) {
  const { t } = useTheme();
  return (
    <View
      style={[
        { borderRadius: radius, shadowColor: t.shadow, shadowOpacity: t.shadowOpacity, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } },
        style,
      ]}
    >
      <View style={{ borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: borderColor || t.border }}>
        <BlurView intensity={t.blur} tint={t.tint} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.glass }]} />
        {wash ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: wash }]} /> : null}
        <View style={{ padding }}>{children}</View>
      </View>
    </View>
  );
}

export function Button({ title, onPress, loading, disabled, icon, variant = 'primary', style, small }) {
  const { t } = useTheme();
  const off = disabled || loading;
  const palette = {
    primary: { fg: t.onAccent },
    ghost: { fg: t.text, bg: t.glassStrong, border: t.border },
    good: { fg: t.good, bg: t.goodSoft, border: t.good },
    bad: { fg: t.bad, bg: t.badSoft, border: t.bad },
  }[variant];
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: small ? 11 : 15, paddingHorizontal: 16 }}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
          <Txt variant="bodyBold" style={{ color: palette.fg }}>{title}</Txt>
        </>
      )}
    </View>
  );
  return (
    <Pressable onPress={onPress} disabled={off} style={({ pressed }) => [{ opacity: off ? 0.5 : pressed ? 0.85 : 1 }, style]}>
      {variant === 'primary' ? (
        <LinearGradient colors={t.accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18 }}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={{ borderRadius: 18, backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border }}>{inner}</View>
      )}
    </Pressable>
  );
}

export function TextField({ label, prefix, error, style, ...props }) {
  const { t } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={style}>
      {label ? <Txt variant="caption" color="muted" style={{ marginBottom: 6, marginLeft: 4 }}>{label}</Txt> : null}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 14,
          backgroundColor: t.input, borderWidth: 1.5,
          borderColor: error ? t.bad : focus ? t.accent : t.border,
        }}
      >
        {prefix ? <Txt variant="bodyBold" color="muted" style={{ marginRight: 8 }}>{prefix}</Txt> : null}
        <TextInput
          {...props}
          onFocus={(e) => { setFocus(true); props.onFocus && props.onFocus(e); }}
          onBlur={(e) => { setFocus(false); props.onBlur && props.onBlur(e); }}
          placeholderTextColor={t.faint}
          style={[{ flex: 1, paddingVertical: 14, color: t.text, fontFamily: 'Manrope_600SemiBold', fontSize: 15.5 }, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]}
        />
      </View>
      {error ? <Txt variant="caption" color="bad" style={{ marginTop: 5, marginLeft: 4 }}>{error}</Txt> : null}
    </View>
  );
}

export function Segmented({ options, value, onChange, style }) {
  const { t } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: t.input, borderWidth: 1, borderColor: t.border }, style]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: on ? t.glassStrong : 'transparent', borderWidth: 1, borderColor: on ? t.border : 'transparent' }}
          >
            <Txt variant="bodyBold" color={on ? 'text' : 'muted'} style={{ fontSize: 14 }}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ value, color, height = 8, style }) {
  const { t } = useTheme();
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: t.track, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function CategoryIcon({ name, color, size = 42 }) {
  const { t } = useTheme();
  const c = /^#[0-9a-f]{6}$/i.test(color || '') ? color : t.accent;
  const valid = FontAwesome5.glyphMap && FontAwesome5.glyphMap[name];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: withAlpha(c, 0.18), alignItems: 'center', justifyContent: 'center' }}>
      <FontAwesome5 name={valid ? name : 'tag'} size={size * 0.4} color={c} />
    </View>
  );
}

export function EmptyState({ icon = 'sparkles-outline', title, message, action }) {
  const { t } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
      <Ionicons name={icon} size={34} color={t.accent} />
      <Txt variant="heading">{title}</Txt>
      {message ? <Txt color="muted" style={{ textAlign: 'center', maxWidth: 280 }}>{message}</Txt> : null}
      {action}
    </View>
  );
}

export function ErrorNote({ message, onRetry }) {
  if (!message) return null;
  return (
    <GlassCard padding={14} borderColor="rgba(251,113,133,0.6)">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="alert-circle" size={20} color="#FB7185" />
        <Txt style={{ flex: 1 }} color="bad">{message}</Txt>
        {onRetry ? <Pressable onPress={onRetry}><Txt variant="bodyBold" color="accent">Retry</Txt></Pressable> : null}
      </View>
    </GlassCard>
  );
}
