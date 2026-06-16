'use strict';

const { z } = require('zod');

const LineItemSchema = z.object({
  label: z.string().min(1),
  amount: z.number().nonnegative(),
  transaction_count: z.number().int().nonnegative(),
});

const AccountingSummarySchema = z.object({
  period: z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  totals: z.object({
    total_revenue: z.number().nonnegative(),
    total_expenses: z.number().nonnegative(),
    net_income: z.number(),
  }),
  breakdown: z.object({
    revenue_by_source: z.array(LineItemSchema),
    expenses_by_category: z.array(LineItemSchema),
  }),
  transaction_count: z.object({
    total: z.number().int().nonnegative(),
    revenue: z.number().int().nonnegative(),
    expense: z.number().int().nonnegative(),
  }),
  has_errors: z.boolean(),
  errors: z.array(z.string()),
  unparseable_rows: z.array(z.string()),
  validation: z.object({
    math_check_passed: z.boolean(),
    note: z.string(),
  }),
});

// Compute authoritative totals AND per-label breakdowns from raw CSV — no LLM involved
function computeGroundTruth(records) {
  let totalRevenue = 0;
  let totalExpenses = 0;
  let revenueCount = 0;
  let expenseCount = 0;
  const badRows = [];

  // Maps: label -> { amount, count }
  const revenueBySource = {};   // keyed by description
  const expensesByCategory = {}; // keyed by category

  for (const row of records) {
    const amount = parseFloat(row.amount);
    const type = (row.type || '').trim().toLowerCase();

    if (isNaN(amount)) {
      badRows.push(`Row with description="${row.description}" has non-numeric amount="${row.amount}"`);
      continue;
    }

    if (type === 'revenue') {
      totalRevenue += amount;
      revenueCount++;
      const key = (row.description || 'Unknown').trim();
      if (!revenueBySource[key]) revenueBySource[key] = { amount: 0, count: 0 };
      revenueBySource[key].amount += amount;
      revenueBySource[key].count++;
    } else if (type === 'expense') {
      totalExpenses += amount;
      expenseCount++;
      const key = (row.category || 'Unknown').trim();
      if (!expensesByCategory[key]) expensesByCategory[key] = { amount: 0, count: 0 };
      expensesByCategory[key].amount += amount;
      expensesByCategory[key].count++;
    } else {
      badRows.push(`Row with description="${row.description}" has unknown type="${row.type}"`);
    }
  }

  return {
    total_revenue: roundTo2(totalRevenue),
    total_expenses: roundTo2(totalExpenses),
    net_income: roundTo2(totalRevenue - totalExpenses),
    revenue_count: revenueCount,
    expense_count: expenseCount,
    total_count: revenueCount + expenseCount,
    revenue_by_source: Object.entries(revenueBySource).map(([label, v]) => ({
      label,
      amount: roundTo2(v.amount),
      transaction_count: v.count,
    })),
    expenses_by_category: Object.entries(expensesByCategory).map(([label, v]) => ({
      label,
      amount: roundTo2(v.amount),
      transaction_count: v.count,
    })),
    bad_rows: badRows,
  };
}

// Cross-check model's breakdown items against ground truth map.
// Corrects wrong amounts in-place, flags missing/extra labels, returns error strings.
function validateBreakdown(modelItems, groundTruthItems, kind, errors) {
  const gtMap = new Map(groundTruthItems.map((i) => [i.label.toLowerCase(), i]));
  const seenLabels = new Set();

  for (const item of modelItems) {
    const key = item.label.toLowerCase();
    const gt = gtMap.get(key);

    if (!gt) {
      errors.push(`HALLUCINATION DETECTED — ${kind} has unknown label "${item.label}" not found in source data`);
      item.amount = 0;
      item.transaction_count = 0;
      continue;
    }

    seenLabels.add(key);

    if (roundTo2(item.amount) !== gt.amount) {
      errors.push(
        `HALLUCINATION DETECTED — ${kind} "${item.label}": model amount=${item.amount}, ground truth=${gt.amount}`
      );
      item.amount = gt.amount;
    }

    if (item.transaction_count !== gt.transaction_count) {
      errors.push(
        `HALLUCINATION DETECTED — ${kind} "${item.label}": model count=${item.transaction_count}, ground truth=${gt.transaction_count}`
      );
      item.transaction_count = gt.transaction_count;
    }
  }

  // Flag categories present in source but missing from model output
  for (const gt of groundTruthItems) {
    if (!seenLabels.has(gt.label.toLowerCase())) {
      errors.push(
        `MISSING ENTRY — ${kind} "${gt.label}" exists in source data (amount=${gt.amount}) but model omitted it`
      );
      modelItems.push({ label: gt.label, amount: gt.amount, transaction_count: gt.transaction_count });
    }
  }
}

