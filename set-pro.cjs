#!/usr/bin/env node
'use strict';
/**
 * Admin script — set user to PRO in Firestore.
 *
 * How it works:
 *  1. Refreshes an OAuth token using the stored Firebase CLI refresh_token
 *     (client credentials are the public Firebase CLI OAuth app — same ones
 *      the `firebase` CLI itself uses, visible in firebase-tools/lib/api.js)
 *  2. Initialises firebase-admin with that token as a custom credential
 *  3. Looks up the user UID via Firebase Auth Admin API
 *  4. Writes isPro: true to users/{uid} in Firestore
 *
 * Usage:
 *   node set-pro.js
 *   node set-pro.js --email other@example.com
 *   node set-pro.js --dry-run
 */

const https   = require('https');
const fs      = require('fs');
const path    = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const PROJECT_ID   = 'better-de9aa';
const FUNCTIONS_DIR = path.join(__dirname, 'functions');

// Firebase CLI OAuth app — public credentials (firebase-tools/lib/api.js)
const CLI_CLIENT_ID     = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

// Parse CLI args
const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const emailArg = args.indexOf('--email');
const USER_EMAIL = emailArg !== -1 ? args[emailArg + 1] : 'noam922008@gmail.com';

// ── HTTP helper ───────────────────────────────────────────────────────────────
function httpPost(hostname, urlPath, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const headers = { 'Content-Length': Buffer.byteLength(bodyStr), ...extraHeaders };
    const req = https.request({ hostname, path: urlPath, method: 'POST', headers }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ── Step 1: refresh the stored CLI OAuth token ────────────────────────────────
async function getAccessToken() {
  const configPath = path.join(
    process.env.HOME || process.env.USERPROFILE,
    '.config', 'configstore', 'firebase-tools.json',
  );
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { refresh_token } = config.tokens;
  if (!refresh_token) throw new Error('No refresh_token in firebase-tools config. Run: firebase login');

  const body = [
    `client_id=${encodeURIComponent(CLI_CLIENT_ID)}`,
    `client_secret=${encodeURIComponent(CLI_CLIENT_SECRET)}`,
    `refresh_token=${encodeURIComponent(refresh_token)}`,
    'grant_type=refresh_token',
  ].join('&');

  const { status, body: res } = await httpPost(
    'oauth2.googleapis.com', '/token', body,
    { 'Content-Type': 'application/x-www-form-urlencoded' },
  );

  if (status !== 200 || !res.access_token) {
    throw new Error(`Token refresh failed (${status}): ${JSON.stringify(res)}`);
  }
  return res.access_token;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══ 1% Better — Set PRO ══════════════════════\n');
  console.log(`Email    : ${USER_EMAIL}`);
  console.log(`Project  : ${PROJECT_ID}`);
  if (DRY_RUN) console.log('Mode     : DRY RUN (no writes)\n');
  else         console.log('Mode     : LIVE\n');

  // 1. Fresh OAuth token
  process.stdout.write('→ Refreshing OAuth token... ');
  const accessToken = await getAccessToken();
  console.log('✓');

  // 2. Initialise firebase-admin with custom credential (user OAuth token)
  process.stdout.write('→ Initialising firebase-admin... ');
  const admin = require(path.join(FUNCTIONS_DIR, 'node_modules', 'firebase-admin'));
  admin.initializeApp({
    credential: {
      getAccessToken: () => Promise.resolve({ access_token: accessToken, expires_in: 3600 }),
    },
    projectId: PROJECT_ID,
  });
  console.log('✓');

  // 3. Look up UID by email via Firebase Auth Admin API
  process.stdout.write(`→ Looking up Auth user for ${USER_EMAIL}... `);
  let uid;
  try {
    const record = await admin.auth().getUserByEmail(USER_EMAIL);
    uid = record.uid;
    console.log(`✓  UID: ${uid}`);
  } catch (authErr) {
    // Auth Admin API may need service account for some orgs — fall back to
    // querying Firestore for a doc where uid field matches a sub-string scan.
    console.log(`\n  Auth lookup failed: ${authErr.message}`);
    console.log('  Falling back to Firestore uid-field scan...');

    const snapshot = await admin.firestore().collection('users').limit(200).get();
    const match = snapshot.docs.find(d => {
      const data = d.data();
      return data.email === USER_EMAIL || d.id === USER_EMAIL;
    });
    if (!match) throw new Error(`No Firestore user found for email: ${USER_EMAIL}`);
    uid = match.id;
    console.log(`  ✓ Found via Firestore scan — UID: ${uid}`);
  }

  // 4. Update Firestore via REST API (Admin SDK Firestore rejects user OAuth tokens;
  //    the REST API accepts them for project owners with cloud-platform scope)
  const DB_ROOT    = `projects/${PROJECT_ID}/databases/(default)/documents`;
  const docPath    = `${DB_ROOT}/users/${uid}`;
  const now        = Date.now();

  // Read current values via REST
  process.stdout.write('\n→ Reading current Firestore document... ');
  const readRes = await new Promise((resolve, reject) => {
    const req = require('https').request({
      hostname: 'firestore.googleapis.com',
      path: `/v1/${docPath}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    });
    req.on('error', reject); req.end();
  });

  const fFields = readRes.fields || {};
  const getField = (name, type) => fFields[name]?.[type];
  console.log('✓');
  console.log('\nCurrent Firestore fields:');
  console.log(`  isPro          : ${getField('isPro', 'booleanValue') ?? 'not set'}`);
  console.log(`  proPlan        : ${getField('proPlan', 'stringValue') ?? 'not set'}`);
  console.log(`  proPurchasedAt : ${getField('proPurchasedAt', 'integerValue') ?? 'not set'}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would PATCH: { isPro: true, proPlan: "pro", proPurchasedAt: <now> }');
  } else {
    // PATCH with updateMask so only these 3 fields are touched
    const updateMask = 'updateMask.fieldPaths=isPro&updateMask.fieldPaths=proPlan&updateMask.fieldPaths=proPurchasedAt';
    // Preserve existing proPlan if already set (don't downgrade 'annual' → 'pro')
    const existingPlan = getField('proPlan', 'stringValue');
    const planToWrite  = existingPlan || 'pro';

    const patchBody = JSON.stringify({
      fields: {
        isPro:          { booleanValue: true              },
        proPlan:        { stringValue:  planToWrite       },
        proPurchasedAt: { integerValue: String(now)       },
      },
    });

    process.stdout.write('\n→ Writing to Firestore (PATCH)... ');
    const patchRes = await new Promise((resolve, reject) => {
      const body = patchBody;
      const req = require('https').request({
        hostname: 'firestore.googleapis.com',
        path: `/v1/${docPath}?${updateMask}`,
        method: 'PATCH',
        headers: {
          Authorization:   `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
      });
      req.on('error', reject); req.write(body); req.end();
    });

    if (patchRes.status !== 200) {
      throw new Error(`Firestore PATCH failed (${patchRes.status}): ${JSON.stringify(patchRes.body)}`);
    }
    console.log('✓');

    const vFields = patchRes.body.fields || {};
    console.log('\nVerified (from PATCH response):');
    console.log(`  isPro          : ${vFields.isPro?.booleanValue}`);
    console.log(`  proPlan        : ${vFields.proPlan?.stringValue}`);
    console.log(`  proPurchasedAt : ${vFields.proPurchasedAt?.integerValue}`);
  }

  console.log('\n✅ Done! Reload the app and sign in — you\'ll have PRO access.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n✗ Error:', err.message || err);
  process.exit(1);
});
