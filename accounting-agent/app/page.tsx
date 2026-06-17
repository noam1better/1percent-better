import StatusBadge from './StatusBadge';
import type { DashboardData } from './api/dashboard/route';

async function getDashboardData(): Promise<DashboardData> {
  const res = await fetch('http://localhost:3002/api/dashboard', {
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error('Failed to fetch dashboard data');
  return res.json();
}

function fmt(amount: number) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  let data: DashboardData;
  try {
    data = await getDashboardData();
  } catch {
    data = { monthTotals: [], latestInvoices: [], allTimeCount: 0, month: '' };
  }

  const primaryTotal = data.monthTotals[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Accounting Agent</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data.month} · {data.allTimeCount} invoices all‑time</p>
        </div>
        <StatusBadge />
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {data.monthTotals.length === 0 ? (
          <StatCard label={`Total this month`} value="—" sub="No invoices processed yet" />
        ) : (
          data.monthTotals.map((t) => (
            <StatCard
              key={t.currency}
              label={`Total this month · ${t.currency}`}
              value={fmt(t.total)}
              sub={`${t.count} invoice${t.count !== 1 ? 's' : ''}`}
              accent="text-emerald-400"
            />
          ))
        )}
        <StatCard
          label="Invoices processed"
          value={String(data.allTimeCount)}
          sub="All time"
        />
      </div>

      {/* ── Invoice table ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-200">Latest Invoices</h2>
          <span className="text-xs text-gray-500">Last 20 processed</span>
        </div>

        {data.latestInvoices.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm">
            No invoices in the database yet. Drop a PDF into <code className="bg-gray-800 px-1 rounded">inbox/</code> to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3 font-medium">Invoice #</th>
                  <th className="px-6 py-3 font-medium">Issuer</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium">Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.latestInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-3 font-mono text-gray-300 whitespace-nowrap">
                      {inv.invoice_number ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-6 py-3 text-gray-200 max-w-[220px] truncate">
                      {inv.issuer_name}
                      {inv.issuer_tax_id && (
                        <span className="ml-2 text-xs text-gray-500">{inv.issuer_tax_id}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-400 whitespace-nowrap">
                      {inv.issue_date ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right font-mono whitespace-nowrap">
                      {inv.total_amount != null ? (
                        <span className="text-emerald-400">
                          {fmt(inv.total_amount)} {inv.currency}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(inv.processed_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