function parseAndValidateLLMResponse(rawText, groundTruth) {
  let parsed;

  try {
    const cleaned = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return {
      success: false,
      error: `JSON parse failed: ${e.message}`,
      raw: rawText,
    };
  }

  const result = AccountingSummarySchema.safeParse(parsed);

  if (!result.success) {
    return {
      success: false,
      error: `Schema validation failed: ${result.error.message}`,
      raw: parsed,
    };
  }

  const data = result.data;

  // Check 1: internal net_income consistency
  const expectedNet = roundTo2(data.totals.total_revenue - data.totals.total_expenses);
  if (expectedNet !== roundTo2(data.totals.net_income)) {
    data.has_errors = true;
    data.validation.math_check_passed = false;
    data.errors.push(
      `Internal math mismatch: ${data.totals.total_revenue} - ${data.totals.total_expenses} = ${expectedNet}, model reported net_income=${data.totals.net_income}`
    );
  }

  // Check 2: transaction count consistency
  const expectedTotal = data.transaction_count.revenue + data.transaction_count.expense;
  if (expectedTotal !== data.transaction_count.total) {
    data.has_errors = true;
    data.errors.push(
      `Transaction count mismatch: revenue(${data.transaction_count.revenue}) + expense(${data.transaction_count.expense}) = ${expectedTotal}, reported total=${data.transaction_count.total}`
    );
  }

  if (groundTruth) {
    // Check 3: top-level totals
    if (roundTo2(data.totals.total_revenue) !== groundTruth.total_revenue) {
      data.has_errors = true;
      data.validation.math_check_passed = false;
      data.errors.push(
        `HALLUCINATION DETECTED — total_revenue: model=${data.totals.total_revenue}, ground truth=${groundTruth.total_revenue}`
      );
      data.totals.total_revenue = groundTruth.total_revenue;
    }

    if (roundTo2(data.totals.total_expenses) !== groundTruth.total_expenses) {
      data.has_errors = true;
      data.validation.math_check_passed = false;
      data.errors.push(
        `HALLUCINATION DETECTED — total_expenses: model=${data.totals.total_expenses}, ground truth=${groundTruth.total_expenses}`
      );
      data.totals.total_expenses = groundTruth.total_expenses;
    }

    if (roundTo2(data.totals.net_income) !== groundTruth.net_income) {
      data.has_errors = true;
      data.validation.math_check_passed = false;
      data.errors.push(
        `HALLUCINATION DETECTED — net_income: model=${data.totals.net_income}, ground truth=${groundTruth.net_income}`
      );
      data.totals.net_income = roundTo2(data.totals.total_revenue - data.totals.total_expenses);
    }

    // Check 4: transaction counts
    if (data.transaction_count.revenue !== groundTruth.revenue_count) {
      data.has_errors = true;
      data.errors.push(
        `HALLUCINATION DETECTED — revenue transaction count: model=${data.transaction_count.revenue}, ground truth=${groundTruth.revenue_count}`
      );
      data.transaction_count.revenue = groundTruth.revenue_count;
    }

    if (data.transaction_count.expense !== groundTruth.expense_count) {
      data.has_errors = true;
      data.errors.push(
        `HALLUCINATION DETECTED — expense transaction count: model=${data.transaction_count.expense}, ground truth=${groundTruth.expense_count}`
      );
      data.transaction_count.expense = groundTruth.expense_count;
    }

    data.transaction_count.total = data.transaction_count.revenue + data.transaction_count.expense;

    // Check 5: line-item breakdowns
    validateBreakdown(
      data.breakdown.revenue_by_source,
      groundTruth.revenue_by_source,
      'revenue_by_source',
      data.errors
    );

    validateBreakdown(
      data.breakdown.expenses_by_category,
      groundTruth.expenses_by_category,
      'expenses_by_category',
      data.errors
    );

    if (data.errors.length > 0) data.has_errors = true;

    data.ground_truth = groundTruth;
  }

  return { success: true, data };
}

function roundTo2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { computeGroundTruth, parseAndValidateLLMResponse };
