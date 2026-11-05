import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useLoad } from '../hooks';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import { Screen, ScreenHeader } from '../components/Screen';
import { Button, CategoryIcon, EmptyState, ErrorNote, GlassCard, Segmented, TextField, Txt } from '../components/ui';
import { LAST_SCAN_KEY, hasSmsPermission, requestSmsPermission, scanInbox, smsReadingSupported } from '../utils/sms';
import { formatINR, formatWhen, withAlpha } from '../utils/format';

function PendingCard({ item, info, categories, onDone }) {
  const { t } = useTheme();
  const toast = useToast();
  const [catId, setCatId] = useState(null); // only set if the user changes the suggestion
  const [mode, setMode] = useState(null);
  const [saveRule, setSaveRule] = useState(true);
  const [busy, setBusy] = useState(null);

  const suggested = item.suggestedCategoryId;
  const picked = catId ? categories.find((c) => c._id === catId) : categories.find((c) => c.name === suggested?.name);
  const shownMode = mode || info.paymentMode || 'ONLINE';
  const conf = typeof item.confidence === 'number' ? Math.round(item.confidence * 100) : null;
  const sure = conf == null || conf >= 80;

  const approve = async () => {
    setBusy('approve');
    try {
      await api.sms.approve(item._id, {
        ...(catId ? { categoryId: catId } : {}),
        ...(mode ? { paymentMode: mode } : {}),
        saveRule,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast(`Added${info.amount ? ' ' + formatINR(info.amount) : ''} to ${picked?.name || suggested?.name || 'expenses'}`, 'success');
      onDone();
    } catch (e) {
      toast(e.message, 'error');
      setBusy(null);
    }
  };

  const reject = () =>
    Alert.alert('Ignore this message?', 'It won’t be added to your expenses.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Ignore', style: 'destructive',
        onPress: async () => {
          setBusy('reject');
          try { await api.sms.reject(item._id); toast('Message ignored'); onDone(); }
          catch (e) { toast(e.message, 'error'); setBusy(null); }
        },
      },
    ]);

  return (
    <GlassCard padding={18}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="chatbubble-outline" size={15} color={t.muted} />
          <Txt variant="caption" color="muted">{item.sender}{item.receivedAt ? ` · ${formatWhen(item.receivedAt)}` : ''}</Txt>
        </View>
        {conf != null && (
          <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: sure ? t.goodSoft : t.badSoft }}>
            <Txt variant="caption" color={sure ? 'good' : 'bad'}>{conf}% match</Txt>
          </View>
        )}
      </View>

      <View style={{ marginTop: 12 }}>
        <Txt variant="display" style={{ fontSize: 30 }}>{info.amount != null ? formatINR(info.amount, { decimals: true }) : '—'}</Txt>
        <Txt color="muted" numberOfLines={1}>{info.merchant ? `at ${info.merchant}` : 'Merchant not detected'}</Txt>
      </View>

      <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: t.input }}>
        <Txt variant="caption" color="muted" numberOfLines={3}>{item.rawBody}</Txt>
      </View>

      <Txt variant="caption" color="muted" style={{ marginTop: 16, marginBottom: 8 }}>Category</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {categories.map((c) => {
          const on = picked?._id === c._id;
          return (
            <Pressable key={c._id} onPress={() => setCatId(c._id)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingLeft: 7, paddingRight: 13, borderRadius: 16, borderWidth: 1.5, borderColor: on ? c.color : t.border, backgroundColor: on ? withAlpha(c.color, 0.16) : t.input }}>
                <CategoryIcon name={c.icon} color={c.color} size={26} />
                <Txt variant="caption" color={on ? 'text' : 'muted'}>{c.name}</Txt>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Segmented
        style={{ marginTop: 14 }}
        value={shownMode}
        onChange={setMode}
        options={[{ key: 'ONLINE', label: 'Online' }, { key: 'CASH', label: 'Cash' }]}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <Txt variant="caption" color="muted" style={{ flex: 1, paddingRight: 12 }}>
          Remember this merchant’s category next time
        </Txt>
        <Switch value={saveRule} onValueChange={setSaveRule} trackColor={{ true: t.accent }} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <Button style={{ flex: 1 }} variant="bad" title="Ignore" icon="close" onPress={reject} loading={busy === 'reject'} disabled={!!busy} small />
        <Button style={{ flex: 1.6 }} variant="good" title="Approve" icon="checkmark" onPress={approve} loading={busy === 'approve'} disabled={!!busy} small />
      </View>
    </GlassCard>
  );
}

export default function SmsScreen() {
  const { t } = useTheme();
  const toast = useToast();
  const { setPendingCount } = useApp();
  const [parsed, setParsed] = useState({});
  const parsedRef = useRef({});
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(null);
  const scanningRef = useRef(false);
  const [showPaste, setShowPaste] = useState(!smsReadingSupported);
  const [sender, setSender] = useState('');
  const [body, setBody] = useState('');
  const [pasting, setPasting] = useState(false);

  const { data, loading, error, refreshing, refresh, reload } = useLoad(async () => {
    const [p, c] = await Promise.all([api.sms.pending(), api.categories.list()]);
    return { list: p.pendingList || [], categories: c.categories || [] };
  }, []);

  useEffect(() => { if (data) setPendingCount(data.list.length); }, [data, setPendingCount]);

  // The pending list doesn't include the parsed amount/merchant, so ask the validate endpoint
  // (it parses without saving anything) and cache the result per message.
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    (async () => {
      for (const item of data.list) {
        if (cancelled) return;
        if (parsedRef.current[item._id] || item.parsed) continue;
        try {
          const v = await api.sms.validate({ sender: item.sender, rawBody: item.rawBody });
          parsedRef.current[item._id] = v;
          if (!cancelled) setParsed({ ...parsedRef.current });
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [data]);

  const infoFor = (item) => {
    const p = item.parsed || parsed[item._id]?.parsed || {};
    return {
      amount: p.amountInPaise ?? item.amountInPaise ?? null,
      merchant: p.merchant || item.merchant || null,
      paymentMode: p.paymentMode || item.paymentMode || 'ONLINE',
    };
  };

  const scan = useCallback(async (quiet = false) => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    setProgress(null);
    try {
      if (!(await hasSmsPermission()) && !(await requestSmsPermission())) {
        if (!quiet) toast('Allow message access to scan for payments', 'error');
        return;
      }
      const r = await scanInbox({ onProgress: setProgress });
      if (r.queued > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        toast(`Found ${r.queued} new payment${r.queued > 1 ? 's' : ''} to review`, 'success');
        reload();
      } else if (!quiet) {
        toast('No new payment messages found');
      }
    } catch (e) {
      if (!quiet) toast(e.message, 'error');
    } finally {
      scanningRef.current = false;
      setScanning(false);
      setProgress(null);
    }
  }, [reload, toast]);

  // Quietly look for new messages when the tab opens (only if permission was already granted).
  useFocusEffect(useCallback(() => {
    (async () => {
      if (!smsReadingSupported || !(await hasSmsPermission())) return;
      const last = Number(await AsyncStorage.getItem(LAST_SCAN_KEY)) || 0;
      if (Date.now() - last > 10 * 60 * 1000) scan(true);
    })();
  }, [scan]));

  const submitPaste = async () => {
    if (!sender.trim() || !body.trim()) return toast('Add the sender and the message text', 'error');
    setPasting(true);
    try {
      await api.sms.ingest({ sender: sender.trim(), rawBody: body.trim(), receivedAt: new Date().toISOString(), autoApprove: false });
      toast('Queued for your review', 'success');
      setBody('');
      reload();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setPasting(false);
    }
  };

  const list = data?.list || [];

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} header={<ScreenHeader title="SMS review" subtitle="Approve payments before they count" />}>
      <GlassCard>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: withAlpha(t.accent, 0.18), alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="scan-outline" size={24} color={t.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="heading">{smsReadingSupported ? 'Find new payments' : 'Add a bank message'}</Txt>
            <Txt variant="caption" color="muted" style={{ marginTop: 2 }}>
              {smsReadingSupported
                ? 'Only bank-style debit messages are sent for review. Nothing is added until you approve it.'
                : Platform.OS === 'ios'
                ? 'iPhones don’t allow apps to read messages. Paste a payment message to review it here.'
                : 'Reading messages needs the Android development build. You can paste a message here meanwhile.'}
            </Txt>
          </View>
        </View>
        {smsReadingSupported && (
          <Button
            style={{ marginTop: 14 }}
            title={scanning ? (progress ? `Checking ${progress.done + 1} of ${progress.total}…` : 'Scanning…') : 'Scan messages'}
            icon="refresh"
            onPress={() => scan(false)}
            loading={scanning}
            small
          />
        )}
        {smsReadingSupported && (
          <Pressable onPress={() => setShowPaste(!showPaste)} style={{ marginTop: 12, alignSelf: 'center' }}>
            <Txt variant="caption" color="accent">{showPaste ? 'Hide manual entry' : 'Paste a message instead'}</Txt>
          </Pressable>
        )}
        {showPaste && (
          <View style={{ gap: 12, marginTop: 16 }}>
            <TextField label="Sender" value={sender} onChangeText={setSender} placeholder="HDFCBK" autoCapitalize="characters" />
            <TextField label="Message" value={body} onChangeText={setBody} placeholder="INR 540.00 debited from A/c XX4321 at SWIGGY…" multiline />
            <Button title="Send for review" onPress={submitPaste} loading={pasting} variant="ghost" small />
          </View>
        )}
      </GlassCard>

      {error && !data ? <ErrorNote message={error} onRetry={refresh} /> : null}

      {loading && !data ? (
        <Txt color="muted" style={{ textAlign: 'center', marginTop: 20 }}>Loading…</Txt>
      ) : list.length === 0 ? (
        <GlassCard>
          <EmptyState icon="checkmark-done-outline" title="All caught up" message="New payment messages will appear here for you to approve or ignore." />
        </GlassCard>
      ) : (
        <>
          <Txt variant="heading">{list.length} waiting for review</Txt>
          {list.map((item) => (
            <PendingCard key={item._id} item={item} info={infoFor(item)} categories={data.categories} onDone={reload} />
          ))}
        </>
      )}
    </Screen>
  );
}
