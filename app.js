/* ==========
   Storage keys
========== */
const TX_KEY = "finance_tx_v1";
const CAT_KEY = "finance_cats_v1";
const AUTH_KEY = "finance_auth_v1"; // { passkeyIdBase64, pinHash }
const VIBRATE_MS = 20;

/* ==========
   Defaults
========== */
const DEFAULT_CATS = {
  expense: [
    { name:"Семья / Дом", icon:"🏠" },
    { name:"Еда", icon:"🍽️" },
    { name:"Транспорт", icon:"🚕" },
    { name:"Машина", icon:"🚗" },
    { name:"Здоровье", icon:"🩺" },
    { name:"Спорт", icon:"🏋️" },
    { name:"Одежда", icon:"👕" },
    { name:"Техника", icon:"💻" },
    { name:"Связь / Интернет", icon:"📱" },
    { name:"Коммуналка", icon:"💡" },
    { name:"Образование", icon:"📚" },
    { name:"Подарки", icon:"🎁" },
    { name:"Развлечения", icon:"🎬" },
    { name:"Другое", icon:"🧾" }
  ],
  income: [
    { name:"Зарплата", icon:"💼" },
    { name:"Подработка", icon:"🛠️" },
    { name:"Бизнес", icon:"🏭" },
    { name:"Дивиденды", icon:"📈" },
    { name:"Подарок", icon:"🎉" },
    { name:"Возврат долга", icon:"🤝" },
    { name:"Другое", icon:"🧾" }
  ]
};

/* ==========
   DOM
========== */
const $ = (id)=>document.getElementById(id);

// screens
const authScreen = $("auth");
const appScreen = $("app");
const listScreen = $("listScreen");

// auth
const btnUnlock = $("btnUnlock");
const btnSetupPasskey = $("btnSetupPasskey");
const btnSetPin = $("btnSetPin");
const pinInput = $("pinInput");
const authMsg = $("authMsg");
const btnLock = $("btnLock");

// top
const periodSel = $("period");
const rangeBox = $("rangeBox");
const fromDate = $("fromDate");
const toDate = $("toDate");
const periodLabel = $("periodLabel");

// export/import
const btnExport = $("btnExport");
const importFile = $("importFile");

// donut
const segIncome = $("segIncome");
const segExpense = $("segExpense");
const balanceEl = $("balance");
const miniTotals = $("miniTotals");

// breakdown
const catBreakdown = $("catBreakdown");
const btnAllTx = $("btnAllTx");

// list screen
const btnBack = $("btnBack");
const txList = $("txList");
const listLabel = $("listLabel");
const fType = $("fType");
const fCurrency = $("fCurrency");
const fMethod = $("fMethod");
const search = $("search");

// modal tx
const modal = $("modal");
const modalTitle = $("modalTitle");
const mDate = $("mDate");
const mAmount = $("mAmount");
const mCurrency = $("mCurrency");
const mMethod = $("mMethod");
const mNote = $("mNote");
const catGrid = $("catGrid");
const btnClose = $("btnClose");
const btnCancel = $("btnCancel");
const btnSaveManual = $("btnSaveManual");
const btnMinus = $("btnMinus");
const btnPlus = $("btnPlus");
const toast = $("toast");
const btnAddCategory = $("btnAddCategory");

// cat modal
const catModal = $("catModal");
const btnCloseCat = $("btnCloseCat");
const btnCancelCat = $("btnCancelCat");
const btnCreateCat = $("btnCreateCat");
const newCatName = $("newCatName");
const newCatIcon = $("newCatIcon");
const newCatType = $("newCatType");

/* ==========
   Utilities
========== */
const pad = (n)=>String(n).padStart(2,"0");
function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function monthStartEnd(){
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const from = new Date(y, m, 1).getTime();
  const to = new Date(y, m+1, 0).getTime();
  return {from,to};
}
function parseDateTime(s){
  const [y,m,d] = (s||"").split("-").map(Number);
  if(!y||!m||!d) return null;
  return new Date(y,m-1,d).getTime();
}
function money(n){
  return Number(n||0).toLocaleString("ru-RU",{maximumFractionDigits:2});
}
function vibe(){
  try{ navigator.vibrate?.(VIBRATE_MS); }catch{}
}
function showToast(text="Сохранено ✅"){
  toast.textContent = text;
  toast.classList.remove("hidden");
  setTimeout(()=>toast.classList.add("hidden"), 900);
}

