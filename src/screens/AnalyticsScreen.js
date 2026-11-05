import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLoad } from '../hooks';
import { useTheme } from '../theme';
import { Screen, ScreenHeader, MonthSwitcher, YearSwitcher } from '../components/Screen';
import { Donut, GroupedBars, LineArea, SplitBar } from '../components/charts';
import { CategoryIcon, EmptyState, ErrorNote, GlassCard, ProgressBar, Segmented, Txt } from '../components/ui';
import { MONTHS_SHORT, formatCompact, formatINR, sum, withAlpha } from '../utils/format';

function Stat({ label, value, color }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt variant="caption" color="muted">{label}</Txt>
      <Txt variant="num" color={color} style={{ marginTop: 3 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Txt>
    </View>
  );
}

function Dot({ color }) {
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />;
}

function Hero({ title, amount, subtitle, positive }) {
  const { t } = useTheme();
  return (
    <GlassCard padding={22} radius={28} wash={withAlpha(positive ? t.good : t.bad, 0.07)}>
      <Txt color="muted">{title}</Txt>
      <Txt variant="display" style={{ fontSize: 38, marginTop: 4 }} color={positive ? 'good' : 'bad'} adjustsFontSizeToFit numberOfLines={1}>{amount}</Txt>
      <Txt color="muted" style={{ marginTop: 4 }}>{subtitle}</Txt>
    </GlassCard>
  );
}

function MonthlyView({ month }) {
  const { t } = useTheme();
  const { data, loading, error, refresh } = useLoad(async () => {
    const [perf, inc] = await Promise.all([api.analytics.budgetPerformance(month), api.incomes.list(month)]);
    return { perf, income: inc.totalInPaise || 0 };
  }, [month]);

  if (error && !data) return <ErrorNote message={error} onRetry={refresh} />;
  if (loading || !data) return <Txt color="muted" style={{ textAlign: 'center', marginTop: 40 }}>Loading your month…</Txt>;

  const { perf, income } = data;
  const cats = perf.categories || [];
  const spent = perf.totalSpentInPaise || 0;
  const left = income - spent;
  const spentCats = cats.filter((c) => c.spentInPaise > 0).sort((a, b) => b.spentInPaise - a.spentInPaise);
  const top = spentCats.slice(0, 5);
  const rest = sum(spentCats.slice(5), 'spentInPaise');
  const segments = [...top.map((c) => ({ value: c.spentInPaise, color: c.color || t.accent, name: c.categoryName })), ...(rest > 0 ? [{ value: rest, color: t.faint, name: 'Other' }] : [])];
  const online = sum(cats, 'onlineSpentInPaise');
  const cash = sum(cats, 'cashSpentInPaise');
  const budgeted = cats.filter((c) => c.budgetInPaise > 0 || c.spentInPaise > 0).sort((a, b) => b.percentage - a.percentage);

  return (
    <>
      <Hero
        title={income > 0 ? (left >= 0 ? 'Left from your income' : 'Spent beyond your income') : 'Spent this month'}
        amount={income > 0 ? formatINR(Math.abs(left)) : formatINR(spent)}
        positive={income > 0 ? left >= 0 : perf.overallFlag !== 'red'}
        subtitle={income > 0 ? `Income ${formatINR(income)} · Spent ${formatINR(spent)}` : 'Add this month’s income in Budgets to see what’s left.'}
      />

      <GlassCard>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat label="Income" value={formatINR(income)} color="income" />
          <Stat label="Budgeted" value={formatINR(perf.totalBudgetInPaise)} />
          <Stat label="Spent" value={formatINR(spent)} color={perf.overallFlag === 'red' ? 'bad' : 'text'} />
        </View>
      </GlassCard>

      <GlassCard>
        <Txt variant="heading" style={{ marginBottom: 14 }}>Where your money went</Txt>
        {segments.length === 0 ? (
          <EmptyState icon="pie-chart-outline" title="No spending yet" message="Approved SMS payments and expenses will show up here." />
        ) : (
          <View style={{ alignItems: 'center', gap: 18 }}>
            <Donut segments={segments}>
              <Txt variant="caption" color="muted">Total</Txt>
              <Txt variant="num" adjustsFontSizeToFit numberOfLines={1}>{formatCompact(spent)}</Txt>
            </Donut>
            <View style={{ alignSelf: 'stretch', gap: 10 }}>
              {segments.map((s) => (
                <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Dot color={s.color} />
                  <Txt style={{ flex: 1 }}>{s.name}</Txt>
                  <Txt variant="bodyBold">{formatINR(s.value)}</Txt>
                  <Txt color="muted" style={{ width: 44, textAlign: 'right' }}>{Math.round((s.value / Math.max(1, sum(segments, 'value'))) * 100)}%</Txt>
                </View>
              ))}
            </View>
          </View>
        )}
      </GlassCard>

      <GlassCard>
        <Txt variant="heading" style={{ marginBottom: 14 }}>Budget vs spent</Txt>
        {budgeted.length === 0 ? (
          <EmptyState icon="wallet-outline" title="No budgets yet" message="Set a budget for each category in the Budgets tab." />
        ) : (
          <View style={{ gap: 16 }}>
            {budgeted.map((c) => {
              const bad = c.isExceeded || c.flag === 'red';
              return (
                <View key={c.categoryId} style={{ gap: 7 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CategoryIcon name={c.icon} color={c.color} size={30} />
                    <Txt variant="bodyBold" style={{ flex: 1 }}>{c.categoryName}</Txt>
                    <Txt color={bad ? 'bad' : 'muted'} variant="caption">{formatCompact(c.spentInPaise)} / {formatCompact(c.budgetInPaise)}</Txt>
                  </View>
                  <ProgressBar value={c.budgetInPaise ? c.spentInPaise / c.budgetInPaise : 1} color={bad ? t.bad : t.good} />
                </View>
              );
            })}
          </View>
        )}
      </GlassCard>

      {online + cash > 0 && (
        <GlassCard>
          <Txt variant="heading" style={{ marginBottom: 12 }}>Online vs cash</Txt>
          <SplitBar aPercent={(online / (online + cash)) * 100} aColor={t.accent} bColor={t.accent2} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Dot color={t.accent} /><Txt>Online {formatINR(online)}</Txt></View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Dot color={t.accent2} /><Txt>Cash {formatINR(cash)}</Txt></View>
          </View>
        </GlassCard>
      )}
    </>
  );
}

function YearlyView({ year }) {
  const { t } = useTheme();
  const [sel, setSel] = useState(null);
  const { data, loading, error, refresh } = useLoad(() => api.analytics.annual(year), [year]);

  if (error && !data) return <ErrorNote message={error} onRetry={refresh} />;
  if (loading || !data) return <Txt color="muted" style={{ textAlign: 'center', marginTop: 40 }}>Loading your year…</Txt>;

  const months = data.months || [];
  const income = data.totalYearIncomeInPaise || 0;
  const expense = data.totalYearExpenseInPaise || 0;
  const savings = data.totalYearSavingsInPaise ?? income - expense;
  const rate = income > 0 ? Math.round((savings / income) * 100) : null;
  const label = (m) => MONTHS_SHORT[Number(m.month.slice(5, 7)) - 1];
  const costly = months.find((m) => m.isMostCostly);
  const saving = months.find((m) => m.isMostSaving);
  const picked = sel != null ? months[sel] : null;
  const pm = data.paymentModeRatio;

  return (
    <>
      <Hero
        title={`Saved in ${year}`}
        amount={formatINR(savings)}
        positive={savings >= 0}
        subtitle={rate != null ? `That’s ${rate}% of your ${formatINR(income)} income.` : 'Add income to see your savings rate.'}
      />

      <GlassCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Txt variant="heading">Income and expenses</Txt>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Dot color={t.income} /><Txt variant="caption" color="muted">Income</Txt></View>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Dot color={t.expense} /><Txt variant="caption" color="muted">Expense</Txt></View>
          </View>
        </View>
        <GroupedBars
          data={months.map((m) => ({ key: m.month, label: label(m), a: m.incomeInPaise, b: m.expenseInPaise }))}
          aColor={t.income}
          bColor={t.expense}
          selectedIndex={sel}
          onSelect={(i) => setSel(sel === i ? null : i)}
        />
        {picked ? (
          <View style={{ marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: t.input, gap: 8 }}>
            <Txt variant="bodyBold">{picked.label}</Txt>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Stat label="Income" value={formatINR(picked.incomeInPaise)} color="income" />
              <Stat label="Expense" value={formatINR(picked.expenseInPaise)} color="expense" />
              <Stat label="Saved" value={`${picked.savingsRatePercent ?? 0}%`} color={picked.savingsInPaise >= 0 ? 'good' : 'bad'} />
            </View>
          </View>
        ) : (
          <Txt variant="caption" color="faint" style={{ marginTop: 10 }}>Tap a month to see its numbers.</Txt>
        )}
      </GlassCard>

      {(costly || saving) && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {costly && (
            <GlassCard style={{ flex: 1 }} padding={16} wash={t.badSoft}>
              <Txt variant="caption" color="muted">Costliest month</Txt>
              <Txt variant="heading" style={{ marginTop: 4 }}>{costly.label}</Txt>
              <Txt color="bad" variant="bodyBold">{formatINR(costly.expenseInPaise)}</Txt>
            </GlassCard>
          )}
          {saving && (
            <GlassCard style={{ flex: 1 }} padding={16} wash={t.goodSoft}>
              <Txt variant="caption" color="muted">Best saving month</Txt>
              <Txt variant="heading" style={{ marginTop: 4 }}>{saving.label}</Txt>
              <Txt color="good" variant="bodyBold">{formatINR(saving.savingsInPaise)}</Txt>
            </GlassCard>
          )}
        </View>
      )}

      <GlassCard>
        <Txt variant="heading" style={{ marginBottom: 8 }}>Savings trend</Txt>
        <LineArea data={months.map((m) => ({ label: label(m), value: m.savingsInPaise }))} color={t.accent} />
      </GlassCard>

      {pm && pm.onlineInPaise + pm.cashInPaise > 0 && (
        <GlassCard>
          <Txt variant="heading" style={{ marginBottom: 12 }}>Online vs cash</Txt>
          <SplitBar aPercent={pm.onlinePercent} aColor={t.accent} bColor={t.accent2} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Dot color={t.accent} /><Txt>Online {pm.onlinePercent}%</Txt></View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Dot color={t.accent2} /><Txt>Cash {pm.cashPercent}%</Txt></View>
          </View>
        </GlassCard>
      )}
    </>
  );
}

export default function AnalyticsScreen() {
  const { month, setMonth } = useApp();
  const { user, signOut } = useAuth();
  const [view, setView] = useState('month');
  const [year, setYear] = useState(new Date().getFullYear());

  const confirmLogout = () =>
    Alert.alert('Sign out?', 'You’ll need a new code to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);

  return (
    <Screen header={<ScreenHeader title="Insights" subtitle={user?.name ? `Hi ${user.name.split(' ')[0]}, here’s your money at a glance` : 'Your money at a glance'} onLogout={confirmLogout} />}>
      <Segmented value={view} onChange={setView} options={[{ key: 'month', label: 'Monthly' }, { key: 'year', label: 'Yearly' }]} />
      {view === 'month' ? (
        <>
          <MonthSwitcher month={month} onChange={setMonth} />
          <MonthlyView month={month} />
        </>
      ) : (
        <>
          <YearSwitcher year={year} onChange={setYear} />
          <YearlyView year={year} />
        </>
      )}
    </Screen>
  );
}
