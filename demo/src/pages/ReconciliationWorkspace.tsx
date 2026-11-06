import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  CheckSquare,
  Trash2,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { getReconciliation, lockReconciliation, filterWorkspaceItems } from '../lib/api';
import type { ReconciliationPeriod, MatchFilter } from '../lib/types';
import { formatCurrency, formatDate, formatPercent } from '../lib/utils';

type WorkspaceRow = ReturnType<typeof filterWorkspaceItems>[0];

const FILTER_OPTIONS: { value: MatchFilter; label: string }[] = [
  { value: 'all', label: 'All Items' },
  { value: 'matched', label: 'Matched' },
  { value: 'unmatched', label: 'Unmatched' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'written_off', label: 'Written Off' },
];

function StatusDot({ status }: { status: WorkspaceRow['status'] }) {
  if (status === 'matched') return <span className="w-2 h-2 rounded-full bg-accent-green inline-block" title="Matched" />;
  if (status === 'disputed') return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="Disputed" />;
  if (status === 'written_off') return <span className="w-2 h-2 rounded-full bg-text-muted inline-block" title="Written Off" />;
  return <span className="w-2 h-2 rounded-full bg-accent-red inline-block" title="Unmatched" />;
}

function RowBg(status: WorkspaceRow['status']): string {
  if (status === 'matched') return 'hover:bg-accent-green-dim/30';
  if (status === 'disputed') return 'hover:bg-amber-900/20 bg-amber-900/5';
  if (status === 'written_off') return 'opacity-50 hover:opacity-70';
  return 'hover:bg-accent-red-dim/20 bg-accent-red-dim/10';
}

function CellText({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span className={`text-xs text-text-primary ${mono ? 'text-financial' : ''}`}>
      {children}
    </span>
  );
}

function EmptyCell() {
  return <td className="px-3 py-2.5 text-center text-text-muted text-xs italic" colSpan={4}>— not found —</td>;
}