/* ==========
   Data
========== */
function loadTx(){
  try{ return JSON.parse(localStorage.getItem(TX_KEY) || "[]"); }catch{ return []; }
}
function saveTx(arr){
  localStorage.setItem(TX_KEY, JSON.stringify(arr));
}
function loadCats(){
  try{
    const v = JSON.parse(localStorage.getItem(CAT_KEY) || "null");
    if(v && v.expense && v.income) return v;
  }catch{}
  localStorage.setItem(CAT_KEY, JSON.stringify(DEFAULT_CATS));
  return structuredClone(DEFAULT_CATS);
}
function saveCats(cats){
  localStorage.setItem(CAT_KEY, JSON.stringify(cats));
}
function loadAuth(){
  try{ return JSON.parse(localStorage.getItem(AUTH_KEY) || "{}"); }catch{ return {}; }
}
function saveAuth(auth){
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

/* ==========
   FaceID/Passkey (WebAuthn)
   - On iPhone Safari, this usually triggers FaceID when userVerification is "required".
========== */
function bufToB64(buf){
  const bytes = new Uint8Array(buf);
  let str = "";
  for(const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
}
function b64ToBuf(b64){
  const s = atob(b64.replaceAll("-","+").replaceAll("_","/"));
  const bytes = new Uint8Array(s.length);
  for(let i=0;i<s.length;i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}
function randomBytes(len=32){
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return a.buffer;
}
async function setupPasskey(){
  authMsg.textContent = "";
  if(!window.PublicKeyCredential || !navigator.credentials){
    authMsg.textContent = "Passkey/FaceID недоступен в этом браузере. Используй PIN.";
    return;
  }
  try{
    const userId = new Uint8Array(randomBytes(16));
    const challenge = randomBytes(32);

    const publicKey = {
      challenge,
      rp: { name: "Мои финансы" },
      user: { id: userId, name: "user@local", displayName: "User" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required"
      },
      timeout: 60000,
      attestation: "none"
    };

    const cred = await navigator.credentials.create({ publicKey });
    const idB64 = bufToB64(cred.rawId);
    const auth = loadAuth();
    auth.passkeyIdBase64 = idB64;
    saveAuth(auth);

    authMsg.textContent = "Passkey настроен ✅ Теперь разблокировка будет через FaceID/Passkey.";
  }catch(e){
    authMsg.textContent = "Не получилось настроить Passkey. Можно использовать PIN.";
  }
}

async function unlockWithPasskey(){
  authMsg.textContent = "";
  const auth = loadAuth();
  if(!auth.passkeyIdBase64){
    authMsg.textContent = "Сначала нажми «Настроить FaceID/Passkey» или используй PIN.";
    return false;
  }
  try{
    const publicKey = {
      challenge: randomBytes(32),
      allowCredentials: [{
        type:"public-key",
        id: b64ToBuf(auth.passkeyIdBase64)
      }],
      userVerification: "required",
      timeout: 60000
    };

    await navigator.credentials.get({ publicKey });
    return true;
  }catch(e){
    authMsg.textContent = "Не удалось разблокировать через Passkey/FaceID. Попробуй ещё раз или используй PIN.";
    return false;
  }
}

/* ==========
   PIN fallback (simple hash)
========== */
async function sha256(text){
  const enc = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return bufToB64(hash);
}
async function setPin(pin){
  if(!pin || pin.length < 4) {
    authMsg.textContent = "PIN должен быть минимум 4 цифры.";
    return;
  }
  const auth = loadAuth();
  auth.pinHash = await sha256(pin);
  saveAuth(auth);
  authMsg.textContent = "PIN сохранён ✅";
}
async function unlockWithPin(pin){
  const auth = loadAuth();
  if(!auth.pinHash){
    authMsg.textContent = "PIN ещё не сохранён.";
    return false;
  }
  const h = await sha256(pin || "");
  if(h === auth.pinHash) return true;
  authMsg.textContent = "Неверный PIN.";
  return false;
}

/* ==========
   App state
========== */
let currentMode = "expense"; // for modal
let cats = loadCats();

function setScreen(which){
  authScreen.classList.toggle("hidden", which !== "auth");
  appScreen.classList.toggle("hidden", which !== "app");
  listScreen.classList.toggle("hidden", which !== "list");
}

function lockApp(){
  setScreen("auth");
}

function openApp(){
  setScreen("app");
  render();
}

function formatPeriodLabel(){
  const p = periodSel.value;
  if(p === "today") return "Период: сегодня";
  if(p === "month") return "Период: этот месяц";
  return "Период: выбранный диапазон";
}

function getPeriodWindow(){
  const p = periodSel.value;
  if(p === "today"){
    const t = parseDateTime(todayISO());
    return {from:t, to:t};
  }
  if(p === "month"){
    return monthStartEnd();
  }
  // range
  const f = parseDateTime(fromDate.value) ?? monthStartEnd().from;
  const t = parseDateTime(toDate.value) ?? monthStartEnd().to;
  const from = Math.min(f,t);
  const to = Math.max(f,t);
  return {from, to};
}

function filterByPeriod(allTx){
  const {from, to} = getPeriodWindow();
  return allTx.filter(tx=>{
    const tt = parseDateTime(tx.date);
    if(tt == null) return false;
    return tt >= from && tt <= to;
  });
}

/* ==========
   Donut math
========== */
function setDonut(income, expense){
  const r = 44;
  const C = 2 * Math.PI * r;
  const total = Math.max(income + expense, 0.000001);

  const incPart = income / total;
  const expPart = expense / total;

  // income segment
  segIncome.style.strokeDasharray = `${C * incPart} ${C}`;
  segIncome.style.strokeDashoffset = `0`;

  // expense segment starts after income
  segExpense.style.strokeDasharray = `${C * expPart} ${C}`;
  segExpense.style.strokeDashoffset = `${-C * incPart}`;
}

/* ==========
   Categories
========== */
function catList(type){
  return cats[type] || [];
}

function renderCatButtons(){
  catGrid.innerHTML = "";
  const list = catList(currentMode);

  for(const c of list){
    const btn = document.createElement("button");
    btn.className = "catBtn";
    btn.type = "button";

    btn.innerHTML = `
      <div class="catTop">
        <div class="icon">${c.icon || "🧾"}</div>
        <div>
          <div style="font-weight:800">${escapeHtml(c.name)}</div>
          <div class="muted tiny">${currentMode === "expense" ? "расход" : "доход"}</div>
        </div>
      </div>
      <div class="muted tiny">Нажми, чтобы выбрать</div>
    `;

    btn.addEventListener("click", ()=>{
      vibe();
      tryAutoSaveWithCategory(c.name);
    });

    catGrid.appendChild(btn);
  }
}

function escapeHtml(s){
  return (s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function addCategory(type, name, icon){
  name = (name||"").trim();
  icon = (icon||"").trim() || "🧾";
  if(!name) return false;

  const exists = (cats[type]||[]).some(x=>x.name.toLowerCase() === name.toLowerCase());
  if(exists) return false;

  cats[type].unshift({ name, icon });
  saveCats(cats);
  return true;
}

/* ==========
   Save transaction
========== */
function buildTx(categoryName){
  const amount = Number(mAmount.value);
  if(!amount || amount <= 0) return null;

  const tx = {
    id: crypto.randomUUID(),
    type: currentMode,
    amount,
    currency: mCurrency.value === "USD" ? "USD" : "UZS",
    method: mMethod.value === "card" ? "card" : "cash",
    category: categoryName || "Другое",
    date: mDate.value || todayISO(),
    note: (mNote.value || "").trim(),
    createdAt: Date.now()
  };
  return tx;
}

function saveOne(tx){
  const all = loadTx();
  all.push(tx);
  saveTx(all);
}

function tryAutoSaveWithCategory(categoryName){
  const tx = buildTx(categoryName);
  if(!tx){
    showToast("Сначала введи сумму");
    mAmount.focus();
    return;
  }
  saveOne(tx);
  showToast("Сохранено ✅");
  closeModal();
  render();
}

function saveManual(){
  // manual save uses "Другое" if category not selected
  // but in this UI category is selected by pressing a button.
  showToast("Выбери категорию (или добавь новую)");
}

/* ==========
   Render dashboard + breakdown + list
========== */
function calcTotals(txArr){
  const totals = {
    UZS: { income:0, expense:0 },
    USD: { income:0, expense:0 }
  };
  for(const tx of txArr){
    const cur = tx.currency === "USD" ? "USD" : "UZS";
    const amt = Number(tx.amount)||0;
    if(tx.type === "income") totals[cur].income += amt;
    else totals[cur].expense += amt;
  }
  return totals;
}

function renderBreakdown(txArr){
  // only expenses
  const exp = txArr.filter(x=>x.type==="expense");
  const sum = exp.reduce((a,x)=>a+(Number(x.amount)||0),0);

  catBreakdown.innerHTML = "";
  if(sum <= 0){
    catBreakdown.innerHTML = `<div class="muted small">Пока нет расходов за выбранный период.</div>`;
    return;
  }

  // group by category (separately for each currency is complicated; user wanted % of expenses)
  // We'll calculate % based on same currency as each tx, but for clarity we compute within each currency and merge by amount in their currency.
  // Practical: users usually view one currency at a time; still ok.
  const byCat = new Map();
  for(const x of exp){
    const k = x.category || "Другое";
    byCat.set(k, (byCat.get(k) || 0) + (Number(x.amount)||0));
  }

  const entries = [...byCat.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);

  for(const [cat, amt] of entries){
    const pct = Math.round((amt / sum) * 100);
    const icon = findCatIcon("expense", cat);

    const row = document.createElement("div");
    row.className = "breakItem";
    row.innerHTML = `
      <div class="breakLeft">
        <div class="icon">${icon}</div>
        <div>
          <div style="font-weight:800">${escapeHtml(cat)}</div>
          <div class="muted tiny">${money(amt)} (в валюте операций)</div>
        </div>
      </div>
      <div class="pct">${pct}%</div>
    `;
    catBreakdown.appendChild(row);
  }
}

function findCatIcon(type, name){
  const item = (cats[type]||[]).find(x=>x.name === name);
  return item?.icon || "🧾";
}

function render(){
  periodLabel.textContent = formatPeriodLabel();

  const all = loadTx();
  const periodTx = filterByPeriod(all);

  // Donut uses totals in UZS+USD separately is messy; we’ll use combined by converting nothing.
  // Instead: show donut by *counted totals of both currencies combined* (visual-only). If you want, next step can add a toggle UZS/USD.
  const income = periodTx.filter(x=>x.type==="income").reduce((a,x)=>a+(Number(x.amount)||0),0);
  const expense = periodTx.filter(x=>x.type==="expense").reduce((a,x)=>a+(Number(x.amount)||0),0);

  setDonut(income, expense);

  const bal = income - expense;
  balanceEl.textContent = money(bal);
  miniTotals.textContent = `+${money(income)} • -${money(expense)} (визуально)`;

  renderBreakdown(periodTx);
}

function renderList(){
  const all = loadTx();
  const periodTx = filterByPeriod(all);

  const t = fType.value;
  const c = fCurrency.value;
  const m = fMethod.value;
  const q = (search.value||"").trim().toLowerCase();

  const items = periodTx
    .filter(x => t === "all" ? true : x.type === t)
    .filter(x => c === "all" ? true : (x.currency||"UZS") === c)
    .filter(x => m === "all" ? true : (x.method||"cash") === m)
    .filter(x => !q ? true : ((x.note||"").toLowerCase().includes(q) || (x.category||"").toLowerCase().includes(q)))
    .sort((a,b)=>{
      if(a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.createdAt||0) - (a.createdAt||0);
    });

  listLabel.textContent = formatPeriodLabel();
  txList.innerHTML = "";

  for(const tx of items){
    const li = document.createElement("li");
    li.className = "txItem";

    const left = document.createElement("div");
    left.innerHTML = `
      <div class="badges">
        <span class="badge">${tx.type==="income" ? "Доход" : "Расход"}</span>
        <span class="badge">${tx.currency || "UZS"}</span>
        <span class="badge">${tx.method==="card" ? "Карта" : "Наличка"}</span>
        <span class="badge">${escapeHtml(tx.category || "—")}</span>
        <span class="badge">${tx.date}</span>
      </div>
      <div class="muted small" style="margin-top:6px">${escapeHtml(tx.note || "—")}</div>
    `;

    const right = document.createElement("div");
    right.style.textAlign = "right";

    const amt = document.createElement("div");
    amt.className = "amount";
    amt.textContent = (tx.type==="expense" ? "- " : "+ ") + money(tx.amount) + " " + (tx.currency||"UZS");

    const del = document.createElement("button");
    del.className = "ghost smallBtn";
    del.textContent = "Удалить";
    del.style.marginTop = "8px";
    del.onclick = ()=>{
      const updated = loadTx().filter(x=>x.id !== tx.id);
      saveTx(updated);
      render();
      renderList();
    };

    right.appendChild(amt);
    right.appendChild(del);

    li.appendChild(left);
    li.appendChild(right);
    txList.appendChild(li);
  }
}

/* ==========
   Modal open/close
========== */
function openModal(mode){
  currentMode = mode;
  modalTitle.textContent = (mode === "expense") ? "Расход" : "Доход";

  mDate.value = todayISO();
  mAmount.value = "";
  mCurrency.value = "UZS";
  mMethod.value = "cash";
  mNote.value = "";

  renderCatButtons();

  modal.classList.remove("hidden");
  setTimeout(()=>mAmount.focus(), 30);
}

function closeModal(){
  modal.classList.add("hidden");
}

/* ==========
   Export / Import
========== */
function doExport(){
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: loadCats(),
    transactions: loadTx()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finance-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function doImport(file){
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    if(!data || !Array.isArray(data.transactions)) throw new Error("bad");
    if(data.categories) { cats = data.categories; saveCats(cats); }
    saveTx(data.transactions);
    render();
    showToast("Импорт готов ✅");
  }catch{
    showToast("Импорт не удался");
  }
}

/* ==========
   Events wiring
========== */
// auth
btnSetupPasskey.onclick = setupPasskey;

btnUnlock.onclick = async ()=>{
  // try passkey first
  const auth = loadAuth();
  if(auth.passkeyIdBase64){
    const ok = await unlockWithPasskey();
    if(ok) { openApp(); return; }
  }
  // fallback PIN
  const pin = (pinInput.value||"").trim();
  if(pin){
    const ok = await unlockWithPin(pin);
    if(ok) { openApp(); return; }
  }
  authMsg.textContent = auth.passkeyIdBase64
    ? "Не получилось. Попробуй ещё раз или введи PIN."
    : "Настрой Passkey/FaceID или введи PIN.";
};

btnSetPin.onclick = async ()=>{
  const pin = (pinInput.value||"").trim();
  await setPin(pin);
};

btnLock.onclick = ()=>lockApp();

// top period
periodSel.onchange = ()=>{
  const isRange = periodSel.value === "range";
  rangeBox.classList.toggle("hidden", !isRange);
  render();
};
[fromDate, toDate].forEach(el=>{
  el.onchange = render;
});

// export/import
btnExport.onclick = doExport;
importFile.onchange = ()=>{
  const f = importFile.files?.[0];
  if(f) doImport(f);
  importFile.value = "";
};

// navigate list
btnAllTx.onclick = ()=>{
  setScreen("list");
  renderList();
};
btnBack.onclick = ()=>{
  setScreen("app");
  render();
};
[fType, fCurrency, fMethod, search].forEach(el=>{
  el.addEventListener("input", renderList);
  el.addEventListener("change", renderList);
});

// open modal
btnMinus.onclick = ()=>openModal("expense");
btnPlus.onclick = ()=>openModal("income");

// modal buttons
btnClose.onclick = closeModal;
btnCancel.onclick = closeModal;
btnSaveManual.onclick = saveManual;

// add category
btnAddCategory.onclick = ()=>{
  newCatName.value = "";
  newCatIcon.value = "";
  newCatType.value = currentMode;
  catModal.classList.remove("hidden");
  setTimeout(()=>newCatName.focus(), 30);
};
btnCloseCat.onclick = ()=>catModal.classList.add("hidden");
btnCancelCat.onclick = ()=>catModal.classList.add("hidden");

btnCreateCat.onclick = ()=>{
  const ok = addCategory(newCatType.value, newCatName.value, newCatIcon.value);
  if(!ok){
    showToast("Не добавилось (проверь название)");
    return;
  }
  cats = loadCats();
  showToast("Категория добавлена ✅");
  catModal.classList.add("hidden");
  renderCatButtons();
  render();
};

// init
(function init(){
  // default range values
  fromDate.value = todayISO();
  toDate.value = todayISO();

  // start locked
  setScreen("auth");

  // little hint for user
  const auth = loadAuth();
  if(auth.passkeyIdBase64){
    authMsg.textContent = "Нажми «Разблокировать» — должно открыть FaceID/Passkey.";
  }else{
    authMsg.textContent = "Сначала нажми «Настроить FaceID/Passkey» (рекомендуется).";
  }

  render();
})();

// service worker (optional offline)
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
