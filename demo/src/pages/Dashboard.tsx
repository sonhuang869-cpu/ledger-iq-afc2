import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, ArrowRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getReconciliations } from '../lib/api';
import { TREND_DATA, ALL_EXCEPTIONS } from '../lib/data';
import type { ReconciliationPeriod } from '../lib/types';
import { formatCurrency, formatPercent } from '../lib/utils';

const AGING_DATA = [
  { label: '< 24h', count: 2, color: '#059669' },
  { label: '1–3 days', count: 2, color: '#F59E0B' },
  { label: '4–7 days', count: 2, color: '#F97316' },
  { label: '> 7 days', count: 1, color: '#DC2626' },
];

const TOP_SOURCES = [
  { vendor: 'AT&T Wholesale Solutions', count: 2, totalValue: 40250.00, type: 'Amount Mismatch' },
  { vendor: 'NTT Communications Corp', count: 1, totalValue: 90.00, type: 'Amount Mismatch' },
  { vendor: 'Lumen Technologies Inc', count: 1, totalValue: 31500.00, type: 'Missing in Bank' },
  { vendor: 'Telia Carrier AB', count: 1, totalValue: 0, type: 'Timing Difference' },
  { vendor: 'Orange Business Services', count: 1, totalValue: 44.00, type: 'Amount Mismatch' },
];

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="card flex gap-4 items-start">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-text-muted font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-text-primary text-financial mt-0.5">{value}</p>
        {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SlaRow({ label, pct, target }: { label: string; pct: number; target: number }) {
  const met = pct >= target;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className={`text-xs font-bold text-financial ${met ? 'text-accent-green' : 'text-accent-red'}`}>
          {pct}% <span className="text-text-muted font-normal">/ target {target}%</span>
        </span>
      </div>
      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${met ? 'bg-accent-green' : 'bg-accent-red'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [recs, setRecs] = useState<ReconciliationPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReconciliations().then(data => {
      setRecs(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl shimmer" />
        ))}
      </div>
    );
  }

  const activeRecs = recs.filter(r => r.status !== 'closed');
  const totalItems = recs.reduce((s, r) => s + r.totalItems, 0);
  const totalMatched = recs.reduce((s, r) => s + r.matchedItems, 0);
  const overallRate = totalItems > 0 ? (totalMatched / totalItems) * 100 : 0;
  const totalExceptions = ALL_EXCEPTIONS.filter(e => e.status === 'pending' || e.status === 'escalated').length;

  // SLA: resolved within 24h = 2 (EXC-003, EXC-008 are <24h but still pending)
  // Simulate historical resolution data
  const sla24 = 72;
  const sla48 = 86;
  const sla72 = 94;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Operations Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">October 2026 — Active Reconciliation Period</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-green-dim border border-accent-green/20 text-xs text-accent-green-light font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          2 Active Periods
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="Overall Match Rate"
          value={formatPercent(overallRate)}
          sub={`${totalMatched} of ${totalItems} items`}
          color="bg-accent-purple-dim text-accent-purple-light"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Open Exceptions"
          value={String(totalExceptions)}
          sub="8 pending resolution"
          color="bg-accent-red-dim text-accent-red-light"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Closed Periods"
          value="1"
          sub="Sep 2026 — Intercompany"
          color="bg-accent-green-dim text-accent-green-light"
        />
        <KpiCard
          icon={Clock}
          label="SLA Compliance"
          value={`${sla48}%`}
          sub="Resolved within 48h"
          color="bg-blue-900/30 text-blue-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Match Rate Trend */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Match Rate Trend</h2>
            <span className="text-xs text-text-muted">6-month rolling view</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={TREND_DATA} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D2D4A" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis domain={[85, 102]} tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#1E1E38', border: '1px solid #3D3D60', borderRadius: 8 }}
                labelStyle={{ color: '#F1F5F9', fontSize: 11 }}
                formatter={(v: number) => [`${v}%`, 'Match Rate']}
              />
              <Line
                type="monotone"
                dataKey="matchRate"
                stroke="#7C3AED"
                strokeWidth={2.5}
                dot={{ fill: '#7C3AED', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#8B5CF6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Exception Aging */}
        <div className="card">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Exception Aging</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={AGING_DATA} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D2D4A" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748B' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{ background: '#1E1E38', border: '1px solid #3D3D60', borderRadius: 8 }}
                formatter={(v: number) => [v, 'Exceptions']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {AGING_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Exception Sources */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Top Exception Sources</h2>
            <Link to="/exceptions" className="text-xs text-accent-purple-light hover:text-accent-purple flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left pb-2 text-text-muted font-medium">Vendor / Counterparty</th>
                  <th className="text-center pb-2 text-text-muted font-medium">Count</th>
                  <th className="text-left pb-2 text-text-muted font-medium">Type</th>
                  <th className="text-right pb-2 text-text-muted font-medium">Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {TOP_SOURCES.map((row, i) => (
                  <tr key={i} className="table-row-hover">
                    <td className="py-2.5 text-text-primary font-medium">{row.vendor}</td>
                    <td className="py-2.5 text-center">
                      <span className="bg-bg-elevated rounded px-2 py-0.5 text-financial">{row.count}</span>
                    </td>
                    <td className="py-2.5 text-text-secondary">{row.type}</td>
                    <td className="py-2.5 text-right text-financial font-medium text-text-primary">
                      {row.totalValue > 0 ? formatCurrency(row.totalValue) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SLA Tracker */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-accent-purple-light" />
            <h2 className="text-sm font-semibold text-text-primary">SLA Tracker</h2>
          </div>
          <div className="space-y-5">
            <SlaRow label="Resolved within 24h" pct={sla24} target={80} />
            <SlaRow label="Resolved within 48h" pct={sla48} target={90} />
            <SlaRow label="Resolved within 72h" pct={sla72} target={95} />
          </div>
          <div className="mt-5 pt-4 border-t border-border-subtle">
            <p className="text-xs text-text-muted">Based on Oct 2026 exception volume</p>
            <p className="text-xs text-text-secondary mt-1">1 exception has breached 7-day threshold</p>
          </div>
        </div>
      </div>

      {/* Active Reconciliations */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Active Reconciliation Periods</h2>
          <Link to="/reconciliations" className="text-xs text-accent-purple-light hover:text-accent-purple flex items-center gap-1">
            Manage all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left pb-2 text-text-muted font-medium">Reconciliation</th>
                <th className="text-right pb-2 text-text-muted font-medium">Items</th>
                <th className="text-right pb-2 text-text-muted font-medium">Match Rate</th>
                <th className="text-right pb-2 text-text-muted font-medium">Exceptions</th>
                <th className="text-right pb-2 text-text-muted font-medium">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {recs.map(rec => (
                <tr key={rec.id} className="table-row-hover">
                  <td className="py-3">
                    <div className="text-text-primary font-medium">{rec.name}</div>
                    <div className="text-text-muted mt-0.5">{rec.period}</div>
                  </td>
                  <td className="py-3 text-right text-financial text-text-secondary">{rec.totalItems}</td>
                  <td className="py-3 text-right">
                    <span className={`text-financial font-semibold ${rec.matchRate >= 95 ? 'text-accent-green' : rec.matchRate >= 90 ? 'text-amber-400' : 'text-accent-red'}`}>
                      {formatPercent(rec.matchRate)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {rec.openExceptions > 0 ? (
                      <span className="text-accent-red-light font-semibold text-financial">{rec.openExceptions}</span>
                    ) : (
                      <span className="text-accent-green">—</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                      rec.status === 'closed'
                        ? 'bg-bg-elevated text-text-muted'
                        : rec.status === 'in_progress'
                        ? 'bg-accent-blue-dim text-blue-400'
                        : 'bg-accent-green-dim text-accent-green-light'
                    }`}>
                      {rec.status === 'closed' ? 'Closed' : rec.status === 'in_progress' ? 'In Progress' : 'Complete'}
                    </span>
                  </td>
                  <td className="py-3 pl-4">
                    {rec.status !== 'closed' && (
                      <Link
                        to={`/reconciliations/${rec.id}`}
                        className="text-accent-purple-light hover:text-accent-purple flex items-center gap-1"
                      >
                        Open <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
