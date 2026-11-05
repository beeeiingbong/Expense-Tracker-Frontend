import React from 'react';
import { Pressable, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import * as Haptics from 'expo-haptics';

import { ThemeProvider, useTheme } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppProvider, useApp } from './src/context/AppContext';
import { ToastProvider } from './src/components/Toast';
import { GlassCard, Txt } from './src/components/ui';
import AuthScreen from './src/screens/AuthScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import SpendingScreen from './src/screens/SpendingScreen';
import SmsScreen from './src/screens/SmsScreen';
import { withAlpha } from './src/utils/format';

const Tab = createBottomTabNavigator();

const TABS = {
  Insights: { label: 'Insights', icon: 'stats-chart' },
  Budgets: { label: 'Budgets', icon: 'wallet' },
  Spending: { label: 'Spending', icon: 'pie-chart' },
  SMS: { label: 'SMS', icon: 'chatbubble-ellipses' },
};

function GlassTabBar({ state, navigation }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { pendingCount } = useApp();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 12) }}>
      <GlassCard radius={30} padding={6}>
        <View style={{ flexDirection: 'row' }}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const meta = TABS[route.name];
            return (
              <Pressable
                key={route.key}
                onPress={() => {
                  const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !e.defaultPrevented) { Haptics.selectionAsync().catch(() => {}); navigation.navigate(route.name); }
                }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 24, backgroundColor: focused ? withAlpha(t.accent, 0.2) : 'transparent' }}
              >
                <View>
                  <Ionicons name={focused ? meta.icon : `${meta.icon}-outline`} size={22} color={focused ? t.accent : t.faint} />
                  {route.name === 'SMS' && pendingCount > 0 ? (
                    <View style={{ position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: t.bad, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt variant="caption" style={{ color: '#fff', fontSize: 10.5 }}>{pendingCount > 9 ? '9+' : pendingCount}</Txt>
                    </View>
                  ) : null}
                </View>
                <Txt variant="caption" color={focused ? 'accent' : 'faint'} style={{ marginTop: 3, fontSize: 11 }}>{meta.label}</Txt>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator tabBar={(p) => <GlassTabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Insights" component={AnalyticsScreen} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} />
      <Tab.Screen name="Spending" component={SpendingScreen} />
      <Tab.Screen name="SMS" component={SmsScreen} />
    </Tab.Navigator>
  );
}

function Root({ fontsReady }) {
  const { status } = useAuth();
  const { t, isDark } = useTheme();
  if (!fontsReady || status === 'loading') return <View style={{ flex: 1, backgroundColor: t.bg[0] }} />;
  if (status === 'out') return <AuthScreen />;
  const base = isDark ? DarkTheme : DefaultTheme;
  return (
    <NavigationContainer theme={{ ...base, colors: { ...base.colors, background: t.bg[0], card: t.bg[0] } }}>
      <Tabs />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsReady] = useFonts({ Sora_600SemiBold, Sora_700Bold, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppProvider>
              <Root fontsReady={fontsReady} />
            </AppProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
