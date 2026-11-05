import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../api';
import { getDeviceId, getDeviceName } from '../api/client';
import { APP_NAME } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { Screen, ThemeToggle } from '../components/Screen';
import { Button, ErrorNote, GlassCard, Segmented, TextField, Txt } from '../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maskEmail = (e) => e.replace(/(.).+(@.+)/, '$1•••$2');

function OtpInput({ value, onChange, error, length = 6 }) {
  const { t } = useTheme();
  const ref = useRef(null);
  return (
    <Pressable onPress={() => ref.current && ref.current.focus()}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {Array.from({ length }).map((_, i) => {
          const active = i === value.length;
          return (
            <View
              key={i}
              style={{
                flex: 1, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                backgroundColor: t.input, borderWidth: 1.5,
                borderColor: error ? t.bad : active ? t.accent : t.border,
              }}
            >
              <Txt variant="title">{value[i] || ''}</Txt>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus
        caretHidden
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
    </Pressable>
  );
}

export default function AuthScreen() {
  const { t } = useTheme();
  const { completeLogin } = useAuth();
  const [mode, setMode] = useState('LOGIN'); // LOGIN | SIGNUP
  const [step, setStep] = useState('details'); // details | otp
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [cooldown, setCooldown] = useState(0);

  const signup = mode === 'SIGNUP';
  const digits = phone.replace(/\D/g, '');
  const phoneNumber = `+91${digits}`;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const validate = () => {
    const e = {};
    if (signup && !name.trim()) e.name = 'Enter your name';
    if (digits.length !== 10) e.phone = 'Enter a 10-digit mobile number';
    if (signup && !EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email to receive your code';
    if (!signup && email.trim() && !EMAIL_RE.test(email.trim())) e.email = 'That email looks incorrect';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const sendOtp = async () => {
    setError(null);
    if (step === 'details' && !validate()) return;
    setLoading(true);
    try {
      await api.auth.requestOtp({
        phoneNumber,
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(signup ? { name: name.trim() } : {}),
        purpose: mode,
      });
      setStep('otp');
      setOtp('');
      setCooldown(30);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code = otp) => {
    if (code.length !== 6 || loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.verifyOtp({
        phoneNumber,
        otp: code,
        deviceId: await getDeviceId(),
        deviceName: getDeviceName(),
        ...(signup ? { name: name.trim() } : {}),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await completeLogin(res);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e.message);
      setOtp('');
      setLoading(false);
    }
  };

  useEffect(() => { if (otp.length === 6) verify(otp); /* eslint-disable-next-line */ }, [otp]);

  const backToDetails = () => { setStep('details'); setOtp(''); setError(null); };

  return (
    <Screen
      bottomPad={60}
      header={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <ThemeToggle />
        </View>
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: 22 }}>
        <View style={{ alignItems: 'center', gap: 14, marginTop: 8 }}>
          <LinearGradient colors={t.accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="wallet" size={34} color={t.onAccent} />
          </LinearGradient>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Txt variant="display" style={{ fontSize: 30, textAlign: 'center' }}>
              {step === 'otp' ? 'Check your email' : signup ? 'Create your account' : 'Welcome back'}
            </Txt>
            <Txt color="muted" style={{ textAlign: 'center', maxWidth: 300 }}>
              {step === 'otp'
                ? `We sent a 6-digit code${email.trim() ? ` to ${maskEmail(email.trim())}` : ' to your registered email'}.`
                : `${APP_NAME} keeps your spending, budgets and bank alerts in one place.`}
            </Txt>
          </View>
        </View>

        <GlassCard padding={20} radius={28}>
          {step === 'details' ? (
            <View style={{ gap: 16 }}>
              <Segmented
                value={mode}
                onChange={(m) => { setMode(m); setError(null); setFieldErrors({}); }}
                options={[{ key: 'LOGIN', label: 'Sign in' }, { key: 'SIGNUP', label: 'Sign up' }]}
              />
              {signup ? (
                <TextField label="Full name" value={name} onChangeText={setName} placeholder="Anik Jana" autoCapitalize="words" textContentType="name" error={fieldErrors.name} />
              ) : null}
              <TextField label="Mobile number" prefix="+91" value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" keyboardType="number-pad" textContentType="telephoneNumber" error={fieldErrors.phone} />
              <TextField
                label={signup ? 'Email for your code' : 'Email (optional)'}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                error={fieldErrors.email}
              />
              <ErrorNote message={error} />
              <Button title="Send code" onPress={sendOtp} loading={loading} />
            </View>
          ) : (
            <View style={{ gap: 18 }}>
              <OtpInput value={otp} onChange={setOtp} error={!!error} />
              <ErrorNote message={error} />
              <Button title="Verify and continue" onPress={() => verify()} loading={loading} disabled={otp.length !== 6} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Pressable onPress={backToDetails}><Txt variant="bodyBold" color="accent">Change details</Txt></Pressable>
                <Pressable disabled={cooldown > 0 || loading} onPress={sendOtp}>
                  <Txt variant="bodyBold" color={cooldown > 0 ? 'faint' : 'accent'}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </Txt>
                </Pressable>
              </View>
            </View>
          )}
        </GlassCard>
      </KeyboardAvoidingView>
    </Screen>
  );
}
