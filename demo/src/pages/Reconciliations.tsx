import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Lock,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { getReconciliations } from '../lib/api';
import type { ReconciliationPeriod } from '../lib/types';
import { formatPercent } from '../lib/utils';

function ReconcCard({ rec }: { rec: ReconciliationPeriod }) {
  const matchPct = rec.matchRate;
  const barColor =
    matchPct >= 95
      ? 'bg-accent-green'
      : matchPct >= 90
      ? 'bg-amber-400'
      : 'bg-accent-red';

  const typeLabel: Record<string, string> = {
    bank_gl: 'Bank / GL',
    ar_subledger: 'AR Subledger',
    intercompany: 'Intercompany',
  };

  return (
    <div className="card hover:border-border-strong transition-colors group">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-accent-purple-light bg-accent-purple-dim px-2 py-0.5 rounded">
              {typeLabel[rec.type]}
            </span>
            {rec.status === 'closed' && (
              <span className="flex items-center gap-1 text-[10px] text-text-muted">
                <Lock className="w-3 h-3" /> Closed
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-text-primary">{rec.name}</h3>
          <p className="text-xs text-text-muted mt-0.5">{rec.period}</p>
        </div>
        <FileSpreadsheet className="w-5 h-5 text-text-muted group-hover:text-accent-purple-light transition-colors shrink-0 mt-0.5" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-financial text-text-primary">{rec.totalItems}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">Items</div>
        </div>
        <div className="text-center border-x border-border-subtle">
          <div className={`text-lg font-bold text-financial ${matchPct >= 95 ? 'text-accent-green' : matchPct >= 90 ? 'text-amber-400' : 'text-accent-red'}`}>
            {formatPercent(matchPct)}
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">Matched</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold text-financial ${rec.openExceptions > 0 ? 'text-accent-red-light' : 'text-accent-green'}`}>
            {rec.openExceptions}
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">Exceptions</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.min(matchPct, 100)}%` }}
        />
      </div>

      {/* Sources */}
      <div className="flex items-center gap-2 mb-4 text-xs text-text-secondary">
        <span className="px-2 py-0.5 bg-accent-purple-dim text-accent-purple-light rounded text-[10px] font-medium">A</span>
        <span className="truncate">{rec.sourceALabel}</span>
        <span className="text-text-muted mx-1">↔</span>
        <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded text-[10px] font-medium">B</span>
        <span className="truncate">{rec.sourceBLabel}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          {rec.status === 'closed' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
              <span>Locked by {rec.lockedBy}</span>
            </>
          ) : rec.openExceptions > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" />
              <span>{rec.openExceptions} need resolution</span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5" />
              <span>In progress</span>
            </>
          )}
        </div>
        {rec.status !== 'closed' ? (
          <Link
            to={`/reconciliations/${rec.id}`}
            className="flex items-center gap-1 text-xs text-accent-purple-light hover:text-accent-purple font-medium"
          >
            Open Workspace <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <Link
            to={`/reconciliations/${rec.id}`}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
          >
            View <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Reconciliations() {
  const [recs, setRecs] = useState<ReconciliationPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReconciliations().then(data => {
      setRecs(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Reconciliations</h1>
          <p className="text-sm text-text-muted mt-0.5">Manage and monitor all reconciliation periods</p>
        </div>
        <Link to="/import" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Reconciliation
        </Link>
      </div>

      {/* Summary strip */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-1">
        {[
          { label: 'Total Periods', value: recs.length, color: 'text-text-primary' },
          { label: 'In Progress', value: recs.filter(r => r.status === 'in_progress').length, color: 'text-blue-400' },
          { label: 'Open Exceptions', value: recs.reduce((s, r) => s + r.openExceptions, 0), color: 'text-accent-red-light' },
          { label: 'Closed', value: recs.filter(r => r.status === 'closed').length, color: 'text-accent-green' },
        ].map(s => (
          <div key={s.label} className="shrink-0 px-4 py-2 bg-bg-surface rounded-lg border border-border-subtle text-center min-w-[100px]">
            <div className={`text-xl font-bold text-financial ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-56 rounded-xl shimmer" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recs.map(rec => <ReconcCard key={rec.id} rec={rec} />)}
        </div>
      )}
    </div>
  );
}
