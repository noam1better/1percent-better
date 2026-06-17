module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[project]/1-percent-better/accounting-agent/app/api/dashboard/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$1$2d$percent$2d$better$2f$accounting$2d$agent$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/1-percent-better/accounting-agent/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$better$2d$sqlite3__$5b$external$5d$__$28$better$2d$sqlite3$2c$__cjs$2c$__$5b$project$5d2f$1$2d$percent$2d$better$2f$accounting$2d$agent$2f$node_modules$2f$better$2d$sqlite3$29$__ = __turbopack_context__.i("[externals]/better-sqlite3 [external] (better-sqlite3, cjs, [project]/1-percent-better/accounting-agent/node_modules/better-sqlite3)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
;
const DB_PATH = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(process.env.DB_PATH ?? './data/accounting.db');
async function GET() {
    try {
        const db = new __TURBOPACK__imported__module__$5b$externals$5d2f$better$2d$sqlite3__$5b$external$5d$__$28$better$2d$sqlite3$2c$__cjs$2c$__$5b$project$5d2f$1$2d$percent$2d$better$2f$accounting$2d$agent$2f$node_modules$2f$better$2d$sqlite3$29$__["default"](DB_PATH, {
            readonly: true
        });
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const monthStart = `${year}-${month}-01T00:00:00.000Z`;
        const monthEnd = `${year}-${month}-31T23:59:59.999Z`;
        const monthLabel = now.toLocaleString('en-US', {
            month: 'long',
            year: 'numeric'
        });
        const monthTotals = db.prepare(`SELECT currency,
                COALESCE(SUM(total_amount), 0) AS total,
                COUNT(*) AS count
         FROM processed_invoices
         WHERE processed_at >= ? AND processed_at <= ?
           AND total_amount IS NOT NULL
         GROUP BY currency
         ORDER BY total DESC`).all(monthStart, monthEnd);
        const latestInvoices = db.prepare(`SELECT id, file_name, invoice_number, issue_date, issuer_name,
                issuer_tax_id, total_amount, currency, processed_at
         FROM processed_invoices
         ORDER BY processed_at DESC
         LIMIT 20`).all();
        const { total: allTimeCount } = db.prepare('SELECT COUNT(*) AS total FROM processed_invoices').get();
        db.close();
        return __TURBOPACK__imported__module__$5b$project$5d2f$1$2d$percent$2d$better$2f$accounting$2d$agent$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            monthTotals,
            latestInvoices,
            allTimeCount,
            month: monthLabel
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('no such file') || msg.includes('unable to open')) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$1$2d$percent$2d$better$2f$accounting$2d$agent$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                monthTotals: [],
                latestInvoices: [],
                allTimeCount: 0,
                month: new Date().toLocaleString('en-US', {
                    month: 'long',
                    year: 'numeric'
                })
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$1$2d$percent$2d$better$2f$accounting$2d$agent$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: msg
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__16c-a5s._.js.map