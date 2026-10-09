(() => {
const { SUPABASE_URL: SB, SUPABASE_ANON_KEY: KEY } = window.CONFIG;
const H = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
const $app = document.getElementById("app");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toast = m => { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 3200); };
const fdate = d => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fdt = d => d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const aed = n => "AED " + Math.round(n || 0).toLocaleString("en-US");
const LOGO = (n = 36) => `<svg width="${n}" height="${n}" viewBox="0 0 48 48"><defs><linearGradient id="ia" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d5fe0"/><stop offset="1" stop-color="#0e9f9a"/></linearGradient><linearGradient id="ib" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dbe9ff"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#ia)"/><path d="M24 7.500 38.500 13v11c0 8.200-6.200 14.200-14.500 17.300C15.700 38.200 9.500 32.200 9.500 24V13Z" fill="url(#ib)"/><path d="M15.500 29.500v-3.200l2.200-5.100c.5-1.100 1.500-1.800 2.700-1.800h7.200c1.200 0 2.200.7 2.700 1.800l2.200 5.100v3.200h-2.600v-1.700H18.100v1.700Z" fill="#1d5fe0"/><path d="m19.400 22.200 1.200-2.600c.2-.4.600-.6 1-.6h5.600c.4 0 .8.200 1 .6l1.200 2.600Z" fill="url(#ib)"/><circle cx="19.600" cy="27.200" r="1.300" fill="#fff"/><circle cx="28.400" cy="27.200" r="1.300" fill="#fff"/><path d="m37.500 5.500.9 2.400 2.400.9-2.400.9-.9 2.400-.9-2.400-2.400-.9 2.400-.9Z" fill="#ffd54a" stroke="#fff" stroke-width=".6"/></svg>`;
async function rpc(fn, args) { const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(args) }); const j = await r.json().catch(() => null); if (!r.ok) throw new Error(j?.message || "Request failed"); return j; }
function upload(file, path, onProg) { return new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open("POST", `${SB}/storage/v1/object/claim-uploads/${path}`); x.setRequestHeader("apikey", KEY); x.setRequestHeader("Authorization", "Bearer " + KEY); x.setRequestHeader("Content-Type", file.type); x.setRequestHeader("x-upsert", "false"); x.upload.onprogress = e => e.lengthComputable && onProg(e.loaded / e.total); x.onload = () => x.status < 300 ? res() : rej(new Error("Upload failed (" + x.status + ")")); x.onerror = () => rej(new Error("Network error")); x.send(file); }); }

const DEMO = { policy: "POL-45876", last4: "0337" };
const OKTYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"], MAXMB = 10;
const STATUS = { "New": ["📥", "Received", "We have received your claim and an underwriter will open it shortly.", "#1d5fe0,#0e9f9a"], "Pending Documents": ["📎", "Documents needed", "Please upload the documents listed below so we can continue.", "#d97706,#b45309"], "Pending Underwriting": ["⏳", "In the review queue", "Your claim is complete and waiting for an underwriter.", "#1d5fe0,#4a3aa7"], "In Review": ["🔍", "Under review", "An underwriter is reviewing your claim and documents.", "#4a3aa7,#1d5fe0"], "Pending Garage Estimate": ["🔧", "Approved - awaiting repair estimate", "Your claim is approved in principle. We are waiting for the garage estimate.", "#0e9f9a,#16a34a"], "Approved": ["✅", "Approved", "Your claim is approved. Payment is being processed.", "#16a34a,#0e9f9a"], "Closed": ["🎉", "Settled", "Your claim is settled and payment has been released.", "#16a34a,#0e9f9a"], "Rejected": ["✕", "Declined", "We could not approve this claim. Contact us if you would like to discuss it.", "#dc2626,#b91c1c"] };

// ---------- state ----------
let S = JSON.parse(sessionStorage.getItem("ca_state") || "null") || { step: 1, policy: null, f: { driver: "self", claim_type: "Own Damage", accident_type: "Collision", areas: [], injuries: "no", emirate: "Dubai" } };
let FILES = { emirates_id: [], licence: [], registration: [], police_report: [], photo: [], other: [] };
const save = () => sessionStorage.setItem("ca_state", JSON.stringify(S));
const needsPolice = () => ["Collision", "Side Impact"].includes(S.f.accident_type);

