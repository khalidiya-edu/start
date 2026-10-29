/* gate.js - the entry screen: the student writes his name, picks his grade and section, and is taken straight to his own grade.
   The roster shipped with the platform (data/roster.js) holds NO readable name and NO student number: only a pseudonymous id and
   salted hashes of the ways a boy writes his own name. The dashboard keeps the real names (see _tools/roster.py). */
(function(){
const W = window.W, E = W.esc;
const DROP = ['بن', 'ابن', 'بنت', 'bin', 'ibn', 'bint'];

/* ---------- SHA-256 (pure JS: crypto.subtle is missing on plain-http and some phones) ---------- */
const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function sha256(str){
  const b = unescape(encodeURIComponent(str)), l = b.length; const w = [];
  for (let i = 0; i < l; i++) w[i >> 2] |= b.charCodeAt(i) << (24 - (i % 4) * 8);
  w[l >> 2] |= 0x80 << (24 - (l % 4) * 8); w[(((l + 8) >> 6) << 4) + 15] = l * 8;
  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const rr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < w.length; o += 16){
    const s = new Array(64); for (let i = 0; i < 16; i++) s[i] = w[o + i] | 0;
    for (let i = 16; i < 64; i++){ const a = s[i-15], c = s[i-2]; s[i] = (s[i-16] + (rr(a,7) ^ rr(a,18) ^ (a >>> 3)) + s[i-7] + (rr(c,17) ^ rr(c,19) ^ (c >>> 10))) | 0; }
    let [a,bb,c,d,e,f,g,h] = H;
    for (let i = 0; i < 64; i++){
      const t1 = (h + (rr(e,6) ^ rr(e,11) ^ rr(e,25)) + ((e & f) ^ (~e & g)) + K[i] + s[i]) | 0;
      const t2 = ((rr(a,2) ^ rr(a,13) ^ rr(a,22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    H = [(H[0]+a)|0,(H[1]+bb)|0,(H[2]+c)|0,(H[3]+d)|0,(H[4]+e)|0,(H[5]+f)|0,(H[6]+g)|0,(H[7]+h)|0];
  }
  return H.map(x => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
}
const hh = s => sha256(window.ROSTER.salt + s).slice(0, 12);

/* ---------- names: the same rules as roster.py ---------- */
function normName(s){
  s = String(s || '').normalize('NFKC').replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').toLowerCase();
  return s.replace(/[^a-z0-9ء-ي ]/g, ' ');
}
const tokens = s => normName(s).split(/\s+/).filter(t => t && !DROP.includes(t));
function keysOf(t){
  const k = new Set(), n = t.length;
  if (n >= 2){ k.add(t[0] + ' ' + t[n-1]); k.add(t[0] + ' ' + t[1]); }
  if (n >= 3){ k.add(t.slice(0, 3).join(' ')); k.add(t[0] + ' ' + t[1] + ' ' + t[n-1]); }
  if (n >= 4) k.add(t.slice(0, 4).join(' '));
  k.add(t.join(' '));
  return k;
}
/* -> {status:'ok', pid} | {status:'ambiguous'} | {status:'miss'} ; the more of the name he wrote, the more sure the match */
W.resolveStudent = function(code, typed){
  const U = tokens(typed); if (U.length < 3) return {status: 'short'};
  const cand = new Map(); keysOf(U).forEach(k => cand.set(hh('k:' + k), k.split(' ').length));
  let best = 0, hits = [];
  ((window.ROSTER.idx || {})[code] || []).forEach(([pid, ks]) => {
    const m = ks.reduce((a, x) => Math.max(a, cand.get(x) || 0), 0);
    if (m > best){ best = m; hits = [pid]; } else if (m === best && m > 0) hits.push(pid);
  });
  if (!hits.length) return {status: 'miss'};
  return hits.length === 1 ? {status: 'ok', pid: hits[0]} : {status: 'ambiguous'};
};
W.sha256 = sha256; W.normName = normName;

/* ---------- the screen ---------- */
const GN = {9: 'التاسع', 10: 'العاشر', 11: 'الحادي عشر', 12: 'الثاني عشر'};
const secLabel = c => (c.track === 'advanced' ? 'المتقدم ' : 'العام ') + c.code.replace(/^\d+[AG]/, '');
W.me = () => W.store.get('me', null);
W.needGate = () => !!window.ROSTER && !W.me() && !W.store.get('gateSkip', false);
W.logout = () => { W.store.set('me', null); W.store.set('gateSkip', false); W.store.set('aud', null); };
const enter = (me, cls) => { W.store.set('me', me); W.store.set('aud', cls.grade + '-' + cls.track); document.getElementById('gate')?.remove(); location.hash = '#/'; W.route(); W.updateChip && W.updateChip(); };

/* the ornament behind the school: a 16-point star rosette with rings (drawn, not an image) */
function rosette(){
  const c = 400, pts = (n, R, r, rot) => Array.from({length: n * 2}, (_, k) => { const a = rot + Math.PI * k / n, rad = k % 2 ? r : R; return (c + rad * Math.sin(a)).toFixed(1) + ',' + (c - rad * Math.cos(a)).toFixed(1); }).join(' ');
  return `<svg class="gate-rose" viewBox="0 0 800 800" aria-hidden="true"><g fill="none" stroke="#c8a45d">
    <circle cx="400" cy="400" r="392" stroke-opacity=".16"/><circle cx="400" cy="400" r="372" stroke-opacity=".07"/>
    <polygon points="${pts(16, 380, 300, 0)}" stroke-opacity=".20"/><polygon points="${pts(16, 300, 236, Math.PI / 16)}" stroke-opacity=".16"/>
    <polygon points="${pts(8, 236, 170, 0)}" stroke-opacity=".18"/><polygon points="${pts(8, 170, 120, Math.PI / 8)}" stroke-opacity=".14"/>
    <circle cx="400" cy="400" r="300" stroke-opacity=".08" stroke-dasharray="2 7"/><circle cx="400" cy="400" r="86" stroke-opacity=".16"/>
  </g></svg>`;
}
const corner = pos => `<svg class="gate-corner ${pos}" viewBox="0 0 60 60" aria-hidden="true"><g fill="none" stroke="#c8a45d" stroke-width="1.2"><path d="M4 56V18Q4 4 18 4H56"/><path d="M12 56V24Q12 12 24 12H56" stroke-opacity=".5"/><path d="M4 4l9 9" stroke-opacity=".7"/></g><rect x="14" y="14" width="7" height="7" fill="#c8a45d" transform="rotate(45 17.5 17.5)"/></svg>`;

W.gate = function(){
  if (document.getElementById('gate')) return;
  const R = window.ROSTER; let step = 1, grade = null, cls = null;
  /* the one-QR launcher (khalidiya-edu.github.io/start) already asked for name, grade and section and left them in localStorage ('rev1.launch', same origin):
     enter straight away when the name is recognised; otherwise show this screen with the name filled in */
  let pre = null;
  try { if (window.LAUNCH) throw 0; const L = JSON.parse(localStorage.getItem('rev1.launch') || 'null'); localStorage.removeItem('rev1.launch');
    if (L && L.name && L.code && Date.now() - L.t < 20 * 60 * 1000){ const c = R.classes.find(x => x.code === L.code);
      if (c){ const nm = String(L.name).trim().replace(/\s+/g, ' '), r = W.resolveStudent(c.code, nm);
        if (r.status === 'ok'){ enter({pid: r.pid, cls: c.code, name: nm.split(' ')[0], full: nm, at: Date.now()}, c); return; }
        pre = nm; } } } catch (e) {}
  const el = document.createElement('div'); el.id = 'gate'; el.className = 'gate'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'تسجيل الدخول إلى المنصة');
  const STEPS = ['الاسم', 'الصف', 'الشعبة'];
  el.innerHTML = `<div class="gate-bg" aria-hidden="true"><i class="gb-orb o1"></i><i class="gb-orb o2"></i><i class="gb-orb o3"></i><i class="gb-orb o4"></i><div class="gb-geo"><i></i></div><div class="gb-dust" id="g-dust"></div><i class="gb-grain"></i></div>
  <div class="gate-wrap" id="g-wrap">
    <div class="gate-top"><img class="gt-moe" src="assets/brand/moe_full.webp" alt="وزارة التربية والتعليم — الإمارات العربية المتحدة"><img class="gt-charter" src="assets/brand/charterLight.png" alt="الميثاق الوطني للتعليم"></div>
    <header class="gate-school">
      <div class="gb-emblem" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30"/><circle cx="32" cy="32" r="25" class="th"/><path d="M12 25l20-9 20 9-20 9z"/><path d="M19 29v10c0 3 6 6 13 6s13-3 13-6V29"/><path d="M52 25v12"/></svg></div>
      <h2 class="gb-school">مدرسة الخالدية الحلقة الثالثة بنين</h2>
      <div class="gb-orn"><i></i><b></b><i></i></div>
      <div class="gb-region">المنطقة الشرقية<span dir="ltr">Al Khalidiya Cycle 3 Boys School</span></div>
    </header>
    <section class="gate-card" aria-label="تسجيل الدخول">
      <ol class="gw-steps" aria-hidden="true">${STEPS.map((t, k) => `<li data-s="${k + 1}"><i>${k + 1}</i><span>${t}</span></li>`).join('<li class="sep"></li>')}</ol>
      <div class="gw-body">
        <div class="gp" data-s="1">
          <h1>ما اسمك الكامل؟</h1><p class="gate-sub">اكتب اسمك كاملًا كما في سجلّ المدرسة.</p>
          <input id="g-name" class="gate-in" type="text" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="الاسم الكامل" aria-label="الاسم الكامل">
          <p class="gate-hint2" id="g-nh"></p>
        </div>
        <div class="gp" data-s="2" hidden>
          <h1>في أي صفٍّ أنت؟</h1><p class="gate-sub" id="g-hi"></p>
          <div class="gate-grades" id="g-grades">${[9, 10, 11, 12].map(g => `<button type="button" class="gate-g" data-g="${g}" aria-pressed="false"><b>${g}</b><span>${GN[g]}</span></button>`).join('')}</div>
        </div>
        <div class="gp" data-s="3" hidden>
          <h1>وما شعبتك؟</h1><p class="gate-sub" id="g-hi3"></p>
          <div class="gate-secs" id="g-secs"></div>
          <p class="gate-msg" id="g-msg" role="alert" hidden></p>
        </div>
      </div>
      <div class="gw-actions"><button type="button" class="gate-back" id="g-back" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>رجوع</button>
        <button type="button" class="gate-go" id="g-go" disabled><span id="g-golab">التالي</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button></div>
      <div class="gate-foot"><button type="button" class="gate-link" id="g-guest">أنا معلّم أو زائر</button></div>
    </section>
    <img class="gate-slogan" src="assets/brand/sloganLight.png" alt="بالميثاق نبلغ الآفاق">
  </div>`;
  document.body.appendChild(el);
  { const d = el.querySelector('#g-dust'); for (let k = 0; k < 22; k++){ const i = document.createElement('i'), r = Math.random; i.style.cssText = `left:${(r() * 100).toFixed(1)}%;top:${(45 + r() * 55).toFixed(1)}%;--s:${(2 + r() * 3).toFixed(1)}px;--o:${(.45 + r() * .45).toFixed(2)};--t:${(10 + r() * 9).toFixed(1)}s;--d:-${(r() * 14).toFixed(1)}s;--dx:${((r() - .5) * 90).toFixed(0)}px`; d.appendChild(i); } }
  const $ = s => el.querySelector(s), say = (id, t) => { const m = $(id); m.textContent = t || ''; m.hidden = !t; setTimeout(fit, 0); };
  const msg = t => { say('#g-msg', t); $('#g-cont')?.remove(); };
  const typed = () => $('#g-name').value.trim().replace(/\s+/g, ' '), first = () => typed().split(' ')[0];
  const ntok = () => tokens(typed()).length;
  const valid = () => step === 1 ? ntok() >= 3 : step === 2 ? !!grade : !!cls;
  const paint = () => {
    el.querySelectorAll('.gp').forEach(p => p.hidden = +p.dataset.s !== step);
    el.querySelectorAll('.gw-steps li[data-s]').forEach(li => { const n = +li.dataset.s; li.classList.toggle('on', n === step); li.classList.toggle('done', n < step); });
    $('#g-back').hidden = step === 1; $('#g-golab').textContent = step === 3 ? 'ادخل إلى المنصة' : 'التالي'; $('#g-go').disabled = !valid();
    $('#g-hi').textContent = 'أهلًا ' + first() + '، اختر صفّك.';
    $('#g-hi3').textContent = grade ? 'الصف ' + GN[grade] + ' — اختر شعبتك.' : '';
    if (step === 1) $('#g-name').focus();
    setTimeout(fit, 0);
  };
  const nameHint = () => { const n = ntok(); $('#g-nh').textContent = n === 0 ? '' : n < 3 ? 'اكتب اسمك كاملًا: ' + (3 - n) + ' من الأسماء على الأقل بعد.' : '✓ جاهز'; };
  const go = () => {
    if (!valid()) return;
    if (step < 3){ step++; msg(''); return paint(); }
    if (step === 3){
      if (window.LAUNCH) return window.LAUNCH(cls, typed());
      const r = W.resolveStudent(cls.code, typed());
      if (r.status === 'ok') return enter({pid: r.pid, cls: cls.code, name: first(), full: typed(), at: Date.now()}, cls);
      if (r.status === 'ambiguous') return msg('في شعبتك أكثر من طالب بهذا الاسم. ارجع واكتب اسمك الكامل كما في السجلّ (مع اسم العائلة).');
      msg('لم نجد هذا الاسم في شعبة ' + secLabel(cls) + '. ارجع وتأكّد من كتابة اسمك الكامل ومن شعبتك، فقد يكون في اسمك خطأ إملائي.');
      const b = document.createElement('button'); b.type = 'button'; b.id = 'g-cont'; b.className = 'gate-link'; b.textContent = 'تابع كضيف بهذا الاسم (لن يظهر تقدّمك لمعلمك)';
      b.onclick = () => enter({pid: null, cls: cls.code, name: first(), guest: typed(), at: Date.now()}, cls); $('#g-msg').after(b); setTimeout(fit, 0); return;
    }
  };
  if (pre){ $('#g-name').value = pre; }
  $('#g-name').addEventListener('input', () => { nameHint(); $('#g-go').disabled = !valid(); });
  $('#g-name').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  $('#g-grades').addEventListener('click', e => {
    const b = e.target.closest('[data-g]'); if (!b) return; grade = +b.dataset.g; cls = null;
    el.querySelectorAll('.gate-g').forEach(x => x.setAttribute('aria-pressed', x === b));
    $('#g-secs').innerHTML = R.classes.filter(c => c.grade === grade).map(c => `<button type="button" class="gate-s ${c.track}" data-c="${c.code}" aria-pressed="false">${secLabel(c)}</button>`).join('');
    $('#g-go').disabled = false; setTimeout(go, 260);
  });
  $('#g-secs').addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return; cls = R.classes.find(c => c.code === b.dataset.c); msg('');
    el.querySelectorAll('.gate-s').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#g-go').disabled = false;
  });
  $('#g-go').addEventListener('click', go);
  $('#g-back').addEventListener('click', () => { if (step > 1){ step--; msg(''); paint(); } });
  if (window.LAUNCH) $('#g-guest').closest('.gate-foot').remove(); else $('#g-guest').addEventListener('click', () => { W.store.set('gateSkip', true); el.remove(); W.route(); });
  const fit = () => { const w = $('#g-wrap'); if (!w || !('zoom' in document.body.style)) return; let lo = 0.5, hi = 1, best = 0.5; const ok = z => { w.style.zoom = z; return w.offsetHeight * z <= innerHeight - 24 && w.offsetWidth * z <= innerWidth; };
    if (ok(1)) return; for (let i = 0; i < 8; i++){ const m = (lo + hi) / 2; if (ok(m)){ best = m; lo = m; } else hi = m; } w.style.zoom = best; };
  addEventListener('resize', fit); paint(); setTimeout(fit, 30); setTimeout(fit, 400); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
};
/* a returning student is not asked again: his name stays on the device, and a short welcome says so */
W.welcomeBack = function(){
  const me = W.me && W.me(); if (!me || sessionStorage.getItem('rev1.wb')) return;
  try { sessionStorage.setItem('rev1.wb', '1'); } catch(e){}
  setTimeout(() => W.toast('أهلًا بعودتك يا ' + me.name + ' 👋 تقدّمك محفوظ'), 700);
};
})();
