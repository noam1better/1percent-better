import { db, isFirebaseConfigured } from './firebase'
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'

const COL = 'leads'
const LS_KEY = 'bb_leads'

const lsGet = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] } }
const lsSet = v => { try { localStorage.setItem(LS_KEY, JSON.stringify(v)) } catch {} }

export async function saveLead({ websiteId, websiteName, name, phone, message, source = 'contact_form' }) {
  const entry = { websiteId, websiteName: websiteName || '', name: name || '', phone: phone || '', message: message || '', source, createdAt: new Date().toISOString() }
  if (isFirebaseConfigured && db) {
    try {
      const ref = await addDoc(collection(db, COL), { ...entry, createdAt: serverTimestamp() })
      return { ...entry, id: ref.id }
    } catch {}
  }
  const id = Date.now().toString()
  const lead = { ...entry, id }
  lsSet([lead, ...lsGet().slice(0, 499)])
  return lead
}

export async function loadLeads(websiteId) {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, COL), where('websiteId', '==', websiteId), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch {}
  }
  return lsGet().filter(l => l.websiteId === websiteId)
}

export async function deleteLead(id) {
  if (isFirebaseConfigured && db) {
    try { await deleteDoc(doc(db, COL, id)) } catch {}
  }
  lsSet(lsGet().filter(l => l.id !== id))
}

export function leadsToCSV(leads) {
  const H = ['שם', 'טלפון', 'הודעה', 'מקור', 'תאריך']
  const rows = leads.map(l => [l.name, l.phone, l.message, l.source,
    l.createdAt ? new Date(l.createdAt?.seconds ? l.createdAt.seconds * 1000 : l.createdAt).toLocaleDateString('he-IL') : ''])
  return [H, ...rows].map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n')
}
