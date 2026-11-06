import { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ArrowUpRight,
  Clock,
  FileX,
  Calendar,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { getExceptions, updateExceptionStatus } from '../lib/api';
import { RECONCILIATIONS } from '../lib/data';
import type { Exception, ExceptionStatus } from '../lib/types';
import {
  formatCurrency,
  formatDate,
  agingBg,
  exceptionTypeColor,
  exceptionTypeLabel,
  statusColor,
  statusLabel,
  confidenceColor,
} from '../lib/utils';

type SortKey = 'amount' | 'age' | 'type' | 'status';

const ACTION_BUTTONS: { action: ExceptionStatus; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { action: 'approved', label: 'Approve Match', icon: CheckCircle2, color: 'text-accent-green hover:bg-accent-green-dim' },
  { action: 'force_matched', label: 'Force Match', icon: ArrowUpRight, color: 'text-blue-400 hover:bg-blue-900/30' },
  { action: 'written_off', label: 'Write Off', icon: FileX, color: 'text-text-muted hover:bg-bg-elevated' },
  { action: 'escalated', label: 'Escalate', icon: AlertTriangle, color: 'text-accent-amber hover:bg-accent-amber-dim' },
  { action: 'deferred', label: 'Defer', icon: Calendar, color: 'text-text-secondary hover:bg-bg-elevated' },
];

function JustificationModal({
  onConfirm,
  onCancel,
  action,
}: {
  onConfirm: (note: string) => void;
  onCancel: () => void;
  action: string;
}) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-surface border border-border-default rounded-xl p-5 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-text-primary">{action} — Justification Required</h3>
          <button onClick={onCancel} className="text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Enter justification for this action…"
          className="input-field w-full h-24 resize-none mb-4"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary text-xs">Cancel</button>
          <button
            onClick={() => note.trim() && onConfirm(note)}
            disabled={!note.trim()}
            className="btn-primary text-xs disabled:opacity-40"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function ExceptionRow({ exc, onAction }: { exc: Exception; onAction: (id: string, status: ExceptionStatus, note?: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [pendingAction, setPendingAction] = useState<ExceptionStatus | null>(null);

  function handleAction(action: ExceptionStatus) {
    if (action === 'force_matched' || action === 'escalated') {
      setPendingAction(action);
    } else {
      onAction(exc.id, action);
    }
  }

  const rec = RECONCILIATIONS.find(r => r.id === exc.reconciliationId);

  return (
    <>
      {pendingAction && (
        <JustificationModal
          action={statusLabel(pendingAction)}
          onConfirm={note => {
            onAction(exc.id, pendingAction, note);
            setPendingAction(null);
          }}
          onCancel={() => setPendingAction(null)}
        />
      )}
      <tr
        className="border-b border-border-subtle hover:bg-bg-elevated/50 transition-colors cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-3 w-5">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
        </td>
        <td className="px-3 py-3">
          <span className="text-xs text-financial text-text-primary font-medium">
            {exc.sourceAItem?.ref ?? exc.sourceBItem?.ref ?? '—'}
          </span>
        </td>
        <td className="px-3 py-3">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${exceptionTypeColor(exc.type)}`}>
            {exceptionTypeLabel(exc.type)}
          </span>
        </td>
        <td className="px-3 py-3 text-xs text-text-secondary max-w-[160px]">
          <span className="truncate block">{exc.sourceAItem?.vendor ?? exc.sourceBItem?.vendor ?? '—'}</span>
        </td>
        <td className="px-3 py-3 text-right">
          <span className="text-xs text-financial font-semibold text-text-primary">
            {formatCurrency(exc.sourceAItem?.amount ?? exc.sourceBItem?.amount ?? 0)}
          </span>
        </td>
        <td className="px-3 py-3 text-right">
          {exc.difference > 0 ? (
            <span className="text-xs text-financial text-accent-red-light font-semibold">
              {formatCurrency(exc.difference)}
            </span>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </td>
        <td className="px-3 py-3">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${agingBg(exc.agingBucket)}`}>
            {exc.agingBucket}
          </span>
        </td>
        <td className="px-3 py-3">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusColor(exc.status)}`}>
            {statusLabel(exc.status)}
          </span>
        </td>
        <td className="px-3 py-3 text-xs text-text-muted">
          {exc.assignee ?? '—'}
        </td>
        <td className="px-3 py-3 text-right text-xs text-text-secondary">
          {rec?.name.split(' ').slice(0, 2).join(' ')}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-bg-elevated/30 border-b border-border-subtle">
          <td colSpan={10} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Both sides */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Transaction Detail</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Source A */}
                  <div className="bg-bg-surface rounded-lg p-3 border border-accent-purple/20">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold bg-accent-purple-dim text-accent-purple-light px-1.5 py-0.5 rounded">SOURCE A</span>
                      <span className="text-[10px] text-text-muted">{rec?.sourceALabel}</span>
                    </div>
                    {exc.sourceAItem ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Ref</span>
                          <span className="text-financial text-text-primary">{exc.sourceAItem.ref}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Vendor</span>
                          <span className="text-text-secondary truncate max-w-[140px] text-right">{exc.sourceAItem.vendor}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Amount</span>
                          <span className="text-financial font-semibold text-text-primary">{formatCurrency(exc.sourceAItem.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Date</span>
                          <span className="text-financial text-text-secondary">{formatDate(exc.sourceAItem.date)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted italic">Not found in source A</p>
                    )}
                  </div>

                  {/* Source B */}
                  <div className="bg-bg-surface rounded-lg p-3 border border-blue-500/20">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">SOURCE B</span>
                      <span className="text-[10px] text-text-muted">{rec?.sourceBLabel}</span>
                    </div>
                    {exc.sourceBItem ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Ref</span>
                          <span className="text-financial text-text-primary">{exc.sourceBItem.ref}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Vendor</span>
                          <span className="text-text-secondary truncate max-w-[140px] text-right">{exc.sourceBItem.vendor}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Amount</span>
                          <span className="text-financial font-semibold text-text-primary">{formatCurrency(exc.sourceBItem.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Date</span>
                          <span className="text-financial text-text-secondary">{formatDate(exc.sourceBItem.date)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted italic">Not found in source B</p>
                    )}
                  </div>
                </div>

                {exc.difference > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-accent-red-dim/20 rounded-lg border border-accent-red/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-accent-red-light shrink-0" />
                    <span className="text-xs text-text-secondary">
                      Amount difference: <span className="text-financial font-bold text-accent-red-light">{formatCurrency(exc.difference)}</span>
                    </span>
                  </div>
                )}

                {exc.escalationNote && (
                  <div className="px-3 py-2 bg-amber-900/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-400 font-semibold mb-0.5">Escalation Note</p>
                    <p className="text-xs text-text-secondary">{exc.escalationNote}</p>
                  </div>
                )}
              </div>

              {/* Suggested matches + actions */}
              <div className="space-y-3">
                {exc.suggestedMatches.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Suggested Matches</p>
                    {exc.suggestedMatches.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 bg-bg-surface border border-border-default rounded-lg mb-1">
                        <span className="text-xs text-text-secondary truncate">{s.reason}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                          confidenceColor(s.score >= 100 ? 'exact' : s.score >= 95 ? 'high' : s.score >= 80 ? 'medium' : 'low')
                        }`}>
                          {s.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {exc.status === 'pending' || exc.status === 'escalated' ? (
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Resolution Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ACTION_BUTTONS.map(({ action, label, icon: Icon, color }) => (
                        <button
                          key={action}
                          onClick={(e) => { e.stopPropagation(); handleAction(action); }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-bg-surface border border-border-default ${color}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                    {exc.type === 'amount_diff' && exc.difference < 10 && (
                      <p className="text-[10px] text-text-muted mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Auto write-off eligible (diff &lt; $10.00 threshold)
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-accent-green-dim/20 border border-accent-green/20 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
                    <span className="text-xs text-accent-green-light font-medium">
                      Resolved — {statusLabel(exc.status)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ExceptionQueue() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('age');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');

  useEffect(() => {
    getExceptions().then(data => {
      setExceptions(data);
      setLoading(false);
    });
  }, []);

  async function handleAction(id: string, status: ExceptionStatus, note?: string) {
    try {
      await updateExceptionStatus(id, status, note);
      setExceptions(prev =>
        prev.map(e =>
          e.id === id ? { ...e, status, justification: note ?? e.justification, updatedAt: new Date().toISOString() } : e
        )
      );
      toast.success(`Exception ${statusLabel(status).toLowerCase()} successfully`);
    } catch {
      toast.error('Failed to update exception');
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const filtered = useMemo(() => {
    let result = [...exceptions];
    if (filterType !== 'all') result = result.filter(e => e.type === filterType);
    if (filterStatus === 'active') result = result.filter(e => e.status === 'pending' || e.status === 'escalated');
    else if (filterStatus === 'resolved') result = result.filter(e => !['pending', 'escalated'].includes(e.status));

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'amount') cmp = (a.sourceAItem?.amount ?? 0) - (b.sourceAItem?.amount ?? 0);
      else if (sortKey === 'age') cmp = a.ageHours - b.ageHours;
      else if (sortKey === 'type') cmp = a.type.localeCompare(b.type);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [exceptions, filterType, filterStatus, sortKey, sortDir]);

  const activeCounts = {
    '<24h': exceptions.filter(e => e.agingBucket === '<24h' && ['pending', 'escalated'].includes(e.status)).length,
    '1-3d': exceptions.filter(e => e.agingBucket === '1-3d' && ['pending', 'escalated'].includes(e.status)).length,
    '4-7d': exceptions.filter(e => e.agingBucket === '4-7d' && ['pending', 'escalated'].includes(e.status)).length,
    '>7d': exceptions.filter(e => e.agingBucket === '>7d' && ['pending', 'escalated'].includes(e.status)).length,
  };

  function SortTh({ k, label }: { k: SortKey; label: string }) {
    return (
      <th
        className="px-3 py-3 text-left text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none whitespace-nowrap"
        onClick={() => toggleSort(k)}
      >
        {label}
        {sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
      </th>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Exception Management Queue</h1>
          <p className="text-sm text-text-muted mt-0.5">Review, action, and resolve reconciliation exceptions</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-red-dim border border-accent-red/20 text-xs text-accent-red-light font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          {exceptions.filter(e => ['pending', 'escalated'].includes(e.status)).length} pending
        </div>
      </div>

      {/* Aging buckets */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {(Object.entries(activeCounts) as [string, number][]).map(([bucket, count]) => {
          const colors: Record<string, string> = {
            '<24h': 'border-accent-green/20 bg-accent-green-dim/10',
            '1-3d': 'border-amber-500/20 bg-amber-900/10',
            '4-7d': 'border-orange-500/20 bg-orange-900/10',
            '>7d': 'border-accent-red/20 bg-accent-red-dim/10',
          };
          const textColors: Record<string, string> = {
            '<24h': 'text-accent-green',
            '1-3d': 'text-amber-400',
            '4-7d': 'text-orange-400',
            '>7d': 'text-accent-red-light',
          };
          return (
            <div key={bucket} className={`rounded-xl border p-3 text-center ${colors[bucket]}`}>
              <div className={`text-2xl font-bold text-financial ${textColors[bucket]}`}>{count}</div>
              <div className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wide">{bucket}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-bg-surface rounded-lg p-1 border border-border-subtle">
          {(['active', 'resolved', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filterStatus === s ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="input-field text-xs"
        >
          <option value="all">All Types</option>
          <option value="missing_source_a">Missing in Source A</option>
          <option value="missing_source_b">Missing in Source B</option>
          <option value="amount_diff">Amount Mismatch</option>
          <option value="timing">Timing Difference</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 shimmer rounded-lg" />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-default">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="bg-bg-elevated border-b border-border-default">
                <th className="w-6 px-4 py-3" />
                <th className="px-3 py-3 text-left text-text-muted font-medium">Reference</th>
                <th className="px-3 py-3 text-left text-text-muted font-medium">Type</th>
                <th className="px-3 py-3 text-left text-text-muted font-medium">Vendor / Counterparty</th>
                <SortTh k="amount" label="Amount" />
                <th className="px-3 py-3 text-right text-text-muted font-medium">Variance</th>
                <SortTh k="age" label="Aging" />
                <SortTh k="status" label="Status" />
                <th className="px-3 py-3 text-left text-text-muted font-medium">Assignee</th>
                <th className="px-3 py-3 text-right text-text-muted font-medium">Recon</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-text-muted">
                    No exceptions match the current filter
                  </td>
                </tr>
              ) : (
                filtered.map(exc => (
                  <ExceptionRow key={exc.id} exc={exc} onAction={handleAction} />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-text-muted mt-3">
        Click any row to expand details, view suggested matches, and take action.
      </p>
    </div>
  );
}
