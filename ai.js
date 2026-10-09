// "AI generate": simulates realistic claim details and the supporting documents (ID cards, licence, Mulkiya, police report PDF, damage photos).
(() => {
const { SUPABASE_URL: SB, SUPABASE_ANON_KEY: KEY } = window.CONFIG;
const H = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
const pick = a => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pad = (n, l) => String(n).padStart(l, "0");
const iso = d => d.toISOString().slice(0, 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let cache = null;
async function policies() { if (!cache) cache = await (await fetch(`${SB}/rest/v1/rpc/uw_cust_demo_policies`, { method: "POST", headers: H, body: "{}" })).json(); return cache; }
let lastPol = null;
async function randomPolicy() { await sleep(600); const l = (await policies()).filter(p => p.policy_no !== lastPol); const p = pick(l); lastPol = p.policy_no; return p; }

const LOC = { Dubai: ["Sheikh Zayed Road near Mall of the Emirates", "Al Khail Road, Business Bay exit", "Jumeirah Beach Road near La Mer", "Al Qusais Industrial Area 2", "Dubai Marina, near Marina Mall", "Garhoud Bridge, Dubai", "Emirates Road near Dubai Outlet Mall", "Al Barsha South car park"], "Abu Dhabi": ["Corniche Road near Marina Mall", "Sheikh Khalifa Bin Zayed Street"], Sharjah: ["Al Wahda Street, Sharjah", "Sheikh Mohammed Bin Zayed Road"], Ajman: ["Sheikh Khalifa Bin Zayed Street, Ajman"] };
const OTHER = ["white sedan", "grey SUV", "black pickup", "silver hatchback", "taxi", "delivery van"];
const GARAGES = ["Desert Star Auto Repairs LLC", "Gulf Precision Auto Care LLC", "Marina Collision Works LLC", "Al Quoz Premier Garage LLC"];
const NAMES = ["Hamdan Al Ketbi", "Priya Menon", "Omar Siddiqui", "Laila Haddad", "Rahul Verma", "Aisha Khan"];
const NAT = ["Indian", "Pakistani", "Emirati", "Egyptian", "Jordanian", "Filipino", "British"];

function contact(f) {
  const nm = (f.insured_name || "customer").toLowerCase().replace(/[^a-z ]/g, "").trim().split(/\s+/);
  const email = `${nm[0]}.${nm[nm.length - 1] || "user"}${rnd(1, 99)}@${pick(["gmail.com", "outlook.com", "icloud.com", "yahoo.com"])}`;
  const other = Math.random() < 0.15; return { insured_email: email, driver: other ? "other" : "self", driver_name: other ? pick(NAMES) : "" };
}
function incident(f, pol) {
  const sc = pick(["rear", "rear", "front", "side", "hail", "parking", "vandal"]), em = pick(["Dubai", "Dubai", "Dubai", "Dubai", "Abu Dhabi", "Sharjah"]), loc = pick(LOC[em]), mk = pol?.make_model || f.make_model || "vehicle", other = pick(OTHER), side = pick(["left", "right"]);
  const T = {
    rear: { accident_type: "Collision", areas: ["rear"], amt: [3500, 9500], d: `I was stopped at the traffic signal on ${loc} when a ${other} hit my ${mk} from behind. The rear bumper and boot lid are dented and the tail light is cracked. The other driver stayed and we called the police.` },
    front: { accident_type: "Collision", areas: ["front"], amt: [4500, 12000], d: `While driving on ${loc} the vehicle ahead braked suddenly and I could not stop in time. The front bumper, bonnet and headlight of my ${mk} are damaged and the airbags did not deploy. Police attended the scene.` },
    side: { accident_type: "Side Impact", areas: [side], amt: [3000, 8000], d: `A ${other} changed lanes without signalling near ${loc} and scraped the ${side === "left" ? "driver" : "passenger"} side of my ${mk}. The door and wing mirror are damaged and there is a long dent along the side panel.` },
    hail: { accident_type: "Hail Damage", areas: ["roof", "front"], amt: [2500, 6500], d: `A sudden hailstorm hit while my ${mk} was parked near ${loc}. There are multiple small dents across the roof and bonnet and one windscreen chip. No other vehicles were involved.` },
    parking: { accident_type: "Parking Damage", areas: [pick(["rear", "left", "right"])], amt: [800, 3000], d: `I came back to my ${mk} in the car park at ${loc} and found fresh scratches and a dent on the bumper area. No note was left by whoever caused it. I have the car park CCTV time if needed.` },
    vandal: { accident_type: "Vandalism", areas: ["left", "right"], amt: [1200, 4500], d: `Overnight someone keyed both sides of my ${mk} while it was parked outside my building near ${loc}. There are deep scratches along the doors and a broken side mirror cover.` },
  }[sc];
  const start = pol?.policy_start ? new Date(pol.policy_start) : new Date(Date.now() - 90 * 864e5), minD = Math.max(start.getTime(), Date.now() - 14 * 864e5), d = new Date(minD + Math.random() * (Date.now() - 864e5 - minD));
  const police = ["Collision", "Side Impact"].includes(T.accident_type);
  return { claim_type: "Own Damage", accident_type: T.accident_type, areas: T.areas, loss_date: iso(d), loss_time: `${pad(rnd(7, 22), 2)}:${pad(rnd(0, 59), 2)}`, emirate: em, location: loc, description: T.d, police_report_no: police ? `DXB-TAR-${d.getFullYear()}-${rnd(100000, 999999)}` : "", injuries: Math.random() < 0.08 ? "yes" : "no", claimed_amount: String(Math.round(rnd(T.amt[0], T.amt[1]) / 50) * 50), garage_name: Math.random() < 0.5 ? pick(GARAGES) : "" };
}

// ---------- document renderers ----------
const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };
const toFile = (c, name) => { const bin = atob(c.toDataURL("image/png").split(",")[1]), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return Promise.resolve(new File([u], name, { type: "image/png" })); };
function wm(x, w, h) { x.save(); x.translate(w / 2, h / 2); x.rotate(-0.4); x.fillStyle = "rgba(200,0,0,.13)"; x.font = `bold ${Math.round(h / 7)}px Arial`; x.textAlign = "center"; x.fillText("SAMPLE · DEMO", 0, 0); x.restore(); }
function avatar(x, cx, cy, s) { x.fillStyle = "#cfd8e6"; x.fillRect(cx - s, cy - s * 1.2, s * 2, s * 2.4); x.fillStyle = "#8b98ab"; x.beginPath(); x.arc(cx, cy - s * .3, s * .5, 0, 7); x.fill(); x.beginPath(); x.ellipse(cx, cy + s * 1.1, s * .95, s * .7, 0, Math.PI, 0); x.fill(); }
function fields(x, rows, x0, y0, lh, lw) { rows.forEach(([l, v], i) => { const y = y0 + i * lh; x.fillStyle = "#5b6678"; x.font = "16px Arial"; if (lw) { x.fillText(l, x0, y); x.fillStyle = "#111"; x.font = "bold 22px Arial"; x.fillText(v, x0 + lw, y); } else { x.fillText(l, x0, y - 20); x.fillStyle = "#111"; x.font = "bold 24px Arial"; x.fillText(v, x0, y + 6); } }); }
async function eidFront(c) { const [cv, x] = canvas(856, 540); const g = x.createLinearGradient(0, 0, 856, 540); g.addColorStop(0, "#eaf4ee"); g.addColorStop(1, "#c9e4d4"); x.fillStyle = g; x.fillRect(0, 0, 856, 540);
  [["#e11d2e", 0], ["#0b8a3e", 1], ["#fff", 2], ["#111", 3]].forEach(([col, i]) => { x.fillStyle = col; x.fillRect(0, i * 135, 18, 135); });
  x.fillStyle = "#14532d"; x.font = "bold 26px Arial"; x.fillText("UNITED ARAB EMIRATES", 50, 56); x.font = "20px Arial"; x.fillText("RESIDENT IDENTITY CARD", 50, 86);
  avatar(x, 130, 250, 70); fields(x, [["ID Number", c.eid], ["Name", c.name], ["Nationality", c.nat], ["Date of Birth", c.dob], ["Expiry", c.eidExp]], 260, 170, 62, 0); x.font = "bold 26px Arial"; x.fillStyle = "#111"; wm(x, 856, 540); return toFile(cv, "emirates-id-front.png"); }
async function eidBack(c) { const [cv, x] = canvas(856, 540); x.fillStyle = "#eef3f0"; x.fillRect(0, 0, 856, 540); x.fillStyle = "#14532d"; x.font = "bold 22px Arial"; x.fillText("Card No: " + c.cardNo, 40, 60); x.font = "20px Arial"; x.fillStyle = "#333"; x.fillText("Occupation: As per visa", 40, 100); x.fillText("Issuing Place: Dubai", 40, 135);
  x.fillStyle = "#111"; for (let i = 0; i < 70; i++) x.fillRect(40 + i * 11, 190, rnd(2, 7), 70); x.font = "26px monospace"; x.fillText(`IDARE${c.cardNo}<<<<<<<<<<<<<`, 40, 400); x.fillText(c.eid.replace(/-/g, "") + "<<<<<<<<<<", 40, 440); x.fillText((c.name || "").toUpperCase().replace(/ /g, "<") + "<<<<<<<<", 40, 480); wm(x, 856, 540); return toFile(cv, "emirates-id-back.png"); }
async function licence(c) { const [cv, x] = canvas(856, 540); const g = x.createLinearGradient(0, 0, 856, 0); g.addColorStop(0, "#e8f0ff"); g.addColorStop(1, "#cfe0fb"); x.fillStyle = g; x.fillRect(0, 0, 856, 540); x.fillStyle = "#c8102e"; x.fillRect(0, 0, 856, 78); x.fillStyle = "#fff"; x.font = "bold 28px Arial"; x.fillText("UAE DRIVING LICENCE", 36, 50);
  avatar(x, 130, 270, 70); fields(x, [["Licence No", c.licNo], ["Name", c.name], ["Date of Birth", c.dob], ["T.C. No", c.tcNo], ["Issue", c.issue], ["Expiry", c.licExp], ["Category", "Light Vehicle (1)"]], 260, 140, 56, 0); wm(x, 856, 540); return toFile(cv, "driving-licence.png"); }
async function mulkiya(c) { const [cv, x] = canvas(856, 540); const g = x.createLinearGradient(0, 0, 856, 540); g.addColorStop(0, "#f4f8ff"); g.addColorStop(1, "#d9e6f7"); x.fillStyle = g; x.fillRect(0, 0, 856, 540); x.fillStyle = "#c8102e"; x.fillRect(0, 0, 856, 70); x.fillStyle = "#fff"; x.font = "bold 28px Arial"; x.fillText("VEHICLE REGISTRATION CARD", 36, 46);
  x.fillStyle = "#fff"; x.strokeStyle = "#111"; x.lineWidth = 5; x.fillRect(36, 100, 250, 110); x.strokeRect(36, 100, 250, 110); x.fillStyle = "#111"; x.font = "bold 18px Arial"; x.fillText("DUBAI", 215, 128); x.font = "bold 52px Arial"; x.fillText(c.reg_no || "", 60, 190);
  fields(x, [["Owner", c.name], ["Make / Model", c.make_model], ["Year / Colour", `${c.year} · ${c.color}`], ["Chassis No", c.vin], ["Registered", c.regDate], ["Expiry", c.regExp], ["Insurance", "Gulf Shield Insurance PJSC"]], 36, 270, 36, 190); wm(x, 856, 540); return toFile(cv, "vehicle-registration-mulkiya.png"); }
function policePdf(c) {
  const L = ["Dubai Police - Traffic Accident Report (SAMPLE)", "", `Report No: ${c.police_no}`, `Date of accident: ${c.loss_date} ${c.loss_time || ""}`, `Location: ${c.location}, ${c.emirate}`, `Accident type: ${c.accident_type}`, "", "PARTY A (insured)", `  Name: ${c.name}`, `  Vehicle: ${c.make_model} (${c.color}) - Plate: ${c.reg_no}`, `  Licence No: ${c.licNo}`, "PARTY B", `  Name: ${pick(NAMES)}`, `  Vehicle: ${pick(OTHER)}`, "", `Narrative: ${(c.description || "").slice(0, 110)}`, `${(c.description || "").slice(110, 220)}`, "", "Fault assessment: Party B at fault", "Officer: Sgt. Hamad Al Muhairi - No. 41709", "", "Synthetic specimen generated for demonstration only."];
  const esc = s => String(s).replace(/[^\x20-\x7E]/g, " ").replace(/([\\()])/g, "\\$1");
  let content = `BT /F1 16 Tf 50 790 Td (${esc(L[0])}) Tj ET\n`, y = 760; L.slice(1).forEach(l => { content += `BT /F1 11 Tf 50 ${y} Td (${esc(l)}) Tj ET\n`; y -= 18; });
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>", `<< /Length ${content.length} >>\nstream\n${content}endstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let out = "%PDF-1.4\n"; const offs = []; objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; }); const xr = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, "0") + " 00000 n \n").join("") + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
  return new File([out], "dubai-police-report.pdf", { type: "application/pdf" });
}
async function fetchPhoto(url, name) { try { const r = await fetch(url); if (!r.ok) return null; const b = await r.blob(); return new File([b], name, { type: "image/jpeg" }); } catch (_) { return null; } }
async function photos(c, n) {
  const out = []; const no = c.sample_claim_no;
  if (no) { const urls = [`dmg/${no}_overview_1.jpg`, `dmg/${no}_overview_2.jpg`, `dmg/${no}_closeup_1.jpg`, `dmg/${no}_closeup_2.jpg`, `veh/${no}_1.jpg`, `veh/${no}_2.jpg`]; for (const u of urls) { if (out.length >= n) break; const f = await fetchPhoto(`${SB}/storage/v1/object/public/claim-photos/${u}`, `damage-photo-${out.length + 1}.jpg`); if (f) out.push(f); } }
  while (out.length < n) { const [cv, x] = canvas(800, 520); const g = x.createLinearGradient(0, 0, 0, 520); g.addColorStop(0, "#cfd9e8"); g.addColorStop(1, "#8d97a4"); x.fillStyle = g; x.fillRect(0, 0, 800, 520); x.fillStyle = "#4b525c"; x.fillRect(0, 380, 800, 140); x.fillStyle = "#9aa3ad"; x.beginPath(); x.roundRect(150, 250, 500, 150, 40); x.fill(); x.fillStyle = "#15171a"; x.beginPath(); x.arc(250, 400, 42, 0, 7); x.arc(550, 400, 42, 0, 7); x.fill(); x.fillStyle = "rgba(220,38,38,.7)"; x.fillRect(560, 280, 90, 90); wm(x, 800, 520); out.push(await toFile(cv, `damage-photo-${out.length + 1}.png`)); }
  return out;
}
async function docs(c, only) {
  await sleep(500); const want = k => !only || only.includes(k);
  const seedN = [...(c.policy_no || "POL")].reduce((a, ch) => a + ch.charCodeAt(0), 0), y = new Date().getFullYear();
  const d = { ...c, eid: c.eid || `784-${rnd(1970, 1998)}-${rnd(1000000, 9999999)}-${rnd(1, 9)}`, nat: c.nat || pick(NAT), dob: c.dob || `${pad(rnd(1, 28), 2)}-${pad(rnd(1, 12), 2)}-${rnd(1970, 1998)}`, eidExp: `${pad(rnd(1, 28), 2)}-${pad(rnd(1, 12), 2)}-${y + 2}`, cardNo: String(rnd(100000000, 999999999)), licNo: String(rnd(1000000, 9999999)), tcNo: String(rnd(10000000, 99999999)), issue: `${pad(rnd(1, 28), 2)}-${pad(rnd(1, 12), 2)}-${y - rnd(2, 8)}`, licExp: `${pad(rnd(1, 28), 2)}-${pad(rnd(1, 12), 2)}-${y + rnd(1, 5)}`, regDate: `${pad(rnd(1, 28), 2)}-${pad(rnd(1, 12), 2)}-${c.year || y - 3}`, regExp: `${pad(rnd(1, 28), 2)}-${pad(rnd(1, 12), 2)}-${y + 1}` };
  const F = { emirates_id: [], licence: [], registration: [], police_report: [], photo: [], other: [] };
  const tag = (f, t) => { f.extracted = t; return f; };
  if (want("emirates_id")) { const a = await eidFront(d), b = await eidBack(d); F.emirates_id = [tag(a, `EMIRATES ID - RESIDENT IDENTITY CARD. ID Number ${d.eid}. Name ${d.name}. Nationality ${d.nat}. Date of Birth ${d.dob}. Expiry ${d.eidExp}.`), tag(b, `EMIRATES ID (BACK). Card No ${d.cardNo}. Issuing place Dubai. Name ${d.name}. ID Number ${d.eid}.`)]; }
  if (want("licence")) F.licence = [tag(await licence(d), `UAE DRIVING LICENCE. Licence No ${d.licNo}. Name ${d.name}. Date of Birth ${d.dob}. T.C. No ${d.tcNo}. Issue ${d.issue}. Expiry ${d.licExp}. Category Light Vehicle (1).`)];
  if (want("registration")) F.registration = [tag(await mulkiya(d), `VEHICLE REGISTRATION CARD (MULKIYA). Plate DUBAI ${d.reg_no}. Owner ${d.name}. Make/Model ${d.make_model}. Year ${d.year}. Colour ${d.color}. Chassis No ${d.vin}. Registered ${d.regDate}. Expiry ${d.regExp}. Insurance Gulf Shield Insurance PJSC. Policy ${d.policy_no}.`)];
  if (want("police_report") && ["Collision", "Side Impact"].includes(c.accident_type)) { const pn = c.police_no || `DXB-TAR-${y}-${rnd(100000, 999999)}`; F.police_report = [tag(policePdf({ ...d, police_no: pn }), `DUBAI POLICE TRAFFIC ACCIDENT REPORT. Report No ${pn}. Date of accident ${c.loss_date} ${c.loss_time || ""}. Location ${c.location}, ${c.emirate || "Dubai"}. Accident type ${c.accident_type}. Party A ${d.name}, ${d.make_model} ${d.color}, plate ${d.reg_no}, licence ${d.licNo}. Fault assessment: Party B at fault. Report filed on the same day as the accident.`)]; }
  if (want("photo")) F.photo = await photos(c, rnd(3, 4));
  void seedN; return F;
}
window.AIGen = { randomPolicy, contact, incident, docs, sleep, sample: async pn => (await policies()).find(p => p.policy_no === pn)?.sample_claim_no };
})();
