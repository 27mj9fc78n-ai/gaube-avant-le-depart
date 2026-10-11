// Faux environnement de service worker : caches en mémoire, fetch pilotable, événements déclenchables.
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs')
export const lire = f => readFileSync(join(racine, f), 'utf8')
export const BASE = 'https://exemple.test/depot/'

export function monde({ reseau, delaiMs = 60 } = {}) {
  const stockage = new Map()           // nom de cache -> Map(url -> réponse)
  const journal = { fetchs: [], requetes: [], inits: [] }
  const norm = (u, ignoreSearch) => { const x = new URL(u); if (ignoreSearch) x.search = ''; return x.href }
  class Req { constructor(url, init = {}) { this.url = typeof url === 'string' ? url : url.url; this.cache = init.cache; this.method = init.method || 'GET'; this.mode = init.mode || 'cors' } }
  class Rep { constructor(corps, ok = true) { this.corps = corps; this.ok = ok; this.status = ok ? 200 : 500 } clone() { return this } }
  const ouvrir = nom => {
    if (!stockage.has(nom)) stockage.set(nom, new Map())
    const m = stockage.get(nom)
    return {
      async add(req) { journal.requetes.push(req); const r = await ctx.fetch(req); m.set(norm(req.url), r) },
      async put(req, r) { m.set(norm(req.url), r) },
      async match(req, o = {}) {
        const cle = norm(typeof req === 'string' ? req : req.url, o.ignoreSearch)
        for (const [u, r] of m) if (norm(u, o.ignoreSearch) === cle) return r
        return undefined
      }
    }
  }
  const handlers = {}
  const ctx = {
    console, URL, Promise, setTimeout, clearTimeout, Request: Req, Response: Rep,
    location: { origin: new URL(BASE).origin },
    RGN_DELAI_MS: delaiMs,
    caches: {
      open: async nom => ouvrir(nom),
      keys: async () => [...stockage.keys()],
      delete: async nom => stockage.delete(nom),
      match: async (req, o) => { for (const nom of stockage.keys()) { const r = await ouvrir(nom).match(req, o); if (r) return r } return undefined }
    },
    fetch: async (req, init) => { journal.fetchs.push(req.url); journal.inits.push(init); return reseau(req) },
    addEventListener: (t, f) => { (handlers[t] ||= []).push(f) },
    registration: { scope: BASE },
    clients: { claim: async () => { journal.claim = true } },
    skipWaiting: () => { journal.skip = true },
    importScripts: f => vm.runInContext(lire(f), ctx)
  }
  ctx.self = ctx
  vm.createContext(ctx)
  vm.runInContext(lire('sw.js'), ctx)
  const declencher = async (type, extra = {}) => {
    let promesse
    const ev = { ...extra, waitUntil: p => { promesse = p }, respondWith: p => { promesse = p } }
    for (const h of handlers[type] || []) h(ev)
    return { traite: promesse !== undefined, resultat: promesse ? await promesse : undefined }
  }
  return { ctx, stockage, journal, declencher, Req, Rep }
}
