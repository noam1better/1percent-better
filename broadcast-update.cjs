#!/usr/bin/env node
'use strict';
/**
 * Admin script — set app version in Firestore and trigger a broadcast
 * push notification to all users with FCM tokens.
 *
 * The `broadcastUpdate` Cloud Function in functions/index.js watches
 * config/app for pendingBroadcast: true and fires automatically.
 *
 * Usage:
 *   node broadcast-update.cjs                        # broadcast v2.0.0
 *   node broadcast-update.cjs --version 2.1.0        # custom version
 *   node broadcast-update.cjs --force                # set forceUpdate: true
 *   node broadcast-update.cjs --dry-run              # preview only, no writes
 *
 * Prerequisites:
 *   firebase deploy --only functions   (deploy broadcastUpdate function first)
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PROJECT_ID    = 'better-de9aa';
const CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLI_SECRET    = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const args       = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const FORCE      = args.includes('--force');
const verIdx     = args.indexOf('--version');
const VERSION    = verIdx !== -1 ? args[verIdx + 1] : '2.0.0';
const msgIdx     = args.indexOf('--message');
const CUSTOM_MSG = msgIdx !== -1 ? args[msgIdx + 1] : null;

const DEFAULT_MSG = '🚀 Upgrade Alert: The new version of 1% Better is live! Open the app to experience the latest features.';

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const req = https.request({ ...options, headers: { 'Content-Length': Buffer.byteLength(bodyStr), ...options.headers } }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function getAccessToken() {
  const config = JSON.parse(fs.readFileSync(
    path.join(process.env.HOME, '.config', 'configstore', 'firebase-tools.json'), 'utf8'
  ));
  const { refresh_token } = config.tokens;
  if (!refresh_token) throw new Error('No refresh_token — run: firebase login');

  const body = [
    `client_id=${encodeURIComponent(CLI_CLIENT_ID)}`,
    `client_secret=${encodeURIComponent(CLI_SECRET)}`,
    `refresh_token=${encodeURIComponent(refresh_token)}`,
    'grant_type=refresh_token',
  ].join('&');

  const { status, body: res } = await httpRequest(
    { hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    body,
  );
  if (status !== 200 || !res.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(res)}`);
  return res.access_token;
}

async function firestorePatch(token, docPath, fields, updateFields) {
  // Build updateMask
  const mask = updateFields.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const fsFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'boolean') fsFields[k] = { booleanValue: v };
    else if (typeof v === 'string')  fsFields[k] = { stringValue: v };
    else if (typeof v === 'number')  fsFields[k] = { integerValue: String(v) };
    else if (v === null)             fsFields[k] = { nullValue: null };
  }
  const body = JSON.stringify({ fields: fsFields });
  return httpRequest(
    { hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}?${mask}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    body,
  );
}

async function firestoreGet(token, docPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on('error', reject); req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══ 1% Better — Broadcast Update ══════════════════\n');
  console.log(`Version      : ${VERSION}`);
  console.log(`forceUpdate  : ${FORCE}`);
  console.log(`Message      : ${CUSTOM_MSG || DEFAULT_MSG}`);
  console.log(`Dry run      : ${DRY_RUN}\n`);

  process.stdout.write('→ Refreshing OAuth token... ');
  const token = await getAccessToken();
  console.log('✓');

  // Read existing config/app document
  process.stdout.write('→ Reading config/app... ');
  const { body: existing } = await firestoreGet(token, 'config/app');
  const currentVersion = existing.fields?.version?.stringValue || 'none';
  console.log(`✓  (current version: ${currentVersion})`);

  const payload = {
    version:          VERSION,
    forceUpdate:      FORCE,
    pendingBroadcast: true,           // ← triggers broadcastUpdate Cloud Function
    broadcastBody:    CUSTOM_MSG || DEFAULT_MSG,
    updatedAt:        Date.now(),
  };
  const fieldsToUpdate = Object.keys(payload);

  console.log('\nWill write to config/app:');
  for (const [k, v] of Object.entries(payload)) {
    console.log(`  ${k.padEnd(18)}: ${v}`);
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No writes made.\n');
    console.log('After deploying functions, run without --dry-run to send the broadcast.');
    return;
  }

  process.stdout.write('\n→ Writing to Firestore config/app... ');
  const { status, body: result } = await firestorePatch(token, 'config/app', payload, fieldsToUpdate);

  if (status !== 200) throw new Error(`Firestore PATCH failed (${status}): ${JSON.stringify(result)}`);
  console.log('✓');

  console.log('\n✅ Done!');
  console.log('\nThe broadcastUpdate Cloud Function will fire within ~30s and push');
  console.log('a notification to every user with an FCM token.');
  console.log('\nCheck stats after ~1 min:');
  console.log('  firebase firestore:get config/app   (or Firebase Console)');
  console.log('  Look for: lastBroadcastStats, lastBroadcastAt\n');
}

main().catch(err => {
  console.error('\n✗', err.message || err);
  process.exit(1);
});