// ---------- layout ----------
function shell(active, inner) {
  $app.innerHTML = `<header class="top"><div class="in"><a class="brand" href="#/">${LOGO(38)}<div class="wm"><span><b>Claim</b><em>Assist</em></span><small>Fast, fair claims</small></div></a>
    <nav class="nav"><a href="#/" class="${active === "home" ? "on" : ""}">Home</a><a href="#/new" class="${active === "new" ? "on" : ""}">Submit a claim</a><a href="#/track" class="${active === "track" ? "on" : ""}">Track a claim</a><span class="help">Help: 800 CLAIMS</span></nav></div></header><main>${inner}</main><footer>© ClaimAssist · Demo environment with synthetic data · Your documents are used only to process this claim.</footer>`;
}
function route() {
  const [p, a] = (location.hash.replace(/^#\/?/, "") || "").split("/");
  if (p === "new") return wizard();
  if (p === "track") return track(a);
  if (p === "done") return done(a);
  return home();
}
window.addEventListener("hashchange", route);

// ---------- home ----------
function home() {
  shell("home", `<div class="hero"><h1>File your motor claim in minutes - and track it every step</h1><p>Tell us what happened, upload your documents and photos, and we'll take it from there. AI-assisted review means faster decisions.</p><div class="acts"><a class="btn lg" style="background:#fff;color:#14213d" href="#/new">Submit a new claim</a><a class="btn ghost lg" href="#/track">Track my claim</a></div></div>
  <div class="g3"><div class="card step-c"><div class="n">1</div><div><h3>Verify your policy</h3><p style="color:var(--mut);margin:4px 0 0">Policy number and the last 4 digits of your registered mobile.</p></div></div><div class="card step-c"><div class="n">2</div><div><h3>Tell us what happened</h3><p style="color:var(--mut);margin:4px 0 0">Date, place, damaged areas and a short description.</p></div></div><div class="card step-c"><div class="n">3</div><div><h3>Upload documents</h3><p style="color:var(--mut);margin:4px 0 0">Emirates ID, licence, Mulkiya, police report and photos.</p></div></div></div>
  <div class="g2" style="margin-top:16px"><div class="card"><h3>What you'll need</h3><ul class="need"><li>Policy number and registered mobile number</li><li>Emirates ID (front and back) and driving licence</li><li>Vehicle registration card (Mulkiya)</li><li>Dubai Police traffic accident report - for collisions</li><li>At least 3 clear photos of the damage</li></ul></div>
  <div class="card"><h3>Good to know</h3><ul class="need"><li>Takes about 5 minutes</li><li>JPG, PNG, WEBP or PDF up to ${MAXMB} MB per file</li><li>You get a claim number straight away</li><li>Track status and add documents any time</li></ul><div class="demo"><b>Try the demo:</b> policy <b>${DEMO.policy}</b>, mobile last 4 digits <b>${DEMO.last4}</b>.</div></div></div>`);
}

// ---------- wizard ----------
const STEPS = ["Policy", "Your details", "Incident", "Documents", "Review"];
function wizard() {
  S.step = Math.min(Math.max(S.step, 1), 5); if (S.step > 1 && !S.policy) S.step = 1;
  const prog = `<div class="prog">${STEPS.map((t, i) => `<div class="${i + 1 < S.step ? "done" : i + 1 === S.step ? "on" : ""}"><i></i>${i + 1}. ${t}</div>`).join("")}</div>`;
  shell("new", `<div class="wiz">${prog}<div class="card" id="stepbox"></div></div>`);
  ({ 1: step1, 2: step2, 3: step3, 4: step4, 5: step5 })[S.step](document.getElementById("stepbox"));
}
const bar = (back, next, nl = "Continue") => `<div class="bar">${back ? `<button class="btn ghost" id="back">← Back</button>` : "<span></span>"}<button class="btn" id="next">${nl}</button></div>`;
const go = n => { S.step = n; save(); wizard(); window.scrollTo(0, 0); };
const val = id => document.getElementById(id)?.value?.trim() ?? "";
const setErr = (id, m) => { const e = document.getElementById("e_" + id); if (e) e.textContent = m || ""; return !m; };

function step1(b) {
  b.innerHTML = `<h2>Verify your policy</h2><p class="sub">We'll use this to fill in your vehicle and policy details.</p>
  <div class="row2"><div class="fld"><label class="l">Policy number <span class="req">*</span></label><input id="pol" placeholder="POL-45876" value="${esc(S.polIn || "")}"><div class="err" id="e_pol"></div></div>
  <div class="fld"><label class="l">Last 4 digits of registered mobile <span class="req">*</span></label><input id="l4" maxlength="4" inputmode="numeric" placeholder="1234" value="${esc(S.l4 || "")}"><div class="err" id="e_l4"></div></div></div>
  <button class="btn" id="verify">Verify policy</button> <button class="btn ghost sm" id="demo" style="margin-left:8px">Use demo policy</button>
  <div id="polcard">${S.policy ? polCard(S.policy) : ""}</div>${S.policy ? bar(false) : ""}`;
  b.querySelector("#demo").onclick = () => { b.querySelector("#pol").value = DEMO.policy; b.querySelector("#l4").value = DEMO.last4; };
  b.querySelector("#verify").onclick = async () => {
    const p = val("pol").toUpperCase(), l = val("l4"); setErr("pol", /^POL-\d{4,6}$/.test(p) ? "" : "Enter a policy number like POL-45876"); if (!/^POL-\d{4,6}$/.test(p)) return; if (!setErr("l4", /^\d{4}$/.test(l) ? "" : "Enter exactly 4 digits")) return;
    const btn = b.querySelector("#verify"); btn.disabled = true; btn.textContent = "Verifying…";
    try { const r = await rpc("uw_cust_lookup_policy", { p_policy: p, p_last4: l }); if (!r.found) { setErr("l4", "We couldn't match that policy and mobile number."); btn.disabled = false; btn.textContent = "Verify policy"; return; }
      S.policy = r; S.polIn = p; S.l4 = l; S.f = { ...S.f, insured_name: r.insured_name, insured_phone: r.insured_phone, insured_email: r.insured_email, make_model: r.make_model, vehicle_year: r.vehicle_year, reg_no: r.reg_no, vin: r.vin, color: r.color }; save(); step1(b); }
    catch (e) { toast(e.message); btn.disabled = false; btn.textContent = "Verify policy"; }
  };
  const nx = b.querySelector("#next"); if (nx) nx.onclick = () => { if (!S.policy.policy_active) return toast("This policy is not active."); go(2); };
}
const polCard = p => `<div class="pol"><b>✓ Policy verified</b><dl style="margin-top:8px"><dt>Policyholder</dt><dd>${esc(p.insured_name)}</dd><dt>Vehicle</dt><dd>${esc(p.color)} ${esc(p.make_model)} ${esc(p.vehicle_year)} · ${esc(p.reg_no)}</dd><dt>Policy period</dt><dd>${fdate(p.policy_start)} - ${fdate(p.policy_end)} ${p.policy_active ? "" : '<span style="color:var(--red)">(expired)</span>'}</dd><dt>Sum insured</dt><dd>${aed(p.sum_insured)}</dd><dt>Excess / deductible</dt><dd>${aed(p.deductible)}</dd></dl></div>`;

function step2(b) {
  const f = S.f;
  b.innerHTML = `<h2>Your details</h2><p class="sub">Check these are correct - we'll contact you here.</p>
  <div class="row2"><div class="fld"><label class="l">Full name <span class="req">*</span></label><input id="insured_name" value="${esc(f.insured_name)}"><div class="err" id="e_insured_name"></div></div><div class="fld"><label class="l">Mobile number <span class="req">*</span></label><input id="insured_phone" value="${esc(f.insured_phone)}"><div class="err" id="e_insured_phone"></div></div></div>
  <div class="fld"><label class="l">Email <span class="req">*</span></label><input id="insured_email" type="email" value="${esc(f.insured_email)}" placeholder="you@example.com"><div class="err" id="e_insured_email"></div></div>
  <div class="fld"><label class="l">Who was driving?</label><div class="rcs" style="grid-template-columns:1fr 1fr"><label class="rc"><input type="radio" name="driver" value="self" ${f.driver !== "other" ? "checked" : ""}><b>I was driving</b></label><label class="rc"><input type="radio" name="driver" value="other" ${f.driver === "other" ? "checked" : ""}><b>Someone else</b></label></div></div>
  <div class="fld" id="drv" style="display:${f.driver === "other" ? "block" : "none"}"><label class="l">Driver's full name <span class="req">*</span></label><input id="driver_name" value="${esc(f.driver_name || "")}"><div class="err" id="e_driver_name"></div></div>
  <h3 style="margin:18px 0 10px">Vehicle <small style="color:var(--mut);font-weight:400">(from your policy - edit if needed)</small></h3>
  <div class="row2"><div class="fld"><label class="l">Make & model</label><input id="make_model" value="${esc(f.make_model)}"></div><div class="fld"><label class="l">Year</label><input id="vehicle_year" inputmode="numeric" value="${esc(f.vehicle_year)}"></div></div>
  <div class="row3"><div class="fld"><label class="l">Plate number</label><input id="reg_no" value="${esc(f.reg_no)}"></div><div class="fld"><label class="l">VIN / chassis</label><input id="vin" value="${esc(f.vin)}"></div><div class="fld"><label class="l">Colour</label><input id="color" value="${esc(f.color)}"></div></div>${bar(true)}`;
  b.querySelectorAll('input[name="driver"]').forEach(r => r.onchange = () => { b.querySelector("#drv").style.display = r.value === "other" ? "block" : "none"; });
  const grab = () => { ["insured_name", "insured_phone", "insured_email", "driver_name", "make_model", "vehicle_year", "reg_no", "vin", "color"].forEach(k => { const e = b.querySelector("#" + k); if (e) f[k] = e.value.trim(); }); f.driver = b.querySelector('input[name="driver"]:checked').value; save(); };
  b.querySelector("#back").onclick = () => { grab(); go(1); };
  b.querySelector("#next").onclick = () => { grab(); const ok = [setErr("insured_name", f.insured_name ? "" : "Required"), setErr("insured_phone", /\d{7,}/.test(f.insured_phone.replace(/\D/g, "")) ? "" : "Enter a valid mobile number"), setErr("insured_email", /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.insured_email) ? "" : "Enter a valid email"), setErr("driver_name", f.driver === "other" && !f.driver_name ? "Required" : "")]; if (ok.every(Boolean)) go(3); };
}

const CAR = `<svg viewBox="0 0 200 330"><rect x="40" y="28" width="120" height="274" rx="46" fill="#dfe6f2" stroke="#9aa8bd" stroke-width="2"/>
<path class="z" data-z="front" d="M48 78 Q100 6 152 78 L152 98 L48 98Z"/><path class="z" data-z="rear" d="M48 252 L152 252 L152 270 Q100 330 48 270Z"/><rect class="z" data-z="left" x="22" y="98" width="30" height="154" rx="10"/><rect class="z" data-z="right" x="148" y="98" width="30" height="154" rx="10"/><rect class="z" data-z="roof" x="58" y="112" width="84" height="126" rx="22"/>
<text x="100" y="62" text-anchor="middle">FRONT</text><text x="100" y="286" text-anchor="middle">REAR</text><text x="37" y="180" text-anchor="middle" transform="rotate(-90 37 180)">DRIVER SIDE</text><text x="163" y="180" text-anchor="middle" transform="rotate(90 163 180)">PASSENGER SIDE</text><text x="100" y="180" text-anchor="middle">ROOF</text></svg>`;
function step3(b) {
  const f = S.f, today = new Date().toISOString().slice(0, 10), p = S.policy;
  b.innerHTML = `<h2>What happened?</h2><p class="sub">Give us as much detail as you can.</p>
  <div class="fld"><label class="l">Type of claim</label><div class="rcs" style="grid-template-columns:1fr 1fr">${[["Own Damage", "Own damage", "Damage to your own vehicle"], ["Third Party Liability", "Third-party liability", "Damage or injury to someone else"]].map(([v, t, d]) => `<label class="rc"><input type="radio" name="claim_type" value="${v}" ${f.claim_type === v ? "checked" : ""}><b>${t}</b><small>${d}</small></label>`).join("")}</div></div>
  <div class="fld"><label class="l">What kind of incident?</label><div class="chips">${["Collision", "Side Impact", "Parking Damage", "Hail Damage", "Vandalism", "Fire", "Theft"].map(v => `<label class="chip"><input type="radio" name="accident_type" value="${v}" ${f.accident_type === v ? "checked" : ""}>${v}</label>`).join("")}</div></div>
  <div class="fld"><label class="l">Where is your vehicle damaged? <small style="display:inline">(tap all that apply)</small></label><div class="car">${CAR}</div><div class="err" id="e_areas"></div></div>
  <div class="row3"><div class="fld"><label class="l">Date of incident <span class="req">*</span></label><input id="loss_date" type="date" max="${today}" min="${String(p.policy_start).slice(0, 10)}" value="${esc(f.loss_date || "")}"><div class="err" id="e_loss_date"></div></div><div class="fld"><label class="l">Approx. time</label><input id="loss_time" type="time" value="${esc(f.loss_time || "")}"></div>
  <div class="fld"><label class="l">Emirate</label><select id="emirate">${["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"].map(e => `<option ${f.emirate === e ? "selected" : ""}>${e}</option>`).join("")}</select></div></div>
  <div class="fld"><label class="l">Location <span class="req">*</span></label><input id="location" placeholder="e.g. Sheikh Zayed Road near Mall of the Emirates" value="${esc(f.location || "")}"><div class="err" id="e_location"></div></div>
  <div class="fld"><label class="l">Describe what happened <span class="req">*</span></label><textarea id="description" placeholder="Tell us how the incident happened and what damage you can see…">${esc(f.description || "")}</textarea><small id="cc">${(f.description || "").length} characters (minimum 20)</small><div class="err" id="e_description"></div></div>
  <div class="fld" id="polbox" style="display:${needsPolice() ? "block" : "none"}"><label class="l">Dubai Police report number</label><input id="police_report_no" placeholder="DXB-TAR-2026-123456" value="${esc(f.police_report_no || "")}"><small>Collisions must be reported to the police. You'll upload the report in the next step.</small></div>
  <div class="row2"><div class="fld"><label class="l">Was anyone injured?</label><div class="chips">${[["no", "No"], ["yes", "Yes"]].map(([v, t]) => `<label class="chip"><input type="radio" name="injuries" value="${v}" ${f.injuries === v ? "checked" : ""}>${t}</label>`).join("")}</div></div>
  <div class="fld"><label class="l">Your estimate of repair cost <small style="display:inline">(optional, AED)</small></label><input id="claimed_amount" inputmode="numeric" placeholder="e.g. 6500" value="${esc(f.claimed_amount || "")}"></div></div>
  <div class="fld"><label class="l">Preferred garage <small style="display:inline">(optional)</small></label><select id="garage_name"><option value="">No preference</option>${["Desert Star Auto Repairs LLC", "Gulf Precision Auto Care LLC", "Marina Collision Works LLC", "Al Quoz Premier Garage LLC"].map(g => `<option ${f.garage_name === g ? "selected" : ""}>${g}</option>`).join("")}</select></div>${bar(true)}`;
  const paint = () => b.querySelectorAll(".car .z").forEach(z => z.classList.toggle("on", f.areas.includes(z.dataset.z)));
  b.querySelectorAll(".car .z").forEach(z => z.onclick = () => { const k = z.dataset.z; f.areas = f.areas.includes(k) ? f.areas.filter(x => x !== k) : [...f.areas, k]; paint(); });
  paint();
  b.querySelector("#description").oninput = e => { b.querySelector("#cc").textContent = `${e.target.value.length} characters (minimum 20)`; };
  b.querySelectorAll('input[name="accident_type"]').forEach(r => r.onchange = () => { f.accident_type = r.value; b.querySelector("#polbox").style.display = needsPolice() ? "block" : "none"; });
  const grab = () => { ["loss_date", "loss_time", "emirate", "location", "description", "police_report_no", "claimed_amount", "garage_name"].forEach(k => f[k] = val(k)); f.claim_type = b.querySelector('input[name="claim_type"]:checked').value; f.accident_type = b.querySelector('input[name="accident_type"]:checked').value; f.injuries = b.querySelector('input[name="injuries"]:checked').value; save(); };
  b.querySelector("#back").onclick = () => { grab(); go(2); };
  b.querySelector("#next").onclick = () => { grab(); const ok = [setErr("areas", f.areas.length || ["Theft", "Fire"].includes(f.accident_type) ? "" : "Tap at least one damaged area"), setErr("loss_date", f.loss_date ? "" : "Required"), setErr("location", f.location ? "" : "Required"), setErr("description", f.description.length >= 20 ? "" : "Please write at least 20 characters")]; if (ok.every(Boolean)) go(4); };
}

const DOCS = () => [["emirates_id", "Emirates ID (front and back)", true, 2, "Photo or scan of both sides"], ["licence", "Driving licence", true, 1, "Valid UAE driving licence of the driver"], ["registration", "Vehicle registration (Mulkiya)", true, 1, "Front of the registration card"], ["police_report", "Dubai Police traffic accident report", needsPolice(), 1, "PDF or photo of the report"], ["photo", "Photos of the damage", true, 8, "Upload at least 3 clear photos from different angles"], ["other", "Other documents", false, 5, "Repair quotes, witness details, etc."]];
function validFile(f) { if (!OKTYPES.includes(f.type)) return `${f.name}: only JPG, PNG, WEBP or PDF`; if (f.size > MAXMB * 1048576) return `${f.name}: larger than ${MAXMB} MB`; return ""; }
function fileTile(k, f, i) { const img = f.type.startsWith("image/"); return `<div class="fl">${img ? `<img class="th" src="${URL.createObjectURL(f)}" alt="">` : `<div class="th">📄</div>`}<small title="${esc(f.name)}">${esc(f.name)}</small><button data-rm="${k}:${i}" title="Remove">×</button></div>`; }
function docsUI(b, onChange) {
  const draw = () => { b.querySelector("#docs").innerHTML = DOCS().map(([k, t, req, max, hint]) => { const n = FILES[k].length, ok = req ? (k === "photo" ? n >= 3 : n >= 1) : n > 0; return `<div class="doc"><div class="dh"><b>${t}</b><span class="tag ${req ? (ok ? "ok" : "r") : "o"}">${req ? (ok ? "✓ Added" : "Required") : "Optional"}</span></div><div class="dz" data-dz="${k}"><b>Drop files here or click to browse</b><small>${hint} · up to ${max} file${max > 1 ? "s" : ""}</small></div><input type="file" data-in="${k}" accept="image/jpeg,image/png,image/webp,application/pdf" ${max > 1 ? "multiple" : ""} style="display:none"><div class="files">${FILES[k].map((f, i) => fileTile(k, f, i)).join("")}</div></div>`; }).join(""); bind(); onChange?.(); };
  const add = (k, list) => { const max = DOCS().find(d => d[0] === k)[3]; for (const f of list) { const e = validFile(f); if (e) { toast(e); continue; } if (FILES[k].length >= max) { toast(`Maximum ${max} file${max > 1 ? "s" : ""} for this item`); break; } FILES[k].push(f); } draw(); };
  const bind = () => {
    b.querySelectorAll("[data-dz]").forEach(z => { const k = z.dataset.dz, inp = b.querySelector(`[data-in="${k}"]`); z.onclick = () => inp.click(); inp.onchange = () => { add(k, [...inp.files]); }; z.ondragover = e => { e.preventDefault(); z.classList.add("over"); }; z.ondragleave = () => z.classList.remove("over"); z.ondrop = e => { e.preventDefault(); z.classList.remove("over"); add(k, [...e.dataTransfer.files]); }; });
    b.querySelectorAll("[data-rm]").forEach(x => x.onclick = () => { const [k, i] = x.dataset.rm.split(":"); FILES[k].splice(+i, 1); draw(); });
  };
  draw();
}
function step4(b) {
  b.innerHTML = `<h2>Upload your documents</h2><p class="sub">Clear photos or scans help us decide faster. JPG, PNG, WEBP or PDF, up to ${MAXMB} MB each.</p><div id="docs"></div>${bar(true, true, "Review claim")}`;
  docsUI(b); b.querySelector("#back").onclick = () => go(3);
  b.querySelector("#next").onclick = () => { const miss = DOCS().filter(([k, , req]) => req && (k === "photo" ? FILES[k].length < 3 : !FILES[k].length)).map(d => d[1]); if (miss.length && !confirm(`Still missing: ${miss.join(", ")}.\n\nYou can submit now and add them later from "Track a claim", but your claim won't be reviewed until they are provided. Continue?`)) return; go(5); };
}

function step5(b) {
  const f = S.f, p = S.policy, cnt = k => FILES[k].length;
  b.innerHTML = `<h2>Review & submit</h2><p class="sub">Check everything, then submit.</p><div class="sum"><dl><dt>Policy</dt><dd>${esc(p.policy_no)}</dd><dt>Policyholder</dt><dd>${esc(f.insured_name)}</dd><dt>Contact</dt><dd>${esc(f.insured_phone)} · ${esc(f.insured_email)}</dd><dt>Driver</dt><dd>${f.driver === "other" ? esc(f.driver_name) : "Policyholder"}</dd><dt>Vehicle</dt><dd>${esc(f.color)} ${esc(f.make_model)} ${esc(f.vehicle_year)} · ${esc(f.reg_no)}</dd></dl>
  <h4>Incident</h4><dl><dt>Claim type</dt><dd>${esc(f.claim_type)} · ${esc(f.accident_type)}</dd><dt>Date & time</dt><dd>${fdate(f.loss_date)} ${esc(f.loss_time || "")}</dd><dt>Location</dt><dd>${esc(f.location)}, ${esc(f.emirate)}</dd><dt>Damaged areas</dt><dd>${f.areas.length ? f.areas.map(a => ({ left: "driver side", right: "passenger side" }[a] || a)).join(", ") : "—"}</dd><dt>Description</dt><dd style="font-weight:400">${esc(f.description)}</dd><dt>Police report no.</dt><dd>${esc(f.police_report_no || "—")}</dd><dt>Injuries</dt><dd>${f.injuries === "yes" ? "Yes" : "No"}</dd><dt>Estimate</dt><dd>${f.claimed_amount ? aed(f.claimed_amount) : "—"}</dd></dl>
  <h4>Documents</h4><dl><dt>Emirates ID</dt><dd>${cnt("emirates_id")} file(s)</dd><dt>Driving licence</dt><dd>${cnt("licence")} file(s)</dd><dt>Mulkiya</dt><dd>${cnt("registration")} file(s)</dd><dt>Police report</dt><dd>${cnt("police_report")} file(s)</dd><dt>Damage photos</dt><dd>${cnt("photo")} photo(s)</dd><dt>Other</dt><dd>${cnt("other")} file(s)</dd></dl></div>
  <label class="rc" style="margin-top:18px;display:block"><input type="checkbox" id="decl"><b>I declare the information and documents are true and complete.</b><small>Providing false information may invalidate the claim.</small></label><div class="err" id="e_decl"></div><div id="progress"></div>${bar(true, true, "Submit claim")}`;
  b.querySelector("#back").onclick = () => go(4);
  b.querySelector("#next").onclick = async () => {
    if (!setErr("decl", b.querySelector("#decl").checked ? "" : "Please confirm the declaration")) return;
    const btn = b.querySelector("#next"), back = b.querySelector("#back"), pr = b.querySelector("#progress"); btn.disabled = back.disabled = true; btn.textContent = "Submitting…";
    try {
      pr.innerHTML = `<div class="upl"><small id="pt">Creating your claim…</small><div class="t"><i id="pb"></i></div></div>`;
      const r = await rpc("uw_cust_submit_claim", { p_payload: { policy_no: p.policy_no, phone_last4: S.l4, insured_name: f.insured_name, insured_phone: f.insured_phone, insured_email: f.insured_email, driver_name: f.driver === "other" ? f.driver_name : f.insured_name, make_model: f.make_model, vehicle_year: f.vehicle_year, reg_no: f.reg_no, vin: f.vin, color: f.color, claim_type: f.claim_type, accident_type: f.accident_type, damage_areas: f.areas, loss_date: f.loss_date, loss_time: f.loss_time, emirate: f.emirate, location: f.location, description: f.description, police_report_no: f.police_report_no, injuries: f.injuries === "yes", claimed_amount: f.claimed_amount, garage_name: f.garage_name } });
      if (r.error) throw new Error(r.error);
      await uploadAll(r.claim_no, S.l4, (t, p2) => { b.querySelector("#pt").textContent = t; b.querySelector("#pb").style.width = p2 * 100 + "%"; });
      sessionStorage.setItem("ca_last", JSON.stringify({ claim_no: r.claim_no, l4: S.l4 })); sessionStorage.removeItem("ca_state"); S = { step: 1, policy: null, f: { driver: "self", claim_type: "Own Damage", accident_type: "Collision", areas: [], injuries: "no", emirate: "Dubai" } };
      go2("#/done/" + r.claim_no);
    } catch (e) { toast(e.message); pr.innerHTML = `<div class="err">${esc(e.message)}</div>`; btn.disabled = back.disabled = false; btn.textContent = "Submit claim"; }
  };
}
const go2 = h => { location.hash = h; };
const safe = n => n.replace(/[^A-Za-z0-9._-]/g, "_").slice(-60);
async function uploadAll(claimNo, l4, prog) {
  const jobs = Object.entries(FILES).flatMap(([k, a]) => a.map(f => ({ k, f }))), total = jobs.length || 1; let done = 0; const docs = [];
  for (const { k, f } of jobs) { const path = `${claimNo}/${crypto.randomUUID()}-${safe(f.name)}`; prog(`Uploading ${f.name} (${done + 1} of ${jobs.length})…`, done / total); await upload(f, path, x => prog(`Uploading ${f.name} (${done + 1} of ${jobs.length})…`, (done + x) / total)); docs.push({ doc_type: k, file_name: f.name, mime: f.type, path }); done++; }
  prog("Finalising…", 0.98); const r = await rpc("uw_cust_register_docs", { p_claim_no: claimNo, p_last4: l4, p_docs: docs }); if (r.error) throw new Error(r.error);
  FILES = { emirates_id: [], licence: [], registration: [], police_report: [], photo: [], other: [] }; return r;
}

// ---------- done ----------
async function done(no) {
  const last = JSON.parse(sessionStorage.getItem("ca_last") || "{}"); let miss = [];
  try { const t = await rpc("uw_cust_track", { p_claim_no: no, p_last4: last.l4 }); miss = t.missing || []; } catch (_) { /* ignore */ }
  shell("new", `<div class="wiz"><div class="card done-c"><div class="tick">✓</div><h2>Claim submitted</h2><p style="color:var(--mut)">Your claim number</p><div class="cn">${esc(no)}</div><p>We've sent a confirmation to your email. Keep this number to track your claim.</p>
  ${miss.length ? `<div class="warn"><b>Documents still needed</b><ul>${miss.map(m => `<li>${esc(m)}</li>`).join("")}</ul>You can add them from the tracking page.</div>` : `<div class="warn" style="background:#effaf3;border-color:#bfe8cd;color:#166534"><b>✓ All required documents received.</b> An underwriter will open your claim shortly.</div>`}
  <div class="acts" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px"><a class="btn" href="#/track/${esc(no)}">Track this claim</a><a class="btn ghost" href="#/new">Submit another claim</a></div></div></div>`);
}

// ---------- track ----------
async function track(no) {
  const last = JSON.parse(sessionStorage.getItem("ca_last") || "{}"), n0 = no || last.claim_no || "", l0 = last.claim_no === n0 ? last.l4 : "";
  shell("track", `<div class="wiz"><div class="card"><h2>Track your claim</h2><p class="sub">Enter your claim number and the last 4 digits of your registered mobile.</p><div class="row2"><div class="fld"><label class="l">Claim number</label><input id="cn" placeholder="CLM-0007831" value="${esc(n0)}"></div><div class="fld"><label class="l">Mobile last 4 digits</label><input id="l4" maxlength="4" value="${esc(l0)}"></div></div><button class="btn" id="go">Track</button><div class="demo">Demo: after you submit a claim, tracking is prefilled for you.</div></div><div id="res"></div></div>`);
  const run = async () => {
    const c = val("cn").toUpperCase(), l = val("l4"), res = document.getElementById("res"); res.innerHTML = `<div class="card" style="margin-top:16px">Looking up…</div>`;
    try { const t = await rpc("uw_cust_track", { p_claim_no: c, p_last4: l }); if (!t.found) { res.innerHTML = `<div class="card warn" style="margin-top:16px">We couldn't find a claim with those details.</div>`; return; } sessionStorage.setItem("ca_last", JSON.stringify({ claim_no: c, l4: l })); showTrack(res, t, c, l); }
    catch (e) { res.innerHTML = `<div class="card warn" style="margin-top:16px">${esc(e.message)}</div>`; }
  };
  document.getElementById("go").onclick = run; if (n0 && l0) run();
}
function showTrack(res, t, c, l) {
  const cl = t.claim, st = STATUS[cl.status] || ["ℹ️", cl.status, "", "#1d5fe0,#0e9f9a"], [c1, c2] = st[3].split(",");
  const canAdd = !["Closed", "Rejected"].includes(cl.status);
  res.innerHTML = `<div class="stat" style="background:linear-gradient(135deg,${c1},${c2});margin-top:16px"><div class="ic">${st[0]}</div><div><h2>${st[1]}</h2><p>${st[2]}</p></div></div>
  ${t.missing.length ? `<div class="warn"><b>We still need</b><ul>${t.missing.map(m => `<li>${esc(m)}</li>`).join("")}</ul></div>` : ""}
  <div class="g2"><div class="card"><h3 style="margin-bottom:10px">Claim summary</h3><div class="sum"><dl><dt>Claim number</dt><dd>${esc(cl.claim_no)}</dd><dt>Policy</dt><dd>${esc(cl.policy_no)}</dd><dt>Vehicle</dt><dd>${esc(cl.vehicle)}</dd><dt>Incident</dt><dd>${esc(cl.accident_type)} · ${fdate(cl.loss_date)}</dd><dt>Location</dt><dd>${esc(cl.location)}</dd><dt>Submitted</dt><dd>${fdt(cl.reported_on)}</dd>${t.payment ? `<dt>Payment</dt><dd style="color:var(--green)">${aed(t.payment.amount)} on ${fdate(t.payment.paid_on)} (${esc(t.payment.txn_ref)})</dd>` : ""}</dl></div></div>
  <div class="card"><h3 style="margin-bottom:12px">Progress</h3><div class="tl">${t.timeline.map(x => `<div class="tli ${x.state}"><div class="pt">${x.state === "done" ? "✓" : x.state === "skipped" ? "–" : x.state === "current" ? "●" : ""}</div><div><b>${esc(x.title)}</b><small>${x.occurred_at ? fdt(x.occurred_at) : x.state === "current" ? "In progress" : "Pending"}</small></div></div>`).join("")}</div></div></div>
  <div class="card" style="margin-top:16px"><h3 style="margin-bottom:8px">Your documents</h3><table><thead><tr><th>Document</th><th>File</th><th>Uploaded</th></tr></thead><tbody>${t.documents.map(d => `<tr><td><b>${esc(d.title)}</b></td><td>${esc(d.file_name)}</td><td>${fdt(d.uploaded_on)}</td></tr>`).join("") || `<tr><td colspan="3" style="color:var(--mut)">No documents yet</td></tr>`}</tbody></table></div>
  ${canAdd ? `<div class="card" style="margin-top:16px"><h3>Add more documents</h3><p class="sub" style="color:var(--mut);margin:4px 0 12px">Upload anything we asked for, or extra evidence.</p><div id="docs"></div><div class="bar"><span></span><button class="btn" id="addgo">Upload documents</button></div><div id="progress"></div></div>` : ""}`;
  if (canAdd) { docsUI(res); res.querySelector("#addgo").onclick = async () => { const n = Object.values(FILES).flat().length; if (!n) return toast("Choose at least one file first"); const btn = res.querySelector("#addgo"), pr = res.querySelector("#progress"); btn.disabled = true; pr.innerHTML = `<div class="upl"><small id="pt"></small><div class="t"><i id="pb"></i></div></div>`;
      try { await uploadAll(c, l, (tx, p2) => { res.querySelector("#pt").textContent = tx; res.querySelector("#pb").style.width = p2 * 100 + "%"; }); toast("Documents uploaded"); const t2 = await rpc("uw_cust_track", { p_claim_no: c, p_last4: l }); showTrack(res, t2, c, l); } catch (e) { toast(e.message); btn.disabled = false; } }; }
}
route();
})();
