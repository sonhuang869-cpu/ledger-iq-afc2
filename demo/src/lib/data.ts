import type {
  Transaction,
  MatchedPair,
  Exception,
  ReconciliationPeriod,
  TrendDataPoint,
} from './types';

// Deterministic pseudo-random generator
function seeded(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}
function seededInt(n: number, min: number, max: number): number {
  return Math.floor(seeded(n) * (max - min + 1)) + min;
}
function pick<T>(arr: T[], n: number): T {
  return arr[Math.floor(seeded(n) * arr.length)];
}

const TELECOM_VENDORS = [
  'Verizon Business Services',
  'AT&T Wholesale Solutions',
  'Deutsche Telekom Intl',
  'Orange Business Services',
  'Telia Carrier AB',
  'NTT Communications Corp',
  'PCCW Global Ltd',
  'Lumen Technologies Inc',
  'BT Wholesale Services',
  'Telstra Global Networks',
  'Vodafone Carrier Svcs',
  'T-Mobile Wholesale',
  'Zayo Group Holdings',
  'CenturyLink IP Networks',
  'GTT Communications',
];

const AR_VENDORS = [
  'Comcast Enterprise',
  'Charter Communications',
  'Cox Business',
  'Windstream Networks',
  'Consolidated Comms',
  'Frontier Communications',
  'TeleCommunication Sys',
  'West Corporation',
  'Syniverse Technologies',
  'CTIA Settlement Fund',
  'Neustar Inc',
  'iconectiv LLC',
  'Transaction Network Svcs',
  'Arch Wireless Holdings',
  'Cbeyond Communications',
];

const INTERCOMPANY_ENTITIES = [
  'TeleCo Americas LLC',
  'TeleCo Europe GmbH',
  'TeleCo Asia Pacific Ltd',
  'TeleCo Canada Inc',
  'TeleCo MEA FZ-LLC',
  'TeleCo Latin America SA',
  'TeleCo UK Holdings',
  'TeleCo ANZ Pty Ltd',
];

const DESCRIPTIONS_TELECOM = [
  'Interconnect Settlement',
  'MVNO Wholesale Charges',
  'Intl Voice Termination',
  'Roaming Clearing Settlement',
  'Network Infrastructure Fee',
  'Fiber Capacity Lease',
  'SMS Termination Services',
  'Voice Transit Zone A',
  'Data Transit Tier-1',
  'Number Portability Admin',
  'Emergency Services Levy',
  'Spectrum License Fee',
  'Co-location Services',
  'Managed Network Svcs',
  'IP Peering Services',
];

const DESCRIPTIONS_AR = [
  'Accounts Receivable - Q3 Invoice',
  'Monthly Billing Cycle Adj',
  'Revenue Share Settlement',
  'Service Credit Memo',
  'Activation Fee Recovery',
  'Equipment Lease Receivable',
  'Disputed Balance Resolution',
  'Late Payment Surcharge',
  'Contract Revenue - MRC',
  'Professional Services Inv',
];

const DESCRIPTIONS_IC = [
  'Intercompany Management Fee',
  'Shared Services Allocation',
  'Treasury Funding Transfer',
  'Royalty & License Fee',
  'IT Service Recharge',
  'HR Shared Services',
  'Legal & Compliance Fee',
  'Capital Expenditure Recharge',
];

