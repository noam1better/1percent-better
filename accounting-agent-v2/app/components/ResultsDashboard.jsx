'use client';

import { useCallback } from 'react';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// ── Parse correction strings from validator into structured objects ────────────
// Input: "HALLUCINATION DETECTED — total_revenue: model=5000, ground truth=3620"
// Output: { field, original, corrected, kind }
function parseCorrectionLog(errors) {
  return errors
    .map((e) => {
      const hallucinationMatch = e.match(
        /HALLUCINATION DETECTED — (.+?):\s*model(?:\s+\w+)?=([0-9.]+),\s*ground truth=([0-9.]+)/i
      );
      if (hallucinationMatch) {
        return {
          kind: 'correction',
          field: hallucinationMatch[1].trim(),
          original: parseFloat(hallucinationMatch[2]),
          corrected: parseFloat(hallucinationMatch[3]),
          raw: e,
        };
      }
      const missingMatch = e.match(/MISSING ENTRY — (.+?) exists in source data \(amount=([0-9.]+)\)/i);
      if (missingMatch) {
        return {
          kind: 'missing',
          field: missingMatch[1].trim(),
          original: null,
          corrected: parseFloat(missingMatch[2]),
          raw: e,
        };
      }
      return { kind: 'other', field: null, original: null, corrected: null, raw: e };
    });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  const colors = {
    green:  { bg: 'bg-emerald-950/50', border: 'border-emerald-800/50', text: 'text-emerald-400', label: 'text-emerald-600' },
    red:    { bg: 'bg-rose-950/50',    border: 'border-rose-800/50',    text: 'text-rose-400',    label: 'text-rose-600' },
    blue:   { bg: 'bg-blue-950/50',    border: 'border-blue-800/50',    text: 'text-blue-400',    label: 'text-blue-600' },
    yellow: { bg: 'bg-yellow-950/50',  border: 'border-yellow-800/50',  text: 'text-yellow-400',  label: 'text-yellow-600' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`rounded-2xl border p-6 ${c.bg} ${c.border}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${c.label}`}>{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${c.text}`}>{fmt(value)}</p>
    </div>
  );
}

function BreakdownTable({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <h3 className="font-semibold text-gray-200 text-sm">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800/60">
            <th className="text-left px-5 py-3 text-gray-500 font-medium">Label</th>
            <th className="text-right px-5 py-3 text-gray-500 font-medium">Amount</th>
            <th className="text-right px-5 py-3 text-gray-500 font-medium">Txns</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-gray-800/40 last:border-0 hover:bg-gray-800/30 transition-colors">
              <td className="px-5 py-3 text-gray-300">{item.label}</td>
              <td className="px-5 py-3 text-right tabular-nums text-gray-200 font-medium">{fmt(item.amount)}</td>
              <td className="px-5 py-3 text-right tabular-nums text-gray-500">{item.transaction_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValidationBadge({ passed }) {
  return passed ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Math verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950 border border-rose-800 text-rose-400 text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
      Math errors detected
    </span>
  );
}

function CorrectionLog({ errors }) {
  if (!errors?.length) return null;
  const items = parseCorrectionLog(errors);

  return (
    <div className="rounded-2xl border border-amber-800/50 bg-amber-950/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-800/40 flex items-center gap-2">
        <span className="text-amber-400 text-base">🔍</span>
        <h3 className="font-semibold text-amber-300 text-sm">Visual Audit Trail — Correction Log</h3>
        <span className="ml-auto text-amber-600 text-xs">{items.length} correction{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="divide-y divide-amber-800/20">
        {items.map((item, i) => (
          <div key={i} className="px-5 py-3 flex items-start gap-4 text-xs">
            {item.kind === 'correction' && (
              <>
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-amber-900 border border-amber-700 text-amber-400 flex items-center justify-center font-bold">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-amber-200 font-medium mb-1 truncate">{item.field}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800/50 text-rose-400 font-mono">
                      Original: {fmt(item.original)}
                    </span>
                    <span className="text-gray-600">→</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/50 text-emerald-400 font-mono">
                      Corrected: {fmt(item.corrected)}
                    </span>
                    <span className="text-gray-600 italic">by Ground Truth</span>
                  </div>
                </div>
              </>
            )}
            {item.kind === 'missing' && (
              <>
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-900 border border-blue-700 text-blue-400 flex items-center justify-center font-bold">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-blue-200 font-medium mb-1 truncate">{item.field}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800/50 text-blue-400 font-mono">
                      Added: {fmt(item.corrected)}
                    </span>
                    <span className="text-gray-600 italic">missing from AI output — restored from source</span>
                  </div>
                </div>
              </>
            )}
            {item.kind === 'other' && (
              <>
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 flex items-center justify-center font-bold">{i + 1}</span>
                <p className="text-gray-400 font-mono flex-1">{item.raw}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PDF export ────────────────────────────────────────────────────────────────
function useExportPDF(data) {
  return useCallback(async () => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const { summary, fileType } = data;
    const { totals, breakdown, transaction_count, errors, validation, period } = summary;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Header bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Analysis Report', 14, 12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${now}  ·  Source: ${fileType}  ·  Period: ${period.start_date} → ${period.end_date}`, 14, 20);
    doc.text(`Transactions: ${transaction_count.total}  (Revenue: ${transaction_count.revenue}, Expense: ${transaction_count.expense})`, 14, 25);

    // Validation badge
    const badgeColor = validation.math_check_passed ? [16, 185, 129] : [239, 68, 68];
    doc.setFillColor(...badgeColor);
    doc.roundedRect(pageW - 55, 6, 42, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(validation.math_check_passed ? 'MATH VERIFIED' : 'MATH ERRORS', pageW - 34, 11.5, { align: 'center' });

    let y = 38;

    // Summary totals table
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['', 'Amount']],
      body: [
        ['Total Revenue',  fmt(totals.total_revenue)],
        ['Total Expenses', fmt(totals.total_expenses)],
        ['Net Income',     fmt(totals.net_income)],
      ],
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      bodyStyles: { textColor: [30, 41, 59] },
      rowStyles: (row) => row.index === 2 ? { fontStyle: 'bold', fillColor: [241, 245, 249] } : {},
      margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable.finalY + 10;

    // Revenue breakdown
    if (breakdown.revenue_by_source?.length) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Revenue by Source', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Source', 'Amount', 'Transactions']],
        body: breakdown.revenue_by_source.map((i) => [i.label, fmt(i.amount), i.transaction_count]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [6, 78, 59], textColor: 255 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Expense breakdown
    if (breakdown.expenses_by_category?.length) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Expenses by Category', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Category', 'Amount', 'Transactions']],
        body: breakdown.expenses_by_category.map((i) => [i.label, fmt(i.amount), i.transaction_count]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [127, 29, 29], textColor: 255 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Correction log
    if (errors?.length) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('AI Correction Log (Audit Trail)', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['#', 'Correction Detail']],
        body: errors.map((e, i) => [i + 1, e]),
        styles: { fontSize: 7.5, cellPadding: 3 },
        headStyles: { fillColor: [120, 53, 15], textColor: 255 },
        columnStyles: { 0: { cellWidth: 8, halign: 'center' } },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `1% Better AI Accounting Agent  ·  All values verified against source data  ·  Page ${i} of ${pageCount}`,
        pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' }
      );
    }

    const filename = `financial-report-${period.start_date}-to-${period.end_date}.pdf`;
    doc.save(filename);
  }, [data]);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResultsDashboard({ data }) {
  const { summary, fileType, groundTruthAvailable } = data;
  const { totals, breakdown, transaction_count, has_errors, errors, validation, period } = summary;
  const netPositive = totals.net_income >= 0;
  const exportPDF = useExportPDF(data);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Analysis Complete</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {period.start_date} → {period.end_date} &nbsp;·&nbsp;
            {transaction_count.total} transactions &nbsp;·&nbsp;
            <span className="font-mono text-gray-600">{fileType}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ValidationBadge passed={validation.math_check_passed} />
          {!groundTruthAvailable && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-950 border border-yellow-800 text-yellow-400 text-xs font-semibold">
              PDF — no ground-truth check
            </span>
          )}
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            ↓ Export Report PDF
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Revenue"  value={totals.total_revenue}  color="green" />
        <StatCard label="Total Expenses" value={totals.total_expenses} color="red" />
        <StatCard label="Net Income"     value={totals.net_income}     color={netPositive ? 'blue' : 'yellow'} />
      </div>

      {/* Visual Audit Trail */}
      {has_errors && errors.length > 0 && <CorrectionLog errors={errors} />}

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownTable title="Revenue by Source"    items={breakdown.revenue_by_source} />
        <BreakdownTable title="Expenses by Category" items={breakdown.expenses_by_category} />
      </div>

      {/* Transaction counts */}
      <div className="flex gap-4 flex-wrap">
        {[
          { label: 'Total transactions', val: transaction_count.total },
          { label: 'Revenue entries',    val: transaction_count.revenue },
          { label: 'Expense entries',    val: transaction_count.expense },
        ].map(({ label, val }) => (
          <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-800">
            <span className="text-gray-400 text-sm">{label}</span>
            <span className="text-gray-200 font-bold tabular-nums">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
