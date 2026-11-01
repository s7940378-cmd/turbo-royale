// Turbo Royale — accounts (claude.ai sign-in + db) with local fallback
'use strict';
const todayKey = () => new Date().toISOString().slice(0, 10);

const Account = {
  profile: null,
  defaults(name) {
    return {
      v: 1, tag: (name || '').replace(/[^\w .-]/g, '').slice(0, 16), coins: 600, xp: 0, owned: CATALOG.filter(i => i.def).map(i => i.id), equip: Object.assign({}, DEFAULT_EQUIP),
      stats: { races: 0, wins: 0, podiums: 0, kos: 0 }, best: {}, claimed: [], daily: null, lastReward: null, created: Date.now(),
    };
  },
  async init(onStatus) {
    onStatus && onStatus('Loading your profile…');
    let prof = null;
    try { const l = localStorage.getItem('tr_profile'); if (l) prof = JSON.parse(l); } catch (e) { }
    this.load(prof);
    return this.profile;
  },
  load(prof) {
    this.profile = Object.assign(this.defaults(''), prof || {});
    const p = this.profile;
    p.equip = Object.assign({}, DEFAULT_EQUIP, p.equip || {});
    p.owned = (Array.isArray(p.owned) ? p.owned : []).filter(id => CAT[id]);
    for (const i of CATALOG) if (i.def && !p.owned.includes(i.id)) p.owned.push(i.id);
    for (const s in p.equip) if (!p.owned.includes(p.equip[s])) p.equip[s] = DEFAULT_EQUIP[s];
    p.coins = Math.max(0, p.coins | 0); p.xp = Math.max(0, p.xp | 0);
    p.stats = Object.assign({ races: 0, wins: 0, podiums: 0, kos: 0 }, p.stats || {}); p.best = p.best || {}; p.claimed = p.claimed || [];
    this.isNew = !prof || !p.tag;
    this.ensureDaily();
  },
  exportCode() { try { return 'TR1.' + btoa(unescape(encodeURIComponent(JSON.stringify(this.profile)))); } catch (e) { return ''; } },
  importCode(code) {
    code = String(code || '').trim(); if (!code.startsWith('TR1.')) throw new Error('bad');
    const obj = JSON.parse(decodeURIComponent(escape(atob(code.slice(4))))); if (!obj || typeof obj !== 'object' || !obj.tag) throw new Error('bad');
    this.load(obj); this.save();
  },
  get level() { return Math.floor(this.profile.xp / PASS_XP) + 1; },
  ensureDaily() {
    const p = this.profile, k = todayKey();
    if (!p.daily || p.daily.date !== k) {
      const r = rng(hashStr(k + (p.tag || 'x') + (p.created || 0)));
      const pool = CHALLENGES.slice(); const pick = [];
      while (pick.length < 4) { const i = Math.floor(r() * pool.length); pick.push(pool.splice(i, 1)[0].id); }
      p.daily = { date: k, list: pick.map(id => ({ id, n: 0, done: false })) };
    }
  },
  owns(id) { return this.profile.owned.includes(id); },
  save() { try { localStorage.setItem('tr_profile', JSON.stringify(this.profile)); } catch (e) { } },
  // grant rewards; returns summary
  reward(res) {
    const p = this.profile; const place = res.place, n = res.rows.length;
    let coins, xp;
    if (res.mode === 'tt') { coins = 80; xp = 450; if (res.time && (!p.best[res.track] || res.time < p.best[res.track])) { if (p.best[res.track]) { coins += 120; xp += 200; } p.best[res.track] = +res.time.toFixed(2); res.newBest = true; } }
    else { const i = Math.round((place - 1) / Math.max(1, n - 1) * 7); coins = PLACE_COINS[i] || 40; xp = PLACE_XP[i] || 300; }
    xp += res.stats.rockethit * 40 + res.stats.driftboost * 10 + res.stats.box * 5;
    p.stats.races++; if (place === 1 && res.mode !== 'tt') p.stats.wins++; if (place <= 3 && res.mode !== 'tt') p.stats.podiums++;
    // challenges
    const st = Object.assign({}, res.stats, { partyrace: res.party ? 1 : 0 });
    const doneNow = [];
    this.ensureDaily();
    for (const c of p.daily.list) {
      if (c.done) continue; const def = CHALLENGES.find(d => d.id === c.id); if (!def) continue;
      c.n = Math.min(def.goal, c.n + (st[def.stat] || 0));
      if (c.n >= def.goal) { c.done = true; coins += 100; xp += 500; doneNow.push(def.text); }
    }
    const before = this.level;
    p.coins += coins; p.xp += xp;
    const unlocked = this.claimTiers();
    this.save();
    return { coins, xp, levelUp: this.level > before ? this.level : 0, unlocked, challenges: doneNow };
  },
  claimTiers() {
    const p = this.profile, out = [];
    for (let t = 1; t <= Math.min(this.level, PASS.length); t++) {
      if (p.claimed.includes(t)) continue; p.claimed.push(t);
      const r = PASS[t - 1];
      if (r.item) { if (!this.owns(r.item)) p.owned.push(r.item); out.push(CAT[r.item].name); }
      if (r.coins) { p.coins += r.coins; out.push(r.coins + ' coins'); }
    }
    return out;
  },
};
