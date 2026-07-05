// Telegram notifications — requires a server-side webhook that holds the bot token.
//
// Set VITE_TELEGRAM_WEBHOOK_URL to your proxy endpoint.
// Cloudflare Worker example:
//
//   export default {
//     async fetch(req) {
//       const { text, chatId } = await req.json()
//       await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
//       })
//       return new Response('ok')
//     }
//   }
//
// Bot token stays in the Worker env — never in the client bundle.

const WEBHOOK = import.meta.env.VITE_TELEGRAM_WEBHOOK_URL || ''

async function send(text, chatId) {
  if (!WEBHOOK || !chatId) return
  try {
    await fetch(WEBHOOK, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, chatId }),
    })
  } catch {}  // non-blocking — notification failures are silent
}

const RANK_EMOJI = n => n === 1 ? '🥇' : n === 2 ? '🥈' : n === 3 ? '🥉' : `#${n}`

export async function notifySetComplete({ name, reps, exerciseName, rank, chatId }) {
  const text =
    `🚀 *${name}* just crushed *${reps} reps* of ${exerciseName} on PRIME!\n` +
    `${RANK_EMOJI(rank)} Currently ranked #${rank} this week.\n\n` +
    `Are you going to let them lead? 💪`
  await send(text, chatId)
}

export async function notifyChallenge({ challengerName, challengedName, exercise, chatId }) {
  const text =
    `🥊 *${challengerName}* is challenging *${challengedName}* ` +
    `to a 24h *${exercise}* battle on PRIME!\n\nWho's going to win? 🔥`
  await send(text, chatId)
}