function makeDate(baseMonth: number, baseYear: number, seed: number): string {
  const day = seededInt(seed, 1, 28);
  const month = String(baseMonth).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${baseYear}-${month}-${dayStr}`;
}

function makeAmount(seed: number): number {
  const ranges = [
    [400, 2000],
    [2000, 8000],
    [8000, 25000],
    [25000, 60000],
    [60000, 85000],
  ];
  const [min, max] = ranges[seededInt(seed * 3, 0, 4)];
  const raw = min + seeded(seed * 7) * (max - min);
  return Math.round(raw * 100) / 100;
}

// ─── Dataset 1: Bank Statement vs General Ledger ───────────────────────────
// 143 items total: 137 matched pairs + 3 only-A + 3 only-B = 6 exceptions
function buildBankGLDataset(): {
  sourceA: Transaction[];
  sourceB: Transaction[];
  pairs: MatchedPair[];
  exceptions: Exception[];
} {
  const sourceA: Transaction[] = [];
  const sourceB: Transaction[] = [];
  const pairs: MatchedPair[] = [];

  // 137 matched transactions
  for (let i = 0; i < 137; i++) {
    const seed = i + 1000;
    const amount = makeAmount(seed);
    const date = makeDate(10, 2026, seed);
    const vendor = pick(TELECOM_VENDORS, seed);
    const desc = pick(DESCRIPTIONS_TELECOM, seed + 50);

    const txA: Transaction = {
      id: `BGL-A-${String(i + 1).padStart(4, '0')}`,
      ref: `INV-2026-${String(1000 + i).padStart(4, '0')}`,
      vendor,
      description: desc,
      amount,
      date,
      source: 'A',
    };
    const txB: Transaction = {
      id: `BGL-B-${String(i + 1).padStart(4, '0')}`,
      ref: `INV-2026-${String(1000 + i).padStart(4, '0')}`,
      vendor,
      description: desc,
      amount,
      date,
      source: 'B',
    };
    sourceA.push(txA);
    sourceB.push(txB);
    pairs.push({
      id: `MP-BGL-${String(i + 1).padStart(4, '0')}`,
      sourceAId: txA.id,
      sourceBId: txB.id,
      confidence: 'exact',
      confidenceScore: 100,
      matchType: 'reference',
      matchedAt: '2026-10-31T08:30:00Z',
    });
  }

  // 3 unmatched Source A items (exist in GL but not in bank statement)
  const unmatchedAVendors = ['Lumen Technologies Inc', 'Verizon Business Services', 'Telia Carrier AB'];
  const unmatchedAAmounts = [31500.00, 8750.00, 23100.00];
  const unmatchedARefs = ['INV-2026-1234', 'INV-2026-1123', 'INV-2026-0912'];
  const unmatchedADates = ['2026-10-28', '2026-10-25', '2026-10-30'];

  for (let i = 0; i < 3; i++) {
    sourceA.push({
      id: `BGL-A-EXC-${i + 1}`,
      ref: unmatchedARefs[i],
      vendor: unmatchedAVendors[i],
      description: pick(DESCRIPTIONS_TELECOM, i + 500),
      amount: unmatchedAAmounts[i],
      date: unmatchedADates[i],
      source: 'A',
    });
  }

  // 3 unmatched Source B items (exist in bank but not in GL)
  const unmatchedBVendors = ['Deutsche Telekom Intl', 'NTT Communications Corp', 'AT&T Wholesale Solutions'];
  const unmatchedBAmounts = [4200.00, 12540.00, 67890.00];
  const unmatchedBRefs = ['INV-2026-1456', 'INV-2026-0847B', 'INV-2026-0789B'];
  const unmatchedBDates = ['2026-10-31', '2026-10-29', '2026-10-22'];

  for (let i = 0; i < 3; i++) {
    sourceB.push({
      id: `BGL-B-EXC-${i + 1}`,
      ref: unmatchedBRefs[i],
      vendor: unmatchedBVendors[i],
      description: pick(DESCRIPTIONS_TELECOM, i + 600),
      amount: unmatchedBAmounts[i],
      date: unmatchedBDates[i],
      source: 'B',
    });
  }

  // Amount diff exceptions (same ref, different amounts)
  const amountDiffTxA: Transaction = {
    id: 'BGL-A-AMD-1',
    ref: 'INV-2026-0847',
    vendor: 'NTT Communications Corp',
    description: 'Data Transit Tier-1',
    amount: 12450.00,
    date: '2026-10-29',
    source: 'A',
  };
  const amountDiffTxB: Transaction = {
    id: 'BGL-B-AMD-1',
    ref: 'INV-2026-0847',
    vendor: 'NTT Communications Corp',
    description: 'Data Transit Tier-1',
    amount: 12540.00,
    date: '2026-10-29',
    source: 'B',
  };
  sourceA.push(amountDiffTxA);
  sourceB.push(amountDiffTxB);

  const amountDiffTxA2: Transaction = {
    id: 'BGL-A-AMD-2',
    ref: 'INV-2026-0789',
    vendor: 'AT&T Wholesale Solutions',
    description: 'Interconnect Settlement',
    amount: 67800.00,
    date: '2026-10-22',
    source: 'A',
  };
  const amountDiffTxB2: Transaction = {
    id: 'BGL-B-AMD-2',
    ref: 'INV-2026-0789',
    vendor: 'AT&T Wholesale Solutions',
    description: 'Interconnect Settlement',
    amount: 67890.00,
    date: '2026-10-22',
    source: 'B',
  };
  sourceA.push(amountDiffTxA2);
  sourceB.push(amountDiffTxB2);

  // Timing diff (same amount, different date — 1 day apart)
  const timingTxA: Transaction = {
    id: 'BGL-A-TMG-1',
    ref: 'INV-2026-0912',
    vendor: 'Telia Carrier AB',
    description: 'Voice Transit Zone A',
    amount: 23100.00,
    date: '2026-10-29',
    source: 'A',
  };
  const timingTxB: Transaction = {
    id: 'BGL-B-TMG-1',
    ref: 'INV-2026-0912',
    vendor: 'Telia Carrier AB',
    description: 'Voice Transit Zone A',
    amount: 23100.00,
    date: '2026-10-30',
    source: 'B',
  };
  sourceA.push(timingTxA);
  sourceB.push(timingTxB);

  const exceptions: Exception[] = [
    {
      id: 'EXC-001',
      reconciliationId: 'REC-001',
      type: 'amount_diff',
      sourceAItem: amountDiffTxA,
      sourceBItem: amountDiffTxB,
      difference: 90.00,
      status: 'pending',
      ageHours: 50,
      agingBucket: '1-3d',
      assignee: 'Sarah Chen',
      suggestedMatches: [{ transactionId: 'BGL-B-AMD-1', score: 94, reason: 'Same reference, minor amount variance ($90.00)' }],
      createdAt: '2026-10-29T14:00:00Z',
      updatedAt: '2026-10-29T14:00:00Z',
    },
    {
      id: 'EXC-002',
      reconciliationId: 'REC-001',
      type: 'missing_source_b',
      sourceAItem: sourceA.find(t => t.ref === 'INV-2026-1123'),
      difference: 8750.00,
      status: 'pending',
      ageHours: 120,
      agingBucket: '4-7d',
      assignee: 'Marcus Webb',
      suggestedMatches: [],
      createdAt: '2026-10-26T09:00:00Z',
      updatedAt: '2026-10-26T09:00:00Z',
    },
    {
      id: 'EXC-003',
      reconciliationId: 'REC-001',
      type: 'timing',
      sourceAItem: timingTxA,
      sourceBItem: timingTxB,
      difference: 0,
      status: 'pending',
      ageHours: 22,
      agingBucket: '<24h',
      suggestedMatches: [{ transactionId: 'BGL-B-TMG-1', score: 97, reason: 'Same ref & amount, date off by 1 day' }],
      createdAt: '2026-10-30T18:00:00Z',
      updatedAt: '2026-10-30T18:00:00Z',
    },
    {
      id: 'EXC-004',
      reconciliationId: 'REC-001',
      type: 'missing_source_a',
      sourceBItem: sourceB.find(t => t.ref === 'INV-2026-1456'),
      difference: 4200.00,
      status: 'pending',
      ageHours: 6,
      agingBucket: '<24h',
      suggestedMatches: [],
      createdAt: '2026-10-31T10:00:00Z',
      updatedAt: '2026-10-31T10:00:00Z',
    },
    {
      id: 'EXC-005',
      reconciliationId: 'REC-001',
      type: 'amount_diff',
      sourceAItem: amountDiffTxA2,
      sourceBItem: amountDiffTxB2,
      difference: 90.00,
      status: 'escalated',
      ageHours: 216,
      agingBucket: '>7d',
      assignee: 'James Okafor',
      escalationNote: 'Vendor invoice mismatch — awaiting credit note from AT&T Wholesale. Amount $90 discrepancy under review by Accounts Payable.',
      suggestedMatches: [{ transactionId: 'BGL-B-AMD-2', score: 92, reason: 'Same reference, amount variance $90.00 (0.13%)' }],
      createdAt: '2026-10-22T11:00:00Z',
      updatedAt: '2026-10-30T16:00:00Z',
    },
    {
      id: 'EXC-006',
      reconciliationId: 'REC-001',
      type: 'missing_source_b',
      sourceAItem: sourceA.find(t => t.ref === 'INV-2026-1234'),
      difference: 31500.00,
      status: 'pending',
      ageHours: 72,
      agingBucket: '1-3d',
      assignee: 'Sarah Chen',
      suggestedMatches: [],
      createdAt: '2026-10-28T08:00:00Z',
      updatedAt: '2026-10-28T08:00:00Z',
    },
  ];

  return { sourceA, sourceB, pairs, exceptions };
}

// ─── Dataset 2: AR Subledger vs Trial Balance ──────────────────────────────
// 89 items: 81 matched + 4 only-A + 4 only-B = 8 unmatched (2 pending exceptions)
function buildARDataset(): {
  sourceA: Transaction[];
  sourceB: Transaction[];
  pairs: MatchedPair[];
  exceptions: Exception[];
} {
  const sourceA: Transaction[] = [];
  const sourceB: Transaction[] = [];
  const pairs: MatchedPair[] = [];

  for (let i = 0; i < 81; i++) {
    const seed = i + 2000;
    const amount = makeAmount(seed);
    const date = makeDate(10, 2026, seed);
    const vendor = pick(AR_VENDORS, seed);
    const desc = pick(DESCRIPTIONS_AR, seed + 50);

    const txA: Transaction = {
      id: `ARS-A-${String(i + 1).padStart(4, '0')}`,
      ref: `AR-2026-${String(5000 + i).padStart(4, '0')}`,
      vendor,
      description: desc,
      amount,
      date,
      source: 'A',
    };
    const txB: Transaction = {
      id: `ARS-B-${String(i + 1).padStart(4, '0')}`,
      ref: `AR-2026-${String(5000 + i).padStart(4, '0')}`,
      vendor,
      description: desc,
      amount,
      date,
      source: 'B',
    };
    sourceA.push(txA);
    sourceB.push(txB);
    pairs.push({
      id: `MP-ARS-${String(i + 1).padStart(4, '0')}`,
      sourceAId: txA.id,
      sourceBId: txB.id,
      confidence: i % 10 === 0 ? 'high' : 'exact',
      confidenceScore: i % 10 === 0 ? 97 : 100,
      matchType: 'reference',
      matchedAt: '2026-10-31T09:15:00Z',
    });
  }

  // 4 unmatched AR items
  for (let i = 0; i < 4; i++) {
    sourceA.push({
      id: `ARS-A-UNM-${i + 1}`,
      ref: `AR-2026-${5100 + i}`,
      vendor: pick(AR_VENDORS, i + 300),
      description: pick(DESCRIPTIONS_AR, i + 400),
      amount: makeAmount(i + 300),
      date: makeDate(10, 2026, i + 300),
      source: 'A',
    });
  }

  // 4 unmatched TB items
  for (let i = 0; i < 4; i++) {
    sourceB.push({
      id: `ARS-B-UNM-${i + 1}`,
      ref: `TB-2026-${9100 + i}`,
      vendor: pick(AR_VENDORS, i + 400),
      description: pick(DESCRIPTIONS_AR, i + 500),
      amount: makeAmount(i + 400),
      date: makeDate(10, 2026, i + 400),
      source: 'B',
    });
  }

  // Amount diff exception
  const arAmtTxA: Transaction = {
    id: 'ARS-A-AMD-1',
    ref: 'AR-2026-5567',
    vendor: 'Orange Business Services',
    description: 'Revenue Share Settlement',
    amount: 44000.00,
    date: '2026-10-27',
    source: 'A',
  };
  const arAmtTxB: Transaction = {
    id: 'ARS-B-AMD-1',
    ref: 'AR-2026-5567',
    vendor: 'Orange Business Services',
    description: 'Revenue Share Settlement',
    amount: 43956.00,
    date: '2026-10-27',
    source: 'B',
  };
  sourceA.push(arAmtTxA);
  sourceB.push(arAmtTxB);

  // Timing diff exception
  const arTimeTxA: Transaction = {
    id: 'ARS-A-TMG-1',
    ref: 'AR-2026-5654',
    vendor: 'PCCW Global Ltd',
    description: 'Monthly Billing Cycle Adj',
    amount: 1250.75,
    date: '2026-10-15',
    source: 'A',
  };
  const arTimeTxB: Transaction = {
    id: 'ARS-B-TMG-1',
    ref: 'AR-2026-5654',
    vendor: 'PCCW Global Ltd',
    description: 'Monthly Billing Cycle Adj',
    amount: 1250.75,
    date: '2026-10-16',
    source: 'B',
  };
  sourceA.push(arTimeTxA);
  sourceB.push(arTimeTxB);

  const exceptions: Exception[] = [
    {
      id: 'EXC-007',
      reconciliationId: 'REC-002',
      type: 'amount_diff',
      sourceAItem: arAmtTxA,
      sourceBItem: arAmtTxB,
      difference: 44.00,
      status: 'pending',
      ageHours: 96,
      agingBucket: '4-7d',
      assignee: 'Priya Nair',
      suggestedMatches: [{ transactionId: 'ARS-B-AMD-1', score: 96, reason: 'Same ref, amount diff $44.00 (0.1%)' }],
      createdAt: '2026-10-27T10:00:00Z',
      updatedAt: '2026-10-27T10:00:00Z',
    },
    {
      id: 'EXC-008',
      reconciliationId: 'REC-002',
      type: 'timing',
      sourceAItem: arTimeTxA,
      sourceBItem: arTimeTxB,
      difference: 0,
      status: 'pending',
      ageHours: 10,
      agingBucket: '<24h',
      suggestedMatches: [{ transactionId: 'ARS-B-TMG-1', score: 98, reason: 'Same ref & amount, date off by 1 day' }],
      createdAt: '2026-10-31T06:00:00Z',
      updatedAt: '2026-10-31T06:00:00Z',
    },
  ];

  return { sourceA, sourceB, pairs, exceptions };
}

// ─── Dataset 3: Intercompany ───────────────────────────────────────────────
// 56 items, 100% matched, closed
function buildIntercompanyDataset(): {
  sourceA: Transaction[];
  sourceB: Transaction[];
  pairs: MatchedPair[];
  exceptions: Exception[];
} {
  const sourceA: Transaction[] = [];
  const sourceB: Transaction[] = [];
  const pairs: MatchedPair[] = [];

  for (let i = 0; i < 56; i++) {
    const seed = i + 3000;
    const amount = makeAmount(seed);
    const date = makeDate(9, 2026, seed);
    const vendor = pick(INTERCOMPANY_ENTITIES, seed);
    const desc = pick(DESCRIPTIONS_IC, seed + 50);

    const txA: Transaction = {
      id: `IC-A-${String(i + 1).padStart(4, '0')}`,
      ref: `IC-2026-${String(8000 + i).padStart(4, '0')}`,
      vendor,
      description: desc,
      amount,
      date,
      source: 'A',
    };
    const txB: Transaction = {
      id: `IC-B-${String(i + 1).padStart(4, '0')}`,
      ref: `IC-2026-${String(8000 + i).padStart(4, '0')}`,
      vendor,
      description: desc,
      amount,
      date,
      source: 'B',
    };
    sourceA.push(txA);
    sourceB.push(txB);
    pairs.push({
      id: `MP-IC-${String(i + 1).padStart(4, '0')}`,
      sourceAId: txA.id,
      sourceBId: txB.id,
      confidence: 'exact',
      confidenceScore: 100,
      matchType: 'reference',
      matchedAt: '2026-10-01T07:00:00Z',
    });
  }

  return { sourceA, sourceB, pairs, exceptions: [] };
}

// ─── Build datasets ─────────────────────────────────────────────────────────
const bgl = buildBankGLDataset();
const ars = buildARDataset();
const ic = buildIntercompanyDataset();

export const RECONCILIATIONS: ReconciliationPeriod[] = [
  {
    id: 'REC-001',
    name: 'Bank Statement vs General Ledger',
    type: 'bank_gl',
    period: 'October 2026',
    sourceALabel: 'General Ledger (ERP)',
    sourceBLabel: 'Bank Statement',
    totalItems: 143,
    matchedItems: 137,
    matchRate: 95.8,
    openExceptions: 6,
    status: 'in_progress',
    createdAt: '2026-10-31T07:00:00Z',
    transactions: { sourceA: bgl.sourceA, sourceB: bgl.sourceB },
    matchedPairs: bgl.pairs,
    exceptions: bgl.exceptions,
  },
  {
    id: 'REC-002',
    name: 'AR Subledger vs Trial Balance',
    type: 'ar_subledger',
    period: 'October 2026',
    sourceALabel: 'AR Subledger',
    sourceBLabel: 'Trial Balance',
    totalItems: 89,
    matchedItems: 81,
    matchRate: 91.0,
    openExceptions: 2,
    status: 'in_progress',
    createdAt: '2026-10-31T07:30:00Z',
    transactions: { sourceA: ars.sourceA, sourceB: ars.sourceB },
    matchedPairs: ars.pairs,
    exceptions: ars.exceptions,
  },
  {
    id: 'REC-003',
    name: 'Intercompany Reconciliation',
    type: 'intercompany',
    period: 'September 2026',
    sourceALabel: 'Intercompany Payables',
    sourceBLabel: 'Intercompany Receivables',
    totalItems: 56,
    matchedItems: 56,
    matchRate: 100,
    openExceptions: 0,
    status: 'closed',
    lockedAt: '2026-10-01T16:00:00Z',
    lockedBy: 'Libin Joseph',
    createdAt: '2026-09-30T07:00:00Z',
    transactions: { sourceA: ic.sourceA, sourceB: ic.sourceB },
    matchedPairs: ic.pairs,
    exceptions: ic.exceptions,
  },
];

export const ALL_EXCEPTIONS: Exception[] = [
  ...bgl.exceptions,
  ...ars.exceptions,
];

export const TREND_DATA: TrendDataPoint[] = [
  { period: 'May 2026', matchRate: 91.2, exceptions: 14, processed: 118 },
  { period: 'Jun 2026', matchRate: 93.7, exceptions: 9, processed: 143 },
  { period: 'Jul 2026', matchRate: 92.5, exceptions: 11, processed: 131 },
  { period: 'Aug 2026', matchRate: 95.1, exceptions: 7, processed: 145 },
  { period: 'Sep 2026', matchRate: 100, exceptions: 0, processed: 56 },
  { period: 'Oct 2026', matchRate: 95.8, exceptions: 8, processed: 288 },
];
