import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Zap,
  X,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';

type Step = 'upload' | 'configure' | 'running' | 'complete';
type MatchRule = 'reference' | 'amount_date' | 'both';

interface PreviewRow {
  ref: string;
  vendor: string;
  amount: number;
  date: string;
  description: string;
}

const SAMPLE_SOURCE_A: PreviewRow[] = [
  { ref: 'INV-2026-1500', vendor: 'Verizon Business Services', amount: 24750.00, date: '2026-11-01', description: 'Interconnect Settlement' },
  { ref: 'INV-2026-1501', vendor: 'AT&T Wholesale Solutions', amount: 8300.50, date: '2026-11-01', description: 'MVNO Wholesale Charges' },
  { ref: 'INV-2026-1502', vendor: 'Deutsche Telekom Intl', amount: 55000.00, date: '2026-11-02', description: 'Fiber Capacity Lease' },
  { ref: 'INV-2026-1503', vendor: 'Orange Business Services', amount: 12800.00, date: '2026-11-02', description: 'Intl Voice Termination' },
  { ref: 'INV-2026-1504', vendor: 'Telia Carrier AB', amount: 6450.75, date: '2026-11-03', description: 'SMS Termination Services' },
  { ref: 'INV-2026-1505', vendor: 'NTT Communications Corp', amount: 31200.00, date: '2026-11-03', description: 'Data Transit Tier-1' },
  { ref: 'INV-2026-1506', vendor: 'PCCW Global Ltd', amount: 9100.00, date: '2026-11-04', description: 'Voice Transit Zone A' },
  { ref: 'INV-2026-1507', vendor: 'Lumen Technologies Inc', amount: 44500.00, date: '2026-11-04', description: 'IP Peering Services' },
];

const SAMPLE_SOURCE_B: PreviewRow[] = [
  { ref: 'INV-2026-1500', vendor: 'Verizon Business Services', amount: 24750.00, date: '2026-11-01', description: 'Interconnect Settlement' },
  { ref: 'INV-2026-1501', vendor: 'AT&T Wholesale Solutions', amount: 8300.50, date: '2026-11-01', description: 'MVNO Wholesale Charges' },
  { ref: 'INV-2026-1502', vendor: 'Deutsche Telekom Intl', amount: 55000.00, date: '2026-11-02', description: 'Fiber Capacity Lease' },
  { ref: 'INV-2026-1503', vendor: 'Orange Business Services', amount: 12750.00, date: '2026-11-02', description: 'Intl Voice Termination' }, // amount diff
  { ref: 'INV-2026-1504', vendor: 'Telia Carrier AB', amount: 6450.75, date: '2026-11-04', description: 'SMS Termination Services' }, // date diff
  { ref: 'INV-2026-1505', vendor: 'NTT Communications Corp', amount: 31200.00, date: '2026-11-03', description: 'Data Transit Tier-1' },
  { ref: 'INV-2026-1506', vendor: 'PCCW Global Ltd', amount: 9100.00, date: '2026-11-04', description: 'Voice Transit Zone A' },
  // INV-2026-1507 missing from bank
];

interface MatchResult {
  ref: string;
  vendor: string;
  amountA: number;
  amountB: number | null;
  dateA: string;
  dateB: string | null;
  status: 'exact' | 'amount_diff' | 'timing' | 'missing_b';
  confidence: number;
}

