export type ConfidenceLevel = 'exact' | 'high' | 'medium' | 'low';
export type ExceptionType = 'missing_source_a' | 'missing_source_b' | 'amount_diff' | 'timing';
export type ExceptionStatus = 'pending' | 'approved' | 'force_matched' | 'written_off' | 'escalated' | 'deferred';
export type AgingBucket = '<24h' | '1-3d' | '4-7d' | '>7d';
export type ReconciliationStatus = 'in_progress' | 'completed' | 'closed';
export type ReconciliationType = 'bank_gl' | 'ar_subledger' | 'intercompany';
export type MatchFilter = 'all' | 'matched' | 'unmatched' | 'disputed' | 'written_off';

export interface Transaction {
  id: string;
  ref: string;
  vendor: string;
  description: string;
  amount: number;
  date: string;
  source: 'A' | 'B';
}

export interface MatchedPair {
  id: string;
  sourceAId: string;
  sourceBId: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  matchType: 'reference' | 'amount_date' | 'manual';
  matchedAt: string;
}

export interface SuggestedMatch {
  transactionId: string;
  score: number;
  reason: string;
}

export interface Exception {
  id: string;
  reconciliationId: string;
  type: ExceptionType;
  sourceAItem?: Transaction;
  sourceBItem?: Transaction;
  difference: number;
  status: ExceptionStatus;
  ageHours: number;
  agingBucket: AgingBucket;
  assignee?: string;
  justification?: string;
  suggestedMatches: SuggestedMatch[];
  createdAt: string;
  updatedAt: string;
  escalationNote?: string;
}

export interface ReconciliationPeriod {
  id: string;
  name: string;
  type: ReconciliationType;
  period: string;
  sourceALabel: string;
  sourceBLabel: string;
  totalItems: number;
  matchedItems: number;
  matchRate: number;
  openExceptions: number;
  status: ReconciliationStatus;
  lockedAt?: string;
  lockedBy?: string;
  createdAt: string;
  transactions: {
    sourceA: Transaction[];
    sourceB: Transaction[];
  };
  matchedPairs: MatchedPair[];
  exceptions: Exception[];
}

export interface TrendDataPoint {
  period: string;
  matchRate: number;
  exceptions: number;
  processed: number;
}

export interface SlaMetrics {
  resolved24h: number;
  resolved48h: number;
  resolved72h: number;
  total: number;
}
