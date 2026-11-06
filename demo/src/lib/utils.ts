import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AgingBucket, ConfidenceLevel, ExceptionStatus, ExceptionType } from './types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function agingLabel(bucket: AgingBucket): string {
  const map: Record<AgingBucket, string> = {
    '<24h': '< 24 hours',
    '1-3d': '1 – 3 days',
    '4-7d': '4 – 7 days',
    '>7d': '> 7 days',
  };
  return map[bucket];
}

export function agingColor(bucket: AgingBucket): string {
  const map: Record<AgingBucket, string> = {
    '<24h': 'text-accent-green',
    '1-3d': 'text-amber-400',
    '4-7d': 'text-orange-400',
    '>7d': 'text-accent-red',
  };
  return map[bucket];
}

export function agingBg(bucket: AgingBucket): string {
  const map: Record<AgingBucket, string> = {
    '<24h': 'bg-accent-green-dim text-accent-green-light',
    '1-3d': 'bg-amber-900/30 text-amber-400',
    '4-7d': 'bg-orange-900/30 text-orange-400',
    '>7d': 'bg-accent-red-dim text-accent-red-light',
  };
  return map[bucket];
}

export function confidenceColor(level: ConfidenceLevel): string {
  const map: Record<ConfidenceLevel, string> = {
    exact: 'bg-accent-green-dim text-accent-green-light border-accent-green/30',
    high: 'bg-blue-900/30 text-blue-400 border-blue-500/30',
    medium: 'bg-amber-900/30 text-amber-400 border-amber-500/30',
    low: 'bg-accent-red-dim text-accent-red-light border-accent-red/30',
  };
  return map[level];
}

export function confidenceLabel(level: ConfidenceLevel): string {
  const map: Record<ConfidenceLevel, string> = {
    exact: 'Exact (100%)',
    high: 'High (95%+)',
    medium: 'Medium (80–94%)',
    low: 'Low (<80%)',
  };
  return map[level];
}

export function exceptionTypeLabel(type: ExceptionType): string {
  const map: Record<ExceptionType, string> = {
    missing_source_a: 'Missing in Source A',
    missing_source_b: 'Missing in Source B',
    amount_diff: 'Amount Mismatch',
    timing: 'Timing Difference',
  };
  return map[type];
}

export function exceptionTypeColor(type: ExceptionType): string {
  const map: Record<ExceptionType, string> = {
    missing_source_a: 'bg-accent-purple-dim text-accent-purple-light border-accent-purple/30',
    missing_source_b: 'bg-accent-purple-dim text-accent-purple-light border-accent-purple/30',
    amount_diff: 'bg-accent-red-dim text-accent-red-light border-accent-red/30',
    timing: 'bg-amber-900/30 text-amber-400 border-amber-500/30',
  };
  return map[type];
}

export function statusLabel(status: ExceptionStatus): string {
  const map: Record<ExceptionStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    force_matched: 'Force Matched',
    written_off: 'Written Off',
    escalated: 'Escalated',
    deferred: 'Deferred',
  };
  return map[status];
}

export function statusColor(status: ExceptionStatus): string {
  const map: Record<ExceptionStatus, string> = {
    pending: 'bg-amber-900/30 text-amber-400 border-amber-500/30',
    approved: 'bg-accent-green-dim text-accent-green-light border-accent-green/30',
    force_matched: 'bg-blue-900/30 text-blue-400 border-blue-500/30',
    written_off: 'bg-bg-elevated text-text-muted border-border-default',
    escalated: 'bg-accent-red-dim text-accent-red-light border-accent-red/30',
    deferred: 'bg-bg-elevated text-text-secondary border-border-default',
  };
  return map[status];
}

export function hoursToAging(hours: number): AgingBucket {
  if (hours < 24) return '<24h';
  if (hours < 72) return '1-3d';
  if (hours < 168) return '4-7d';
  return '>7d';
}
