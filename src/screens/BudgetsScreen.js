import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Switch, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useLoad } from '../hooks';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import { MonthSwitcher, Screen, ScreenHeader } from '../components/Screen';
import { Button, CategoryIcon, ErrorNote, GlassCard, TextField, Txt } from '../components/ui';
import { dateForMonth, formatDay, formatINR, withAlpha } from '../utils/format';

const toPaise = (v) => {
  const n = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};
const SWATCHES = ['#f97316', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#eab308', '#ef4444', '#84cc16'];
const ICONS = ['utensils', 'shopping-bag', 'car', 'home', 'heartbeat', 'film', 'graduation-cap', 'paw', 'plane', 'gift', 'bolt', 'piggy-bank'];

function IncomeCard({ month, incomes, total, onChanged }) {
  const { t } = useTheme();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('Monthly Salary');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const paise = toPaise(amount);
    if (!paise) return toast('Enter an income amount above 0', 'error');
    setBusy(true);
    try {
      await api.incomes.create({ amountInPaise: paise, date: dateForMonth(month), source: source.trim() || 'Income' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast('Income added', 'success');
      setAmount('');
      setOpen(false);
      onChanged();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = (inc) =>
    Alert.alert('Remove income?', `${inc.source || 'Income'} · ${formatINR(inc.amount)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try { await api.incomes.remove(inc._id); onChanged(); } catch (e) { toast(e.message, 'error'); }
        },
      },
    ]);

  return (
    <GlassCard padding={20} radius={28} wash={withAlpha(t.income, 0.06)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Txt color="muted">Income this month</Txt>
          <Txt variant="display" style={{ fontSize: 34, marginTop: 2 }} color="income">{formatINR(total)}</Txt>
        </View>
        <Pressable onPress={() => setOpen(!open)} hitSlop={8}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.glassStrong, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={open ? 'close' : 'add'} size={24} color={t.text} />
          </View>
        </Pressable>
      </View>

      {open && (
        <View style={{ gap: 12, marginTop: 16 }}>
          <TextField label="Amount" prefix="₹" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="85,000" />
          <TextField label="Source" value={source} onChangeText={setSource} placeholder="Monthly Salary" />
          <Button title="Add income" onPress={add} loading={busy} small />
        </View>
      )}

      {incomes.length > 0 && (
        <View style={{ marginTop: 16, gap: 10 }}>
          {incomes.map((inc) => (
            <View key={inc._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyBold">{inc.source || 'Income'}</Txt>
                <Txt variant="caption" color="muted">{formatDay(inc.date)}</Txt>
              </View>
              <Txt variant="bodyBold">{formatINR(inc.amount)}</Txt>
              <Pressable onPress={() => remove(inc)} hitSlop={10}><Ionicons name="trash-outline" size={18} color={t.faint} /></Pressable>
            </View>
          ))}
        </View>
      )}
    </GlassCard>
  );
}

function NewCategory({ onCreated }) {
  const { t } = useTheme();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(SWATCHES[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [isSavings, setIsSavings] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast('Give the category a name', 'error');
    setBusy(true);
    try {
      await api.categories.create({ name: name.trim(), icon, color, isSavings });
      toast('Category added', 'success');
      setName(''); setOpen(false);
      onCreated();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return <Button variant="ghost" icon="add" title="New category" onPress={() => setOpen(true)} small />;
  return (
    <GlassCard>
      <View style={{ gap: 14 }}>
        <TextField label="Category name" value={name} onChangeText={setName} placeholder="Pet Care" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {SWATCHES.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: 3, borderColor: color === c ? t.text : 'transparent' }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {ICONS.map((i) => (
            <Pressable key={i} onPress={() => setIcon(i)} style={{ opacity: icon === i ? 1 : 0.45 }}>
              <CategoryIcon name={i} color={color} size={40} />
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt>This is a savings category</Txt>
          <Switch value={isSavings} onValueChange={setIsSavings} trackColor={{ true: t.accent }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button style={{ flex: 1 }} variant="ghost" title="Cancel" onPress={() => setOpen(false)} small />
          <Button style={{ flex: 1 }} title="Add" onPress={save} loading={busy} small />
        </View>
      </View>
    </GlassCard>
  );
}

export default function BudgetsScreen() {
  const { t } = useTheme();
  const toast = useToast();
  const { month, setMonth } = useApp();
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refreshing, refresh, reload } = useLoad(async () => {
    const [c, b, i] = await Promise.all([api.categories.list(), api.budgets.get(month), api.incomes.list(month)]);
    return { categories: c.categories || [], perf: b, incomes: i.incomes || [], incomeTotal: i.totalInPaise || 0 };
  }, [month]);

  const serverById = useMemo(() => {
    const m = {};
    (data?.perf?.categories || []).forEach((c) => { m[c.categoryId] = c; });
    return m;
  }, [data]);

  // Reset the inputs only when the saved numbers actually change, so edits survive tab switches.
  const sig = data ? JSON.stringify([month, data.categories.map((c) => [c._id, serverById[c._id]?.budgetInPaise || 0])]) : '';
  useEffect(() => {
    if (!data) return;
    const next = {};
    data.categories.forEach((c) => {
      const p = serverById[c._id]?.budgetInPaise || 0;
      next[c._id] = p ? String(p / 100) : '';
    });
    setValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const categories = data?.categories || [];
  const allocated = categories.reduce((s, c) => s + toPaise(values[c._id]), 0);
  const income = data?.incomeTotal || 0;
  const unallocated = income - allocated;
  const dirty = categories.filter((c) => toPaise(values[c._id]) !== (serverById[c._id]?.budgetInPaise || 0));

  const save = async () => {
    setSaving(true);
    try {
      await api.budgets.saveBatch(month, dirty.map((c) => ({ categoryId: c._id, amountInRupees: toPaise(values[c._id]) / 100 })));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast('Budgets saved', 'success');
      await reload();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const footer = dirty.length > 0 && (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 20, right: 20, bottom: 104 }}>
      <Button title={`Save ${dirty.length} change${dirty.length > 1 ? 's' : ''}`} icon="checkmark" onPress={save} loading={saving} />
    </View>
  );

  return (
    <Screen
      onRefresh={refresh}
      refreshing={refreshing}
      footer={footer}
      header={<ScreenHeader title="Budgets" subtitle="Plan each category for the month" />}
    >
      <MonthSwitcher month={month} onChange={setMonth} />
      {error && !data ? <ErrorNote message={error} onRetry={refresh} /> : null}
      {loading || !data ? (
        <Txt color="muted" style={{ textAlign: 'center', marginTop: 40 }}>Loading budgets…</Txt>
      ) : (
        <>
          <IncomeCard month={month} incomes={data.incomes} total={income} onChanged={reload} />

          <GlassCard padding={16} wash={income > 0 ? withAlpha(unallocated < 0 ? t.bad : t.good, 0.08) : undefined}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Txt variant="caption" color="muted">Allocated</Txt>
                <Txt variant="num">{formatINR(allocated)}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt variant="caption" color="muted">{unallocated < 0 ? 'Over income by' : 'Still unallocated'}</Txt>
                <Txt variant="num" color={income === 0 ? 'muted' : unallocated < 0 ? 'bad' : 'good'}>{income === 0 ? '—' : formatINR(Math.abs(unallocated))}</Txt>
              </View>
            </View>
          </GlassCard>

          <GlassCard padding={6}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              {categories.map((c, idx) => {
                const spent = serverById[c._id]?.spentInPaise || 0;
                return (
                  <View key={c._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: idx ? 1 : 0, borderTopColor: t.track }}>
                    <CategoryIcon name={c.icon} color={c.color} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="bodyBold" numberOfLines={1}>{c.name}</Txt>
                      <Txt variant="caption" color="muted">
                        {c.isSavings ? 'Savings goal' : spent > 0 ? `Spent ${formatINR(spent)}` : 'Nothing spent yet'}
                      </Txt>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: 118, paddingHorizontal: 12, borderRadius: 14, backgroundColor: t.input, borderWidth: 1, borderColor: toPaise(values[c._id]) !== (serverById[c._id]?.budgetInPaise || 0) ? t.accent : t.border }}>
                      <Txt color="muted" variant="bodyBold">₹</Txt>
                      <TextInput
                        value={values[c._id] ?? ''}
                        onChangeText={(v) => setValues((s) => ({ ...s, [c._id]: v.replace(/[^0-9.]/g, '') }))}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={t.faint}
                        style={{ flex: 1, paddingVertical: 11, paddingLeft: 6, color: t.text, fontFamily: 'Sora_600SemiBold', fontSize: 15, textAlign: 'right' }}
                      />
                    </View>
                  </View>
                );
              })}
              {categories.length === 0 && <Txt color="muted" style={{ padding: 16 }}>No categories yet. Add your first one below.</Txt>}
            </KeyboardAvoidingView>
          </GlassCard>

          <NewCategory onCreated={reload} />
        </>
      )}
    </Screen>
  );
}
