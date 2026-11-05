import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useLoad } from '../hooks';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import { MonthSwitcher, Screen, ScreenHeader } from '../components/Screen';
import { CategoryIcon, EmptyState, ErrorNote, GlassCard, ProgressBar, Segmented, Txt } from '../components/ui';
import { formatDay, formatINR, withAlpha } from '../utils/format';

function ExpenseList({ categoryId, month, onChanged }) {
  const { t } = useTheme();
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => api.expenses.list({ month, categoryId, limit: 20 }), [month, categoryId]);

  const remove = (e) =>
    Alert.alert('Delete this expense?', `${e.note || 'Expense'} · ${formatINR(e.amount)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.expenses.remove(e._id); toast('Expense deleted', 'success'); reload(); onChanged(); }
          catch (err) { toast(err.message, 'error'); }
        },
      },
    ]);

  if (loading || !data) return <Txt color="muted" variant="caption" style={{ paddingVertical: 8 }}>Loading transactions…</Txt>;
  const list = data.expenses || [];
  if (list.length === 0) return <Txt color="muted" variant="caption" style={{ paddingVertical: 8 }}>No transactions in this category yet.</Txt>;

  return (
    <View style={{ gap: 12 }}>
      {list.map((e) => (
        <View key={e._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyBold" numberOfLines={1}>{e.note || 'Expense'}</Txt>
            <Txt variant="caption" color="muted">
              {formatDay(e.date)} · {e.paymentMode === 'CASH' ? 'Cash' : 'Online'}{e.source === 'SMS' ? ' · From SMS' : ''}
            </Txt>
          </View>
          <Txt variant="bodyBold">{formatINR(e.amount)}</Txt>
          <Pressable onPress={() => remove(e)} hitSlop={10}><Ionicons name="trash-outline" size={18} color={t.faint} /></Pressable>
        </View>
      ))}
    </View>
  );
}

function CategoryRow({ c, month, onChanged }) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const bad = c.isExceeded || c.flag === 'red';
  const status = bad ? t.bad : t.good;
  const ratio = c.budgetInPaise ? c.spentInPaise / c.budgetInPaise : c.spentInPaise > 0 ? 1 : 0;

  return (
    <GlassCard padding={16} wash={withAlpha(status, 0.07)} borderColor={withAlpha(status, 0.55)}>
      <Pressable onPress={() => setOpen(!open)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <CategoryIcon name={c.icon} color={c.color} />
          <View style={{ flex: 1 }}>
            <Txt variant="bodyBold" numberOfLines={1}>{c.categoryName}</Txt>
            <Txt variant="caption" color="muted">
              {c.budgetInPaise ? `Budget ${formatINR(c.budgetInPaise)}` : 'No budget set'}
            </Txt>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: bad ? t.badSoft : t.goodSoft }}>
            <Txt variant="caption" color={bad ? 'bad' : 'good'}>{c.budgetInPaise ? `${c.percentage ?? Math.round(ratio * 100)}%` : formatINR(c.spentInPaise)}</Txt>
          </View>
        </View>

        <ProgressBar value={ratio} color={status} height={10} style={{ marginTop: 14 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
          <View>
            <Txt variant="caption" color="muted">Spent</Txt>
            <Txt variant="num">{formatINR(c.spentInPaise)}</Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt variant="caption" color="muted">{bad ? 'Over by' : 'Remaining'}</Txt>
            <Txt variant="num" color={bad ? 'bad' : 'good'}>{formatINR(Math.abs(c.remainingInPaise))}</Txt>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10 }}>
          <Txt variant="caption" color="faint">{open ? 'Hide details' : 'Details'}</Txt>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={t.faint} />
        </View>
      </Pressable>

      {open && (
        <View style={{ marginTop: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: t.track, gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt variant="caption" color="muted">Online</Txt>
              <Txt variant="bodyBold">{formatINR(c.onlineSpentInPaise)}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="caption" color="muted">Cash</Txt>
              <Txt variant="bodyBold">{formatINR(c.cashSpentInPaise)}</Txt>
            </View>
          </View>
          <ExpenseList categoryId={c.categoryId} month={month} onChanged={onChanged} />
        </View>
      )}
    </GlassCard>
  );
}

export default function SpendingScreen() {
  const { t } = useTheme();
  const { month, setMonth } = useApp();
  const [filter, setFilter] = useState('all');
  const { data: perf, loading, error, refreshing, refresh, reload } = useLoad(() => api.analytics.budgetPerformance(month), [month]);

  const all = (perf?.categories || []).filter((c) => c.budgetInPaise > 0 || c.spentInPaise > 0);
  const isBad = (c) => c.isExceeded || c.flag === 'red';
  const over = all.filter(isBad);
  const list = (filter === 'over' ? over : filter === 'ok' ? all.filter((c) => !isBad(c)) : all)
    .slice()
    .sort((a, b) => Number(isBad(b)) - Number(isBad(a)) || (b.percentage || 0) - (a.percentage || 0));

  const overall = perf?.overallFlag === 'red';
  const totalBudget = perf?.totalBudgetInPaise || 0;
  const totalSpent = perf?.totalSpentInPaise || 0;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} header={<ScreenHeader title="Spending" subtitle="What’s used and what’s left" />}>
      <MonthSwitcher month={month} onChange={setMonth} />
      {error && !perf ? <ErrorNote message={error} onRetry={refresh} /> : null}
      {loading || !perf ? (
        <Txt color="muted" style={{ textAlign: 'center', marginTop: 40 }}>Loading spending…</Txt>
      ) : (
        <>
          <GlassCard padding={22} radius={28} wash={withAlpha(overall ? t.bad : t.good, 0.08)} borderColor={withAlpha(overall ? t.bad : t.good, 0.55)}>
            <Txt color="muted">{overall ? 'Over budget overall by' : 'Left to spend overall'}</Txt>
            <Txt variant="display" style={{ fontSize: 38, marginTop: 4 }} color={overall ? 'bad' : 'good'} adjustsFontSizeToFit numberOfLines={1}>
              {formatINR(Math.abs(perf.totalRemainingInPaise ?? totalBudget - totalSpent))}
            </Txt>
            <ProgressBar value={totalBudget ? totalSpent / totalBudget : 0} color={overall ? t.bad : t.good} height={10} style={{ marginTop: 16 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Txt variant="caption" color="muted">Spent {formatINR(totalSpent)}</Txt>
              <Txt variant="caption" color="muted">Budget {formatINR(totalBudget)}</Txt>
            </View>
            {over.length > 0 && (
              <Txt variant="caption" color="bad" style={{ marginTop: 10 }}>
                {over.length} {over.length === 1 ? 'category is' : 'categories are'} over budget.
              </Txt>
            )}
          </GlassCard>

          <Segmented
            value={filter}
            onChange={setFilter}
            options={[{ key: 'all', label: 'All' }, { key: 'over', label: 'Over budget' }, { key: 'ok', label: 'On track' }]}
          />

          {list.length === 0 ? (
            <GlassCard>
              <EmptyState
                icon={filter === 'over' ? 'checkmark-circle-outline' : 'wallet-outline'}
                title={filter === 'over' ? 'Nothing over budget' : 'No categories to show'}
                message={filter === 'all' ? 'Set budgets in the Budgets tab and spending will appear here.' : undefined}
              />
            </GlassCard>
          ) : (
            list.map((c) => <CategoryRow key={c.categoryId} c={c} month={month} onChanged={reload} />)
          )}
        </>
      )}
    </Screen>
  );
}
