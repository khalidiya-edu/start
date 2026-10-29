/* core: utilities, storage, audience, curriculum, search, answer checking */
(function(){
const W = window.W = {};

/* ---------- utils ---------- */
W.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
W.$ = (s, r=document) => r.querySelector(s);
W.$$ = (s, r=document) => [...r.querySelectorAll(s)];
W.shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
W.AR_DIGITS = s => String(s).replace(/[٠-٩]/g, d => d.charCodeAt(0)-0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0)-0x6F0);
W.fmtNum = n => new Intl.NumberFormat('ar-EG-u-nu-latn').format(n);
/* Arabic counted nouns: 1 / 2 / 3-10 / 11+ */
W.cnt = (n, f) => n === 1 ? f[0] : n === 2 ? f[1] : n <= 10 ? n + ' ' + f[2] : n + ' ' + f[3];
W.CNT = {q: ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالًا'], r: ['مصدر واحد', 'مصدران', 'مصادر', 'مصدرًا'], w: ['تدريب مفتوح', 'تدريبان مفتوحان', 'تدريبات مفتوحة', 'تدريبًا مفتوحًا']};

/* ---------- storage (every access guarded: private windows / blocked storage must not break the app) ---------- */
const mem = {};
/* per-student storage: once a student has signed in (W.store 'me' = {pid,...}) his progress, mistakes, favourites, stars and streak live under his own id,
   so two boys on one device never mix; device-level choices (who is signed in, theme, text size ...) are shared */
const GLOBAL = new Set(['me', 'aud', 'gateSkip', 'theme', 'fs', 'snd', 'tmin', 'a11y', 'bkthumbs', 'reviewer', 'approved', 'gateLock']);
let curPid;
/* every class site lives on the same origin (khalidiya-edu.github.io/<site>/), so localStorage is namespaced by site: a student who opens another class never overwrites this one's login or progress */
const SITE = (() => { try { return (location.pathname.match(/^\/(g\d+-(?:general|advanced))\//) || [])[1] || ''; } catch(e){ return ''; } })();   // host-independent: works on github.io and on a custom domain
const PFX = 'rev1.' + (SITE ? SITE + '.' : '');
(function migrate(){      // progress saved before namespacing (shared 'rev1.*' keys) moves to this site once, if it belongs to this grade+track
  if (!SITE) return;
  try {
    if (localStorage.getItem(PFX + 'me') !== null) return;
    const old = JSON.parse(localStorage.getItem('rev1.me') || 'null'); if (!old || !old.cls) return;
    if (SITE !== 'g' + parseInt(old.cls) + '-' + (/A/.test(old.cls) ? 'advanced' : 'general')) return;
    const ks = []; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k && k.indexOf('rev1.') === 0 && !/^rev1\.(lang|launch|relayq|pad\.|wb|g\d+-)/.test(k)) ks.push(k); }
    ks.forEach(k => localStorage.setItem(PFX + k.slice(5), localStorage.getItem(k)));
  } catch(e){}
})();
W.storePrefix = PFX;
const pidOf = () => { if (curPid === undefined){ try { const m = JSON.parse(localStorage.getItem(PFX + 'me') || 'null'); curPid = m && m.pid ? m.pid : ''; } catch(e){ curPid = ''; } } return curPid; };
const nk = k => (GLOBAL.has(k) || !pidOf() ? '' : pidOf() + '.') + k;
W.store = {
  get(k, d){ const kk = nk(k); try { const v = localStorage.getItem(PFX + kk); return v === null ? (kk in mem ? mem[kk] : d) : JSON.parse(v); } catch(e){ return kk in mem ? mem[kk] : d; } },
  set(k, v){ const kk = nk(k); mem[kk] = v; try { localStorage.setItem(PFX + kk, JSON.stringify(v)); } catch(e){} if (k === 'me') curPid = undefined; },
};

/* ---------- static knowledge ---------- */
W.SUBJ = [
  {id:'math', ar:'الرياضيات', en:'Mathematics', icon:'<path d="M5 12h14M12 5v14"/><path d="M6 19l3-3M15 8l3-3" opacity=".0"/><circle cx="12" cy="12" r="9"/>'},
  {id:'english', ar:'اللغة الإنجليزية', en:'English', icon:'<path d="M4 19l5-14 5 14M6 14h6"/><path d="M17 8h3M17 12h3M17 16h3"/>'},
  {id:'arabic', ar:'اللغة العربية', en:'Arabic', icon:'<path d="M5 15c3 3 8 3 11-1M16 14c1-2 0-4-2-5M19 6v.01M13 6v.01M3 9l3 3"/>'},
  {id:'science', ar:'العلوم', en:'Science', icon:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/>'},
  {id:'physics', ar:'الفيزياء', en:'Physics', only:true, icon:'<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>'},
  {id:'islamic', ar:'التربية الإسلامية', en:'Islamic Education', icon:'<path d="M20 14a8 8 0 1 1-9-10 6 6 0 0 0 9 10z"/><path d="M16 6l.6 1.4L18 8l-1.4.6L16 10l-.6-1.4L14 8l1.4-.6z"/>'},
  {id:'social', ar:'الدراسات الاجتماعية', en:'Social Studies', icon:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'},
];
W.subj = id => W.SUBJ.find(s => s.id === id);
W.GRADE = {9:'التاسع',10:'العاشر',11:'الحادي عشر',12:'الثاني عشر'};
W.TRACK = {general:'عام', advanced:'متقدم'};
W.TYPE = {review:'مراجعة', summary:'ملخص', worksheet:'ورقة عمل', quiz:'اختبار قصير', past_exam:'اختبار / نموذج امتحان', spec:'هيكل الاختبار', vocab:'مفردات', grammar:'قواعد', reading:'قراءة', writing:'كتابة', slides:'عرض تقديمي', video:'فيديو', answer_key:'مفتاح إجابات', other:'مصدر'};
W.SKILL = {grammar:'القواعد', vocabulary:'المفردات', reading:'القراءة', mixed:'اختبارات شاملة'};

/* ---------- audience (grade + track) ---------- */
W.audKey = a => a.grade + '-' + a.track;
W.audLabel = k => { const [g,t] = k.split('-'); return W.GRADE[g] + ' — ' + W.TRACK[t]; };
W.audList = function(){
  const m = new Set();
  const add = a => { if (a.track) m.add(W.audKey(a)); };
  (window.RES||[]).forEach(r => r.aud.forEach(add));
  Object.values(window.BANKS||{}).flat().forEach(b => b.aud.forEach(add));
  return [...m].sort((x,y)=> parseInt(x)-parseInt(y) || (x<y?-1:1));
};
W.sel = () => W.store.get('aud', null);
W.matchAud = (auds, sel) => { if (!sel) return true; const [g,t] = sel.split('-'); return (auds||[]).some(a => a.grade == g && (a.track == null || a.track === t)); };
W.trackUnsure = (auds, sel) => { if (!sel) return false; const [g] = sel.split('-'); return (auds||[]).some(a => a.grade == g && a.track == null); };

/* ---------- data access ---------- */
W.resById = id => (W._rm ||= Object.fromEntries((window.RES||[]).map(r => [r.id, r])))[id];
/* official timetable layer (data/schedule.js): the student's section decides which teacher's files he sees */
W.sect = () => { const m = W.store.get('me', null), sel = W.sel(); if (!m || !m.cls || !sel) return ''; const c = String(m.cls).replace(/A1$/, 'ADV'); return parseInt(c) === parseInt(sel) ? c : ''; };
W.assigned = sub => { const S = window.SCHED; if (!S || !S.strict) return null; const a = S.asg[W.sect()]; return a && a[sub] ? a[sub] : null; };
W.teacherOf = sub => { const k = W.assigned(sub); return k ? window.SCHED.T[k] : null; };
W.subjLabel = id => { const S = window.SCHED, s = W.subj(id); return id === 'science' && S && S.sci[W.sect()] ? S.sci[W.sect()] : (s ? s.ar : id); };
/* a file is hidden only when its owner is KNOWN and is not the teacher of this student's section; files without an owner (made by the platform) stay */
W.ownerOK = r => { const S = window.SCHED, t = W.assigned(r.sub); if (!t || !r.teach) return true; const o = S.owner[r.teach]; return !o || o === t; };
W.sectNote = (sub, n) => { const t = W.teacherOf(sub); if (!t) return ''; return `<div class="notice">شعبتك <b dir="ltr">${W.esc(W.sect())}</b> — معلّم المادة: <b>${W.esc(t.ar)}</b>${n ? '' : '. لم تصلنا ملفاته لهذه الشعبة بعد، وسيظهر هنا ما يرفعه.'}</div>`; };
W.resFor = (sel, sub) => (window.RES||[]).filter(r => (!sub || r.sub === sub) && W.matchAud(r.aud, sel) && !r.dup && W.ownerOK(r));
W.banksFor = (sel, sub) => ((window.BANKS||{})[sub] || []).filter(b => W.matchAud(b.aud, sel));
/* auto-graded types only: open answers (written, short) are never graded as final by the machine */
W.isAuto = it => it.type !== 'written' && it.type !== 'short';
/* graded with a hidden answer until the end (timed tests): not the instant-feedback activities */
W.isGraded = it => ['mcq', 'expr', 'num', 'set'].includes(it.type);
W.INTERACTIVE = ['sort', 'order', 'match'];
/* small rewards: stars and a daily streak (no mastery percentages, no predictions) */
W.addXP = function(n){
  const d = new Date().toISOString().slice(0, 10), s = W.store.get('streak', {d: null, n: 0}), x = W.store.get('xp', 0) + n;
  if (s.d !== d){ const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10); s.n = s.d === y ? s.n + 1 : 1; s.d = d; W.store.set('streak', s); }
  W.store.set('xp', x); return x;
};
W.toast = function(msg){ const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 1700); };
W.itemId = (b, it, i) => it.id || (b.id + '#' + (it.n || i + 1));
/* approvals: the file data/approvals.js (written by _tools/apply_approvals.py from a reviewer's export) + this device's reviewer marks */
W.approvals = () => Object.assign({}, window.APPROVED || {}, W.store.get('approved', {}));
W.lessonApproved = L => { const ap = W.approvals(); return !!L.banks.length && L.banks.every(b => ap[b.id]) && (!L.guide || ap['g:' + (L.guide.lesson || L.guide.title)]); };

/* curriculum: units -> lessons, built from banks + lesson meta (nothing is hard-coded per grade) */
const slug = s => String(s||'').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g,'-').replace(/^-|-$/g,'');
W.curriculum = function(sel, sub){
  const banks = W.banksFor(sel, sub);
  const units = new Map();
  const U = (u, t) => { if (!units.has(u)) units.set(u, {u, t, lessons: []}); return units.get(u); };
  W.LESSON = W.LESSON || {};
  if (sub !== 'english' && window.LMETA && window.LMETA[sub]){
    (window.LMETA?.[sub]||[]).filter(l => W.matchAud(l.aud, sel)).forEach(l => {
      const un = U(l.unit, l.ut || 'الوحدة 1 — التعابير والمعادلات التربيعية');
      const bs = banks.filter(b => b.lesson === l.id);
      const L = {id:l.id, sub, unit:l.unit, n:l.n, t:l.t, kind: l.src ? 'src' : (sub === 'math' ? 'math' : 'sci'), banks:bs, links:l.links, kw:l.kw, rids:l.rids, intro:l.intro, hub:l.hub, emoji:l.emoji, guide:(window.GUIDES||{})[l.id], pending:l.pending, adv:l.adv};
      un.lessons.push(L); W.LESSON[L.id] = L;
    });
  } else if (sub === 'english'){
    const ak = sel;
    const unitTitle = u => u ? `Unit ${u}` : 'اختبارات شاملة';
    const key = (b) => b.skill === 'grammar' ? 'g:' + slug(b.topic || b.title) : (b.skill === 'mixed' || b.unit == null) ? 'x:' + b.id : b.skill[0] + ':' + 'all';
    const groups = new Map();
    banks.forEach(b => { const u = b.unit || 0; const k = u + '|' + key(b); if (!groups.has(k)) groups.set(k, {u, b, banks: []}); groups.get(k).banks.push(b); });
    [...groups.values()].sort((a,b)=> (a.u||9)-(b.u||9)).forEach(g => {
      const u = g.u; const un = U(u, unitTitle(u));
      const b0 = g.b; let t, kind;
      if (b0.skill === 'grammar' && u) { t = b0.topic || b0.title; kind = 'grammar'; }
      else if (b0.skill === 'vocabulary' && u) { t = 'Vocabulary'; kind = 'vocab'; }
      else if (b0.skill === 'reading' && u) { t = 'Reading comprehension'; kind = 'reading'; }
      else { t = b0.title; kind = 'exam'; if (b0.skill === 'grammar') t = 'Grammar quiz'; if (b0.skill === 'vocabulary') t = 'Vocabulary quiz'; }
      const id = `e-${ak}-${u}-${kind}-${slug(t)}${kind==='exam'?'-'+slug(b0.id):''}`;
      const L = {id, sub, unit:u, t, kind, banks:g.banks, guide:(window.GUIDES||{})[id] || (kind==='grammar' ? (window.GUIDES_EN||{})[slug(b0.topic||b0.title)] : null), unitNo:u};
      un.lessons.push(L); W.LESSON[id] = L;
    });
    // vocabulary glossaries for this audience attach to the vocab lesson of their unit
    (window.VOCAB||[]).filter(v => W.matchAud(v.aud, sel)).forEach(v => {
      const un = units.get(v.unit || 0); if (!un) return;
      const L = un.lessons.find(l => l.kind === 'vocab'); if (L) (L.glossaries ||= []).push(v);
    });
  } else {
    return [];
  }
  return [...units.values()].sort((a,b)=> (a.u||99)-(b.u||99));
};
/* teacher files that belong with a lesson (slides, interactive html, videos, worksheets): matched by the words the lesson lists */
W.related = function(L, sel){
  if (L.rids) return L.rids.map(W.resById).filter(Boolean);
  if (!L.kw || !L.kw.length) return [];
  const nk = L.kw.map(k => W.norm(k).trim());
  return W.resFor(sel, L.sub).filter(r => r.tp !== 'answer_key' && nk.some(k => W.norm(r.t.replace(/_/g,' ')).includes(k)));
};
W.lessonById = id => W.LESSON && W.LESSON[id];
W.allLessons = sel => {
  const auds = sel ? [sel] : W.audList(); const seen = new Map();
  auds.forEach(a => W.SUBJ.forEach(s => W.curriculum(a, s.id).forEach(u => u.lessons.forEach(L => seen.set(L.id, L)))));
  return [...seen.values()];
};

/* glossary index for feedback on vocabulary items */
W.gloss = function(word){
  if (!W._gl){ W._gl = new Map(); (window.VOCAB||[]).forEach(v => v.words.forEach(w => { const k = w.w.toLowerCase().replace(/[^a-z ]/g,'').trim(); if (!W._gl.has(k)) W._gl.set(k, w); })); }
  return W._gl.get(String(word).toLowerCase().replace(/[^a-z ]/g,'').trim());
};

/* ---------- Arabic-aware text normalisation (length-preserving, so snippets can be cut from the raw text) ---------- */
W.norm = function(s){
  return String(s||'').normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g,'')
    .replace(/[٠-٩]/g, d => d.charCodeAt(0)-0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0)-0x6F0)
    .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
    .replace(/لا/g,'ال').toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]/g,' ');
};

