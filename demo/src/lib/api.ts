import type {
  ReconciliationPeriod,
  Exception,
  ExceptionStatus,
  MatchFilter,
} from './types';
import { RECONCILIATIONS, ALL_EXCEPTIONS } from './data';

const STORAGE_KEY = 'ledgeriq_state_v2';

interface AppState {
  reconciliations: ReconciliationPeriod[];
  exceptions: Exception[];
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.reconciliations?.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return { reconciliations: RECONCILIATIONS, exceptions: ALL_EXCEPTIONS };
}

function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

let _state = loadState();

function getState(): AppState {
  return _state;
}

function setState(next: AppState): void {
  _state = next;
  saveState(next);
}

// ── Reconciliations ──────────────────────────────────────────────────────────

export async function getReconciliations(): Promise<ReconciliationPeriod[]> {
  await delay(80);
  return getState().reconciliations;
}

export async function getReconciliation(id: string): Promise<ReconciliationPeriod | null> {
  await delay(80);
  return getState().reconciliations.find(r => r.id === id) ?? null;
}

export async function lockReconciliation(id: string, lockedBy: string): Promise<ReconciliationPeriod> {
  await delay(600);
  const state = getState();
  const updated = state.reconciliations.map(r =>
    r.id === id
      ? { ...r, status: 'closed' as const, lockedAt: new Date().toISOString(), lockedBy }
      : r
  );
  const rec = updated.find(r => r.id === id)!;
  setState({ ...state, reconciliations: updated });
  return rec;
}

// ── Exceptions ───────────────────────────────────────────────────────────────

export async function getExceptions(reconciliationId?: string): Promise<Exception[]> {
  await delay(80);
  const all = getState().exceptions;
  return reconciliationId ? all.filter(e => e.reconciliationId === reconciliationId) : all;
}

export async function updateExceptionStatus(
  id: string,
  status: ExceptionStatus,
  justification?: string
): Promise<Exception> {
  await delay(400);
  const state = getState();
  const updated = state.exceptions.map(e =>
    e.id === id
      ? {
          ...e,
          status,
          justification: justification ?? e.justification,
          updatedAt: new Date().toISOString(),
        }
      : e
  );

  // Also update openExceptions count on reconciliation
  const exc = updated.find(e => e.id === id)!;
  const resolvedStatuses: ExceptionStatus[] = ['approved', 'force_matched', 'written_off', 'deferred'];
  const wasResolved = resolvedStatuses.includes(status);
  const reconciliations = state.reconciliations.map(r => {
    if (r.id !== exc.reconciliationId) return r;
    const openCount = updated.filter(
      e => e.reconciliationId === r.id && !resolvedStatuses.includes(e.status)
    ).length;
    return { ...r, openExceptions: openCount };
  });

  setState({ reconciliations, exceptions: updated });
  return exc;
}

export async function batchUpdateExceptions(
  ids: string[],
  status: ExceptionStatus
): Promise<void> {
  await delay(600);
  for (const id of ids) {
    await updateExceptionStatus(id, status);
  }
}

// ── Matching helpers ─────────────────────────────────────────────────────────

export function filterWorkspaceItems(
  rec: ReconciliationPeriod,
  filter: MatchFilter
) {
  const matchedAIds = new Set(rec.matchedPairs.map(p => p.sourceAId));
  const matchedBIds = new Set(rec.matchedPairs.map(p => p.sourceBId));

  const exceptionAIds = new Set(rec.exceptions.flatMap(e => [e.sourceAItem?.id, e.sourceBItem?.id]).filter(Boolean) as string[]);

  type Row = {
    pairId?: string;
    sourceA?: (typeof rec.transactions.sourceA)[0];
    sourceB?: (typeof rec.transactions.sourceB)[0];
    status: 'matched' | 'unmatched' | 'disputed' | 'written_off';
    confidenceScore?: number;
  };

  const rows: Row[] = [];

  // Matched pairs
  for (const pair of rec.matchedPairs) {
    const a = rec.transactions.sourceA.find(t => t.id === pair.sourceAId);
    const b = rec.transactions.sourceB.find(t => t.id === pair.sourceBId);
    if (a && b) {
      rows.push({ pairId: pair.id, sourceA: a, sourceB: b, status: 'matched', confidenceScore: pair.confidenceScore });
    }
  }

  // Unmatched Source A (exceptions)
  for (const exc of rec.exceptions) {
    if (exc.type === 'missing_source_b' && exc.sourceAItem) {
      rows.push({
        sourceA: exc.sourceAItem,
        status: exc.status === 'written_off' ? 'written_off' : 'unmatched',
      });
    }
    if (exc.type === 'missing_source_a' && exc.sourceBItem) {
      rows.push({
        sourceB: exc.sourceBItem,
        status: exc.status === 'written_off' ? 'written_off' : 'unmatched',
      });
    }
    if ((exc.type === 'amount_diff' || exc.type === 'timing') && exc.sourceAItem && exc.sourceBItem) {
      rows.push({
        sourceA: exc.sourceAItem,
        sourceB: exc.sourceBItem,
        status: 'disputed',
      });
    }
  }

  if (filter === 'all') return rows;
  return rows.filter(r => r.status === filter);
}

// ── Reset ───────────────────────────────────────────────────────────────────

export function resetDemoData(): void {
  localStorage.removeItem(STORAGE_KEY);
  _state = { reconciliations: RECONCILIATIONS, exceptions: ALL_EXCEPTIONS };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