export default function ReconciliationWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [rec, setRec] = useState<ReconciliationPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [locking, setLocking] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    if (!id) return;
    getReconciliation(id).then(data => {
      setRec(data);
      setLoading(false);
    });
  }, [id]);

  const rows = useMemo(() => {
    if (!rec) return [];
    return filterWorkspaceItems(rec, filter);
  }, [rec, filter]);

  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);

  const counts = useMemo(() => {
    if (!rec) return { matched: 0, unmatched: 0, disputed: 0 };
    const all = filterWorkspaceItems(rec, 'all');
    return {
      matched: all.filter(r => r.status === 'matched').length,
      unmatched: all.filter(r => r.status === 'unmatched').length,
      disputed: all.filter(r => r.status === 'disputed').length,
    };
  }, [rec]);

  async function handleLock() {
    if (!rec || rec.status === 'closed') return;
    setLocking(true);
    try {
      const updated = await lockReconciliation(rec.id, 'Libin Joseph');
      setRec(updated);
      toast.success(`${rec.name} locked successfully. Sign-off record generated.`);
    } catch {
      toast.error('Failed to lock reconciliation');
    } finally {
      setLocking(false);
    }
  }

  function toggleSelect(i: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === pageRows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pageRows.map((_, i) => i)));
    }
  }

  function handleBatchApprove() {
    if (selected.size === 0) return;
    toast.success(`${selected.size} item(s) approved for matching`);
    setSelected(new Set());
  }

  function handleBatchWriteOff() {
    if (selected.size === 0) return;
    toast.success(`${selected.size} item(s) written off`);
    setSelected(new Set());
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 shimmer rounded" />
        <div className="h-64 shimmer rounded-xl" />
      </div>
    );
  }

  if (!rec) {
    return (
      <div className="p-6 text-text-secondary">
        Reconciliation not found.{' '}
        <Link to="/reconciliations" className="text-accent-purple-light">Go back</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="px-6 py-4 border-b border-border-subtle bg-bg-primary flex items-center gap-4 flex-wrap">
        <Link to="/reconciliations" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-text-primary truncate">{rec.name}</h1>
          <p className="text-xs text-text-muted">{rec.period}</p>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-accent-green-dim text-accent-green-light">
            <CheckCircle2 className="w-3 h-3" /> {counts.matched} matched
          </span>
          {counts.disputed > 0 && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-900/30 text-amber-400">
              <Clock className="w-3 h-3" /> {counts.disputed} disputed
            </span>
          )}
          {counts.unmatched > 0 && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-accent-red-dim text-accent-red-light">
              <AlertTriangle className="w-3 h-3" /> {counts.unmatched} unmatched
            </span>
          )}
          <span className="text-xs text-text-muted pl-1 text-financial font-semibold text-accent-purple-light">
            {formatPercent(rec.matchRate)} match rate
          </span>
        </div>

        {/* Lock button */}
        {rec.status === 'closed' ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface border border-border-default rounded-lg text-xs text-text-muted">
            <Lock className="w-3.5 h-3.5" />
            Locked — {rec.lockedBy}
          </div>
        ) : (
          <button
            onClick={handleLock}
            disabled={locking || counts.unmatched > 0 || counts.disputed > 0}
            className="btn-primary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            title={counts.unmatched > 0 || counts.disputed > 0 ? 'Resolve all exceptions before locking' : ''}
          >
            <Lock className="w-3.5 h-3.5" />
            {locking ? 'Locking…' : 'Lock Period'}
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="px-6 py-3 border-b border-border-subtle flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-text-muted" />
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => { setFilter(opt.value); setPage(0); setSelected(new Set()); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === opt.value
                ? 'bg-accent-purple text-white'
                : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-xs text-text-muted">{selected.size} selected</span>
              <button onClick={handleBatchApprove} className="btn-secondary text-xs py-1">
                <CheckSquare className="w-3.5 h-3.5" /> Batch Approve
              </button>
              <button onClick={handleBatchWriteOff} className="btn-danger text-xs py-1">
                <Trash2 className="w-3.5 h-3.5" /> Write Off
              </button>
            </>
          )}
        </div>
      </div>

      {/* Split-panel table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="overflow-x-auto rounded-xl border border-border-default">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="bg-bg-elevated border-b border-border-default">
                <th className="w-8 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === pageRows.length && pageRows.length > 0}
                    onChange={selectAll}
                    className="accent-accent-purple"
                  />
                </th>
                <th className="w-5 px-2 py-3" />

                {/* Source A columns */}
                <th className="px-3 py-3 text-left text-text-muted font-medium">
                  <span className="px-1.5 py-0.5 bg-accent-purple-dim text-accent-purple-light rounded mr-1">A</span>
                  Ref
                </th>
                <th className="px-3 py-3 text-left text-text-muted font-medium">Vendor</th>
                <th className="px-3 py-3 text-right text-text-muted font-medium">Amount (A)</th>
                <th className="px-3 py-3 text-center text-text-muted font-medium">Date (A)</th>

                {/* Match center */}
                <th className="w-10 px-2 py-3 text-center text-text-muted font-medium">↔</th>

                {/* Source B columns */}
                <th className="px-3 py-3 text-right text-text-muted font-medium">Amount (B)</th>
                <th className="px-3 py-3 text-center text-text-muted font-medium">Date (B)</th>
                <th className="px-3 py-3 text-left text-text-muted font-medium">
                  <span className="px-1.5 py-0.5 bg-blue-900/30 text-blue-400 rounded mr-1">B</span>
                  Ref
                </th>

                <th className="px-3 py-3 text-center text-text-muted font-medium">Δ Amt</th>
                <th className="w-8 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-text-muted">
                    No items match the current filter
                  </td>
                </tr>
              ) : (
                pageRows.map((row, i) => {
                  const diff = row.sourceA && row.sourceB
                    ? Math.abs(row.sourceA.amount - row.sourceB.amount)
                    : null;
                  return (
                    <tr key={i} className={`${RowBg(row.status)} transition-colors`}>
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.has(i)}
                          onChange={() => toggleSelect(i)}
                          className="accent-accent-purple"
                        />
                      </td>
                      <td className="px-2 py-2.5">
                        <StatusDot status={row.status} />
                      </td>

                      {/* Source A */}
                      {row.sourceA ? (
                        <>
                          <td className="px-3 py-2.5">
                            <CellText mono>{row.sourceA.ref}</CellText>
                          </td>
                          <td className="px-3 py-2.5 max-w-[160px]">
                            <span className="text-xs text-text-secondary truncate block">{row.sourceA.vendor}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <CellText mono>{formatCurrency(row.sourceA.amount)}</CellText>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <CellText mono>{formatDate(row.sourceA.date)}</CellText>
                          </td>
                        </>
                      ) : (
                        <EmptyCell />
                      )}

                      {/* Match indicator */}
                      <td className="px-2 py-2.5 text-center">
                        {row.status === 'matched' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-accent-green mx-auto" />
                        ) : row.status === 'disputed' ? (
                          <span className="text-amber-400 text-base leading-none">≈</span>
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-accent-red mx-auto" />
                        )}
                      </td>

                      {/* Source B */}
                      {row.sourceB ? (
                        <>
                          <td className="px-3 py-2.5 text-right">
                            <CellText mono>{formatCurrency(row.sourceB.amount)}</CellText>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <CellText mono>{formatDate(row.sourceB.date)}</CellText>
                          </td>
                          <td className="px-3 py-2.5">
                            <CellText mono>{row.sourceB.ref}</CellText>
                          </td>
                        </>
                      ) : (
                        <EmptyCell />
                      )}

                      {/* Diff */}
                      <td className="px-3 py-2.5 text-center">
                        {diff !== null && diff > 0 ? (
                          <span className="text-xs font-semibold text-financial text-accent-red-light">{formatCurrency(diff)}</span>
                        ) : diff === 0 ? (
                          <span className="text-xs text-text-muted">—</span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>

                      <td className="px-3 py-2.5">
                        {row.status !== 'matched' && (
                          <Link
                            to={`/exceptions?rec=${rec.id}`}
                            className="text-accent-purple-light hover:text-accent-purple"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-xs text-text-secondary">
            <span>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length} rows
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded bg-bg-elevated hover:bg-border-default disabled:opacity-40 transition-colors"
              >
                Prev
              </button>
              {[...Array(Math.min(totalPages, 7))].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-8 h-7 rounded transition-colors ${i === page ? 'bg-accent-purple text-white' : 'bg-bg-elevated hover:bg-border-default'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="px-3 py-1.5 rounded bg-bg-elevated hover:bg-border-default disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