/* ---------- search ---------- */
W.buildIndex = function(){
  if (W._idx) return W._idx;
  const idx = {pages:[], q:[], l:[]};
  const S = window.SIDX || {};
  Object.keys(S).forEach(rid => S[rid].forEach(([n, tx]) => idx.pages.push({rid, n, tx, nt: W.norm(tx)})));
  Object.entries(window.BANKS||{}).forEach(([sub, arr]) => arr.forEach(b => b.items.forEach((it, i) => {
    const txt = [it.q, ...(it.o||[])].join(' ').replace(/\$|\\[a-z]+/g,' ');
    idx.q.push({sub, b, it, i, nt: W.norm(txt), raw: it.q});
  })));
  Object.values(window.GUIDES||{}).concat(Object.values(window.GUIDES_EN||{})).forEach(g => {
    const txt = [g.title||'', g.idea||'', g.outcome||'', ...(g.rules||[]).map(r=>r.n+' '+(r.w||'')), ...(g.recap||[])].join(' ');
    idx.l.push({g, nt: W.norm(txt)});
  });
  return W._idx = idx;
};
/* readable plain text from a rich string (TeX stripped) - used for search snippets */
W.plain = s => String(s||'').replace(/\$([^$]*)\$/g, (m, t) => ' ' + t.replace(/\\(?:frac|dfrac)\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)').replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}]/g, '').replace(/\^2/g, '²').replace(/\^3/g, '³') + ' ').replace(/\s+/g, ' ').trim();
W.highlight = function(raw, toks, max=220){
  const nt = W.norm(raw);
  let pos = -1;
  for (const t of toks){ const p = nt.indexOf(t); if (p >= 0 && (pos < 0 || p < pos)) pos = p; }
  const a = Math.max(0, pos - 70), b = Math.min(raw.length, a + max);
  const hits = [];
  toks.forEach(t => { let p = nt.indexOf(t, a); while (p >= 0 && p < b){ hits.push([p, p + t.length]); p = nt.indexOf(t, p + t.length); } });
  hits.sort((x,y)=>x[0]-y[0]);
  let out = '', cur = a;
  hits.forEach(([s,e]) => { if (s < cur) return; out += W.esc(raw.slice(cur, s)) + '<mark>' + W.esc(raw.slice(s, e)) + '</mark>'; cur = e; });
  out += W.esc(raw.slice(cur, b));
  return (a > 0 ? '… ' : '') + out.replace(/\n+/g, ' ') + (b < raw.length ? ' …' : '');
};
/* light Arabic stemming for the QUERY only (the text is searched as a substring): drop «ال» and common endings, so
   «ثلاثية الحدود» finds «ثلاثيات الحدود» */
W.qtok = function(q){
  return W.norm(q).split(/\s+/).filter(Boolean).map(t => {
    if (!/[؀-ۿ]/.test(t)) return t;
    if (t.length > 4 && t.startsWith('ال')) t = t.slice(2);
    for (const suf of ['ات','ون','ين','ان','ه','ي']) if (t.length - suf.length >= 4 && t.endsWith(suf)) { t = t.slice(0, -suf.length); break; }
    return t;
  });
};
W.search = function(q, sel, all){
  const toks = W.qtok(q);
  if (!toks.length) return null;
  const idx = W.buildIndex();
  const okAud = auds => all || W.matchAud(auds, sel);
  const hasAll = nt => toks.every(t => nt.includes(t));
  // resources: group page hits
  const byRes = new Map();
  idx.pages.forEach(p => {
    if (!hasAll(p.nt)) return;
    const r = W.resById(p.rid); if (!r || r.dup || !okAud(r.aud) || (!all && !W.ownerOK(r))) return;
    if (!byRes.has(p.rid)) byRes.set(p.rid, {r, pages: [], score: 0});
    const e = byRes.get(p.rid); e.pages.push(p); e.score += toks.reduce((s,t)=> s + (p.nt.split(t).length - 1), 0);
  });
  (window.RES||[]).forEach(r => { if (r.dup || !okAud(r.aud) || (!all && !W.ownerOK(r))) return; const nt = W.norm(r.t); if (hasAll(nt)){ if (!byRes.has(r.id)) byRes.set(r.id, {r, pages: [], score: 0}); byRes.get(r.id).score += 50; } });
  const resources = [...byRes.values()].sort((a,b)=> b.score - a.score).slice(0, 40);
  const questions = idx.q.filter(x => hasAll(x.nt) && okAud(x.b.aud)).slice(0, 40);
  const lessons = idx.l.filter(x => hasAll(x.nt)).map(x => x.g).filter(g => !g.aud || okAud(g.aud));
  const lessonRows = []; // lessons whose title matches
  W.allLessons(all ? null : sel).forEach(L => { const nt = W.norm((L.t||'') + ' ' + (L.n||'')); if (hasAll(nt)) lessonRows.push(L); });
  return {toks, resources, questions, lessons, lessonRows};
};

/* ---------- answer checking (equivalence, not text equality) ---------- */
const MJ = () => window.math;
W.cleanInput = function(s){
  return W.AR_DIGITS(String(s||''))
    .replace(/[−–—]/g,'-').replace(/×/g,'*').replace(/÷/g,'/').replace(/،/g,',').replace(/٫/g,'.').replace(/٬/g,'')
    .replace(/²/g,'^2').replace(/³/g,'^3').replace(/√/g,'sqrt').replace(/π/g,'pi')
    .replace(/½/g,'(1/2)').replace(/¼/g,'(1/4)').replace(/¾/g,'(3/4)')
    .replace(/\s+/g,' ').trim();
};
W.parseNumber = function(s){
  s = W.cleanInput(s).replace(/^[a-zA-Z]\s*=\s*/,'').replace(/%$/,'/100');
  if (!s) return null;
  try { const v = MJ().evaluate(s, {}); const n = typeof v === 'number' ? v : (v && v.valueOf ? Number(v.valueOf()) : NaN); return Number.isFinite(n) ? n : null; } catch(e){ return null; }
};
W.sameExpr = function(user, ans){
  const m = MJ();
  let a, b;
  try { a = m.parse(W.cleanInput(user)); b = m.parse(W.cleanInput(ans)); } catch(e){ return {status:'syntax'}; }
  const syms = new Set();
  [a,b].forEach(n => n.traverse((nd, path, parent) => { if (nd.isSymbolNode && !(parent && parent.isFunctionNode && parent.fn === nd) && nd.name !== 'pi') syms.add(nd.name); }));
  const names = [...syms];
  let good = 0;
  for (let t = 0; t < 14 && good < 8; t++){
    const sc = {pi: Math.PI};
    names.forEach((n,i) => sc[n] = (Math.floor(Math.random()*13) - 6) + 0.5 + i*0.37);
    let x, y;
    try { x = a.evaluate(sc); y = b.evaluate(sc); } catch(e){ return {status:'syntax'}; }
    x = Number(x); y = Number(y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    good++;
    if (Math.abs(x - y) > 1e-7 * (1 + Math.abs(y))) return {status:'wrong'};
  }
  return good >= 3 ? {status:'ok'} : {status:'syntax'};
};
W.parseSet = function(s){
  const parts = W.cleanInput(s).split(/[,;\n]|\s+(?:أو|او|or|and|و)\s+/).map(p => p.trim()).filter(Boolean);
  const vals = [];
  for (const p0 of parts){
    let p = p0.replace(/^[a-zA-Z]\s*=\s*/,'');
    const pm = /^(±|\+-|\+\/-)\s*/.test(p);
    if (pm) p = p.replace(/^(±|\+-|\+\/-)\s*/,'');
    const v = W.parseNumber(p);
    if (v === null) return null;
    vals.push(v); if (pm) vals.push(-v);
  }
  vals.sort((x,y)=>x-y);
  const out = []; vals.forEach(v => { if (!out.length || Math.abs(out[out.length-1]-v) > 1e-9) out.push(v); });
  return out;
};
W.checkAnswer = function(item, input){
  if (!String(input||'').trim()) return {status:'empty'};
  if (item.type === 'short'){
    const n = s => W.norm(s).replace(/\s+/g,' ').trim().replace(/^ال/,'');
    const u = n(input); return {status: item.accept.some(a => n(a) === u) ? 'ok' : 'wrong'};
  }
  if (item.type === 'num'){
    if (item.pct) input = String(input).replace(/%/g,'');
    const u = W.parseNumber(input), a = W.parseNumber(item.ans);
    if (u === null) return {status:'syntax'};
    return {status: Math.abs(u - a) <= 1e-9 * (1 + Math.abs(a)) ? 'ok' : 'wrong'};
  }
  if (item.type === 'set'){
    const u = W.parseSet(input), a = W.parseSet(item.ans);
    if (!u) return {status:'syntax'};
    if (u.length !== a.length || u.some((v,i)=>Math.abs(v-a[i])>1e-9)) return {status:'wrong', partial: u.filter(v => a.some(w => Math.abs(v-w)<1e-9)).length};
    return {status:'ok'};
  }
  if (item.type === 'expr'){
    if (/[()]/.test(input)) { const r = W.sameExpr(input, item.ans); return r.status === 'ok' ? {status:'form'} : r; }
    return W.sameExpr(input, item.ans);
  }
  return {status:'syntax'};
};

/* ---------- rich text: $…$ -> KaTeX ---------- */
W.tex = (m, display=false) => { try { return window.katex.renderToString(m, {throwOnError:false, displayMode:display, strict:false}); } catch(e){ return W.esc(m); } };
const LATIN_RUN = /([A-Za-z][A-Za-z0-9'’\-]*(?:[ ]+[A-Za-z0-9][A-Za-z0-9'’\-\/]*)*(?:[ ]*[?.!,:;]+(?![A-Za-z]))?)/g;
W.rich = function(s){
  if (s == null) return '';
  const parts = String(s).replace(/\\\$/g, '\uE000').split('$');   // \$ = a literal dollar sign (currency), not a math delimiter
  return parts.map((p,i) => i % 2 ? W.tex(p) : p.split(LATIN_RUN).map((x,j) => j % 2 ? '<bdi dir="ltr">' + W.esc(x) + '</bdi>' : W.esc(x)).join('').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\uE000/g, '$$')).join('');
};
W.opt = (o, sub) => (sub === 'math' && !/[؀-ۿ]|AED|\$/.test(o)) ? W.tex(o) : W.rich(o);   // an option that carries its own $…$ delimiters goes through rich()

/* ---------- progress ---------- */
W.prog = () => W.store.get('prog', {});
W.record = function(id, ok){
  const p = W.prog(); const e = p[id] || {n:0};
  e.ok = !!ok; e.n++; e.t = Date.now(); p[id] = e; W.store.set('prog', p);
};
W.lessonProgress = L => {
  const p = W.prog(); let tot = 0, done = 0, right = 0;
  L.banks.forEach(b => b.items.forEach((it,i) => { if (!W.isAuto(it)) return; tot++; const e = p[W.itemId(b,it,i)]; if (e){ done++; if (e.ok) right++; } }));
  return {tot, done, right};
};
})();
