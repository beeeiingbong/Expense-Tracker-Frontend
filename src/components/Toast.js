import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { GlassCard, Txt } from './ui';

const Ctx = createContext(() => {});

export function ToastProvider({ children }) {
  const insets = useSafeAreaInsets();
  const { t } = useTheme();
  const [msg, setMsg] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const show = useCallback((text, kind = 'info') => {
    clearTimeout(timer.current);
    setMsg({ text, kind });
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setMsg(null));
    }, 3000);
  }, [anim]);

  const color = msg?.kind === 'error' ? t.bad : msg?.kind === 'success' ? t.good : t.accent;
  const icon = msg?.kind === 'error' ? 'alert-circle' : msg?.kind === 'success' ? 'checkmark-circle' : 'information-circle';

  return (
    <Ctx.Provider value={show}>
      {children}
      {msg ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 20, right: 20, top: insets.top + 8, zIndex: 100,
            opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
          }}
        >
          <GlassCard padding={14} radius={20} borderColor={color}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={icon} size={22} color={color} />
              <Txt variant="bodyBold" style={{ flex: 1 }}>{msg.text}</Txt>
            </View>
          </GlassCard>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