function DropZone({
  label,
  source,
  fileName,
  rowCount,
  onLoad,
  onClear,
}: {
  label: string;
  source: 'A' | 'B';
  fileName: string;
  rowCount: number;
  onLoad: () => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const color = source === 'A' ? 'border-accent-purple/40 hover:border-accent-purple' : 'border-blue-500/40 hover:border-blue-500';
  const badge = source === 'A'
    ? 'bg-accent-purple-dim text-accent-purple-light'
    : 'bg-blue-900/30 text-blue-400';

  return (
    <div className={`border-2 border-dashed rounded-xl p-5 transition-colors ${color} ${fileName ? 'bg-bg-elevated' : 'bg-bg-surface'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badge}`}>SOURCE {source}</span>
        <span className="text-xs text-text-secondary font-medium">{label}</span>
      </div>

      {!fileName ? (
        <>
          <div
            className="flex flex-col items-center gap-3 py-6 cursor-pointer"
            onClick={() => ref.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); onLoad(); }}
          >
            <Upload className="w-8 h-8 text-text-muted" />
            <div className="text-center">
              <p className="text-xs text-text-secondary font-medium">Drop CSV file here or click to browse</p>
              <p className="text-[10px] text-text-muted mt-1">Supported: CSV, XLSX, TXT</p>
            </div>
          </div>
          <button onClick={onLoad} className="btn-secondary w-full text-xs justify-center mt-2">
            <FileText className="w-3.5 h-3.5" />
            Use sample {source === 'A' ? 'GL Export' : 'Bank Statement'}
          </button>
          <input ref={ref} type="file" className="hidden" onChange={onLoad} accept=".csv,.xlsx,.txt" />
        </>
      ) : (
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent-purple-light" />
            <div>
              <p className="text-xs font-medium text-text-primary">{fileName}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{rowCount} rows parsed</p>
            </div>
          </div>
          <button onClick={onClear} className="text-text-muted hover:text-text-primary ml-2 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-text-secondary">{label}</span>
        <span className="text-financial text-accent-purple-light">{pct}%</span>
      </div>
      <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-purple rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ImportEngine() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');
  const [fileA, setFileA] = useState('');
  const [fileB, setFileB] = useState('');
  const [matchRule, setMatchRule] = useState<MatchRule>('both');
  const [fuzzyDays, setFuzzyDays] = useState(1);
  const [fuzzyAmount, setFuzzyAmount] = useState(0.01);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [results, setResults] = useState<MatchResult[]>([]);

  function simulateProgress() {
    setStep('running');
    setProgress(0);

    const steps: [number, string, number][] = [
      [15, 'Parsing Source A (GL Export)…', 300],
      [30, 'Parsing Source B (Bank Statement)…', 400],
      [50, 'Building reference index…', 300],
      [65, 'Running exact reference match…', 500],
      [78, 'Running fuzzy amount / date match…', 600],
      [88, 'Calculating confidence scores…', 400],
      [95, 'Identifying exceptions…', 300],
      [100, 'Generating match report…', 400],
    ];

    let i = 0;
    function next() {
      if (i >= steps.length) {
        const matchResults: MatchResult[] = SAMPLE_SOURCE_A.map(a => {
          const b = SAMPLE_SOURCE_B.find(x => x.ref === a.ref);
          if (!b) return { ref: a.ref, vendor: a.vendor, amountA: a.amount, amountB: null, dateA: a.date, dateB: null, status: 'missing_b' as const, confidence: 0 };
          if (a.amount !== b.amount) return { ref: a.ref, vendor: a.vendor, amountA: a.amount, amountB: b.amount, dateA: a.date, dateB: b.date, status: 'amount_diff' as const, confidence: 92 };
          if (a.date !== b.date) return { ref: a.ref, vendor: a.vendor, amountA: a.amount, amountB: b.amount, dateA: a.date, dateB: b.date, status: 'timing' as const, confidence: 95 };
          return { ref: a.ref, vendor: a.vendor, amountA: a.amount, amountB: b.amount, dateA: a.date, dateB: b.date, status: 'exact' as const, confidence: 100 };
        });
        setResults(matchResults);
        setStep('complete');
        return;
      }
      const [pct, label, delay] = steps[i++];
      setProgress(pct);
      setProgressLabel(label);
      setTimeout(next, delay);
    }
    next();
  }

  const matched = results.filter(r => r.status === 'exact').length;
  const exceptions = results.filter(r => r.status !== 'exact').length;

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Data Import & Matching Engine</h1>
        <p className="text-sm text-text-muted mt-0.5">Upload two data sources, configure matching rules, and run automated reconciliation</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(['upload', 'configure', 'running', 'complete'] as Step[]).map((s, i, arr) => {
          const stepIdx = arr.indexOf(step);
          const thisIdx = i;
          const done = thisIdx < stepIdx;
          const active = thisIdx === stepIdx;
          const labels = ['Upload Files', 'Configure Rules', 'Run Matching', 'Results'];
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${active ? 'text-accent-purple-light' : done ? 'text-accent-green' : 'text-text-muted'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${active ? 'border-accent-purple bg-accent-purple text-white' : done ? 'border-accent-green bg-accent-green-dim text-accent-green' : 'border-border-default'}`}>
                  {done ? '✓' : i + 1}
                </span>
                {labels[i]}
              </div>
              {i < arr.length - 1 && <span className="text-border-strong">—</span>}
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DropZone
              label="ERP / General Ledger"
              source="A"
              fileName={fileA}
              rowCount={SAMPLE_SOURCE_A.length}
              onLoad={() => setFileA('gl_export_nov_2026.csv')}
              onClear={() => setFileA('')}
            />
            <DropZone
              label="Bank Statement / Sub-Ledger"
              source="B"
              fileName={fileB}
              rowCount={SAMPLE_SOURCE_B.length}
              onLoad={() => setFileB('bank_statement_nov_2026.csv')}
              onClear={() => setFileB('')}
            />
          </div>

          {/* Preview tables */}
          {(fileA || fileB) && (
            <div className="card">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Row Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fileA && (
                  <div>
                    <p className="text-xs text-text-muted mb-2">Source A — {SAMPLE_SOURCE_A.length} rows</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-border-subtle text-text-muted">
                            <th className="text-left pb-1.5">Ref</th>
                            <th className="text-left pb-1.5">Vendor</th>
                            <th className="text-right pb-1.5">Amount</th>
                            <th className="text-center pb-1.5">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {SAMPLE_SOURCE_A.slice(0, 5).map((row, i) => (
                            <tr key={i}>
                              <td className="py-1.5 text-financial text-text-primary">{row.ref}</td>
                              <td className="py-1.5 text-text-secondary truncate max-w-[120px]">{row.vendor.split(' ').slice(0, 2).join(' ')}</td>
                              <td className="py-1.5 text-right text-financial">{formatCurrency(row.amount)}</td>
                              <td className="py-1.5 text-center text-text-muted">{row.date.slice(5)}</td>
                            </tr>
                          ))}
                          <tr><td colSpan={4} className="pt-1.5 text-text-muted text-center">+{SAMPLE_SOURCE_A.length - 5} more rows…</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {fileB && (
                  <div>
                    <p className="text-xs text-text-muted mb-2">Source B — {SAMPLE_SOURCE_B.length} rows</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-border-subtle text-text-muted">
                            <th className="text-left pb-1.5">Ref</th>
                            <th className="text-left pb-1.5">Vendor</th>
                            <th className="text-right pb-1.5">Amount</th>
                            <th className="text-center pb-1.5">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {SAMPLE_SOURCE_B.slice(0, 5).map((row, i) => (
                            <tr key={i}>
                              <td className="py-1.5 text-financial text-text-primary">{row.ref}</td>
                              <td className="py-1.5 text-text-secondary truncate max-w-[120px]">{row.vendor.split(' ').slice(0, 2).join(' ')}</td>
                              <td className="py-1.5 text-right text-financial">{formatCurrency(row.amount)}</td>
                              <td className="py-1.5 text-center text-text-muted">{row.date.slice(5)}</td>
                            </tr>
                          ))}
                          <tr><td colSpan={4} className="pt-1.5 text-text-muted text-center">+{SAMPLE_SOURCE_B.length - 5} more rows…</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep('configure')}
              disabled={!fileA || !fileB}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue to Matching Rules <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 'configure' && (
        <div className="space-y-4 max-w-xl">
          <div className="card">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Matching Rules Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide block mb-2">
                  Primary Match Strategy
                </label>
                <div className="space-y-2">
                  {([
                    ['reference', 'Reference Number (Exact)', 'Match items where invoice reference is identical'],
                    ['amount_date', 'Amount + Date (Fuzzy)', 'Match by amount within tolerance and date within ±N days'],
                    ['both', 'Reference + Amount / Date', 'Try reference first, fall back to fuzzy amount/date'],
                  ] as [MatchRule, string, string][]).map(([val, title, desc]) => (
                    <label key={val} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${matchRule === val ? 'border-accent-purple/40 bg-accent-purple-dim/20' : 'border-border-default hover:border-border-strong'}`}>
                      <input
                        type="radio"
                        name="matchRule"
                        value={val}
                        checked={matchRule === val}
                        onChange={() => setMatchRule(val)}
                        className="mt-0.5 accent-accent-purple"
                      />
                      <div>
                        <div className="text-xs font-medium text-text-primary">{title}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {(matchRule === 'amount_date' || matchRule === 'both') && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">Date Tolerance (days)</label>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      value={fuzzyDays}
                      onChange={e => setFuzzyDays(Number(e.target.value))}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">Amount Tolerance ($)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={fuzzyAmount}
                      onChange={e => setFuzzyAmount(Number(e.target.value))}
                      className="input-field w-full"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border-subtle text-xs text-text-muted space-y-1">
                <p>• Exact matches → 100% confidence</p>
                <p>• Fuzzy date match only → 95%+ confidence</p>
                <p>• Fuzzy amount match → 80–94% confidence</p>
                <p>• No match → Exception created</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-between">
            <button onClick={() => setStep('upload')} className="btn-secondary">
              Back
            </button>
            <button onClick={simulateProgress} className="btn-primary">
              <Zap className="w-4 h-4" />
              Execute Matching Engine
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Running */}
      {step === 'running' && (
        <div className="card max-w-md space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-purple-dim flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-accent-purple-light animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Matching in Progress</h3>
              <p className="text-xs text-text-muted">{progressLabel}</p>
            </div>
          </div>
          <ProgressBar pct={progress} label={`${progress}% complete`} />
          <div className="text-xs text-text-muted space-y-1">
            <p>Source A: {SAMPLE_SOURCE_A.length} rows</p>
            <p>Source B: {SAMPLE_SOURCE_B.length} rows</p>
            <p>Strategy: {matchRule === 'both' ? 'Reference + Fuzzy Fallback' : matchRule === 'reference' ? 'Reference Only' : 'Fuzzy Amount/Date'}</p>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card text-center border-accent-green/20">
              <div className="text-2xl font-bold text-financial text-accent-green">{matched}</div>
              <div className="text-xs text-text-muted mt-0.5">Matched</div>
            </div>
            <div className="card text-center border-accent-red/20">
              <div className="text-2xl font-bold text-financial text-accent-red-light">{exceptions}</div>
              <div className="text-xs text-text-muted mt-0.5">Exceptions</div>
            </div>
            <div className="card text-center border-accent-purple/20">
              <div className="text-2xl font-bold text-financial text-accent-purple-light">
                {results.length > 0 ? Math.round((matched / results.length) * 100) : 0}%
              </div>
              <div className="text-xs text-text-muted mt-0.5">Match Rate</div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Match Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted">
                    <th className="text-left pb-2">Reference</th>
                    <th className="text-left pb-2">Vendor</th>
                    <th className="text-right pb-2">Amount A</th>
                    <th className="text-right pb-2">Amount B</th>
                    <th className="text-center pb-2">Status</th>
                    <th className="text-right pb-2">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {results.map((r, i) => (
                    <tr key={i} className={`table-row-hover ${r.status === 'exact' ? '' : 'bg-accent-red-dim/5'}`}>
                      <td className="py-2 text-financial text-text-primary">{r.ref}</td>
                      <td className="py-2 text-text-secondary">{r.vendor.split(' ').slice(0, 2).join(' ')}</td>
                      <td className="py-2 text-right text-financial">{formatCurrency(r.amountA)}</td>
                      <td className="py-2 text-right text-financial">
                        {r.amountB !== null ? formatCurrency(r.amountB) : <span className="text-text-muted italic">—</span>}
                      </td>
                      <td className="py-2 text-center">
                        {r.status === 'exact' ? (
                          <span className="px-2 py-0.5 bg-accent-green-dim text-accent-green-light text-[10px] rounded-full font-semibold">Exact</span>
                        ) : r.status === 'amount_diff' ? (
                          <span className="px-2 py-0.5 bg-accent-red-dim text-accent-red-light text-[10px] rounded-full font-semibold">Amt Diff</span>
                        ) : r.status === 'timing' ? (
                          <span className="px-2 py-0.5 bg-amber-900/30 text-amber-400 text-[10px] rounded-full font-semibold">Timing</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-accent-purple-dim text-accent-purple-light text-[10px] rounded-full font-semibold">Missing</span>
                        )}
                      </td>
                      <td className="py-2 text-right text-financial font-semibold">
                        {r.confidence > 0 ? (
                          <span className={r.confidence === 100 ? 'text-accent-green' : r.confidence >= 95 ? 'text-blue-400' : 'text-amber-400'}>
                            {r.confidence}%
                          </span>
                        ) : (
                          <span className="text-accent-red-light">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => {
                toast.success('Reconciliation created — routing to Exception Queue');
                setTimeout(() => navigate('/exceptions'), 800);
              }}
              className="btn-primary"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Reconciliation
            </button>
            {exceptions > 0 && (
              <button
                onClick={() => navigate('/exceptions')}
                className="btn-secondary"
              >
                <AlertTriangle className="w-4 h-4" />
                View {exceptions} Exceptions
              </button>
            )}
            <button
              onClick={() => {
                setStep('upload');
                setFileA('');
                setFileB('');
                setResults([]);
                setProgress(0);
              }}
              className="btn-secondary"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
