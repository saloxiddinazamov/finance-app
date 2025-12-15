// AppRightPref.js — Firebase Google Login + Finance App (Firestore sync)
// Работает на GitHub Pages
// Данные синхронизируются между устройствами по user.uid

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* ==========
   Firebase
========== */
const firebaseConfig = {
  apiKey: "AIzaSyC0yZgKbsk0bqWQxHJoQoRIGt_6wl6SxAo",
  authDomain: "my-finance-app-2e4ff.firebaseapp.com",
  projectId: "my-finance-app-2e4ff",
  storageBucket: "my-finance-app-2e4ff.firebasestorage.app",
  messagingSenderId: "902666583622",
  appId: "1:902666583622:web:a2563e018f2ed46cefd447",
  measurementId: "G-H1D0GLJ4H3"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
const provider = new GoogleAuthProvider();

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

// login overlay
const authScreen = $("authScreen");
const authError  = $("authError");
const googleBtn  = $("googleBtn");

// screens
const appScreen  = $("app");
const listScreen = $("listScreen");

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
   Helpers
========== */
const VIBRATE_MS = 20;

function showAuthError(e){
  console.error(e);
  if (authError) authError.textContent = e?.message || String(e);
}

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
  if(!toast) return;
  toast.textContent = text;
  toast.classList.remove("hidden");
  setTimeout(()=>toast.classList.add("hidden"), 900);
}
function escapeHtml(s){
  return (s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

/* ==========
   Screen control
========== */
function setScreen(which){
  if(authScreen) authScreen.style.display = (which === "auth") ? "flex" : "none";

  if(appScreen){
    appScreen.classList.toggle("hidden", which !== "app");
    appScreen.style.display = (which === "app") ? "block" : "none";
  }
  if(listScreen){
    listScreen.classList.toggle("hidden", which !== "list");
    listScreen.style.display = (which === "list") ? "block" : "none";
  }
}

/* ==========
   Firestore data model
   users/{uid} => { categories: {...}, transactions: [...] }
========== */
let currentUid = null;
let unsubUserDoc = null;

// In-memory state (истина для UI)
let currentMode = "expense";
let cats = structuredClone(DEFAULT_CATS);
let tx = [];
let dataReady = false;

// анти-дребезг для сохранения
let saveTimer = null;
let suppressRemoteApply = false;

function userDocRef(uid){
  return doc(db, "users", uid);
}

async function ensureUserDoc(uid){
  const ref = userDocRef(uid);
  const snap = await getDoc(ref);

  if(!snap.exists()){
    await setDoc(ref, {
      categories: structuredClone(DEFAULT_CATS),
      transactions: [],
      updatedAt: Date.now()
    });
    return;
  }

  // если документ есть, но чего-то нет — дополним
  const d = snap.data() || {};
  const patch = {};
  if(!d.categories) patch.categories = structuredClone(DEFAULT_CATS);
  if(!Array.isArray(d.transactions)) patch.transactions = [];
  if(Object.keys(patch).length){
    patch.updatedAt = Date.now();
    await setDoc(ref, patch, { merge: true });
  }
}

function applyRemoteData(d){
  // защитимся от "эхо" (когда мы только что сохранили и прилетело обратно)
  if(suppressRemoteApply) return;

  cats = (d?.categories && d.categories.expense && d.categories.income)
    ? d.categories
    : structuredClone(DEFAULT_CATS);

  tx = Array.isArray(d?.transactions) ? d.transactions : [];

  dataReady = true;
  render();
  if(!appScreen?.classList.contains("hidden")) {
    // если мы в списке — обновим тоже
    if(listScreen && listScreen.style.display === "block") renderList();
  }
}

function scheduleSave(){
  if(!currentUid) return;

  if(saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async ()=>{
    try{
      suppressRemoteApply = true;
      await setDoc(userDocRef(currentUid), {
        categories: cats,
        transactions: tx,
        updatedAt: Date.now()
      }, { merge: true });

      // чуть-чуть отпустим, чтобы следующий snapshot не дернул UI зря
      setTimeout(()=>{ suppressRemoteApply = false; }, 250);
    }catch(e){
      console.error(e);
      showToast("Ошибка сохранения (проверь интернет)");
      suppressRemoteApply = false;
    }
  }, 350);
}

/* ==========
   Period / filtering
========== */
function formatPeriodLabel(){
  const p = periodSel?.value;
  if(p === "today") return "Период: сегодня";
  if(p === "month") return "Период: этот месяц";
  return "Период: выбранный диапазон";
}
function getPeriodWindow(){
  const p = periodSel?.value || "month";
  if(p === "today"){
    const t = parseDateTime(todayISO());
    return {from:t, to:t};
  }
  if(p === "month"){
    return monthStartEnd();
  }
  const f = parseDateTime(fromDate?.value) ?? monthStartEnd().from;
  const t = parseDateTime(toDate?.value) ?? monthStartEnd().to;
  return {from: Math.min(f,t), to: Math.max(f,t)};
}
function filterByPeriod(allTx){
  const {from, to} = getPeriodWindow();
  return allTx.filter(x=>{
    const tt = parseDateTime(x.date);
    if(tt == null) return false;
    return tt >= from && tt <= to;
  });
}

/* ==========
   Donut
========== */
function setDonut(income, expense){
  if(!segIncome || !segExpense) return;
  const r = 44;
  const C = 2 * Math.PI * r;
  const total = Math.max(income + expense, 0.000001);

  const incPart = income / total;
  const expPart = expense / total;

  segIncome.style.strokeDasharray = `${C * incPart} ${C}`;
  segIncome.style.strokeDashoffset = `0`;

  segExpense.style.strokeDasharray = `${C * expPart} ${C}`;
  segExpense.style.strokeDashoffset = `${-C * incPart}`;
}

/* ==========
   Categories
========== */
function catList(type){
  return cats[type] || [];
}
function findCatIcon(type, name){
  const item = (cats[type]||[]).find(x=>x.name === name);
  return item?.icon || "🧾";
}
function renderCatButtons(){
  if(!catGrid) return;
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
function addCategory(type, name, icon){
  name = (name||"").trim();
  icon = (icon||"").trim() || "🧾";
  if(!name) return false;

  const exists = (cats[type]||[]).some(x=>x.name.toLowerCase() === name.toLowerCase());
  if(exists) return false;

  cats[type].unshift({ name, icon });
  scheduleSave();
  return true;
}

/* ==========
   Transactions
========== */
function buildTx(categoryName){
  const amount = Number(mAmount?.value);
  if(!amount || amount <= 0) return null;

  return {
    id: crypto.randomUUID(),
    type: currentMode,
    amount,
    currency: mCurrency?.value === "USD" ? "USD" : "UZS",
    method: mMethod?.value === "card" ? "card" : "cash",
    category: categoryName || "Другое",
    date: mDate?.value || todayISO(),
    note: (mNote?.value || "").trim(),
    createdAt: Date.now()
  };
}
function saveOne(txOne){
  tx.push(txOne);
  scheduleSave();
}
function tryAutoSaveWithCategory(categoryName){
  if(!dataReady){
    showToast("Данные ещё загружаются…");
    return;
  }
  const txOne = buildTx(categoryName);
  if(!txOne){
    showToast("Сначала введи сумму");
    mAmount?.focus();
    return;
  }
  saveOne(txOne);
  showToast("Сохранено ✅");
  closeModal();
  render();
}
function saveManual(){
  showToast("Выбери категорию (или добавь новую)");
}

/* ==========
   Render
========== */
function renderBreakdown(txArr){
  if(!catBreakdown) return;
  const exp = txArr.filter(x=>x.type==="expense");
  const sum = exp.reduce((a,x)=>a+(Number(x.amount)||0),0);

  catBreakdown.innerHTML = "";
  if(sum <= 0){
    catBreakdown.innerHTML = `<div class="muted small">Пока нет расходов за выбранный период.</div>`;
    return;
  }

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

function render(){
  if(periodLabel) periodLabel.textContent = formatPeriodLabel();

  const periodTx = filterByPeriod(tx);

  const income = periodTx.filter(x=>x.type==="income").reduce((a,x)=>a+(Number(x.amount)||0),0);
  const expense = periodTx.filter(x=>x.type==="expense").reduce((a,x)=>a+(Number(x.amount)||0),0);

  setDonut(income, expense);

  const bal = income - expense;
  if(balanceEl) balanceEl.textContent = money(bal);
  if(miniTotals) miniTotals.textContent = `+${money(income)} • -${money(expense)} (визуально)`;

  renderBreakdown(periodTx);
}

function renderList(){
  const periodTx = filterByPeriod(tx);

  const t = fType?.value || "all";
  const c = fCurrency?.value || "all";
  const m = fMethod?.value || "all";
  const q = (search?.value||"").trim().toLowerCase();

  const items = periodTx
    .filter(x => t === "all" ? true : x.type === t)
    .filter(x => c === "all" ? true : (x.currency||"UZS") === c)
    .filter(x => m === "all" ? true : (x.method||"cash") === m)
    .filter(x => !q ? true : ((x.note||"").toLowerCase().includes(q) || (x.category||"").toLowerCase().includes(q)))
    .sort((a,b)=>{
      if(a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.createdAt||0) - (a.createdAt||0);
    });

  if(listLabel) listLabel.textContent = formatPeriodLabel();
  if(!txList) return;
  txList.innerHTML = "";

  for(const item of items){
    const li = document.createElement("li");
    li.className = "txItem";

    const left = document.createElement("div");
    left.innerHTML = `
      <div class="badges">
        <span class="badge">${item.type==="income" ? "Доход" : "Расход"}</span>
        <span class="badge">${item.currency || "UZS"}</span>
        <span class="badge">${item.method==="card" ? "Карта" : "Наличка"}</span>
        <span class="badge">${escapeHtml(item.category || "—")}</span>
        <span class="badge">${item.date}</span>
      </div>
      <div class="muted small" style="margin-top:6px">${escapeHtml(item.note || "—")}</div>
    `;

    const right = document.createElement("div");
    right.style.textAlign = "right";

    const amt = document.createElement("div");
    amt.className = "amount";
    amt.textContent = (item.type==="expense" ? "- " : "+ ") + money(item.amount) + " " + (item.currency||"UZS");

    const del = document.createElement("button");
    del.className = "ghost smallBtn";
    del.textContent = "Удалить";
    del.style.marginTop = "8px";
    del.onclick = ()=>{
      tx = tx.filter(x=>x.id !== item.id);
      scheduleSave();
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
   Modal
========== */
function openModal(mode){
  currentMode = mode;
  if(modalTitle) modalTitle.textContent = (mode === "expense") ? "Расход" : "Доход";

  if(mDate) mDate.value = todayISO();
  if(mAmount) mAmount.value = "";
  if(mCurrency) mCurrency.value = "UZS";
  if(mMethod) mMethod.value = "cash";
  if(mNote) mNote.value = "";

  renderCatButtons();

  modal?.classList.remove("hidden");
  setTimeout(()=>mAmount?.focus(), 30);
}
function closeModal(){
  modal?.classList.add("hidden");
}

/* ==========
   Export / Import (теперь из Firestore state)
========== */
function doExport(){
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: cats,
    transactions: tx
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

    cats = (data.categories && data.categories.expense && data.categories.income)
      ? data.categories
      : structuredClone(DEFAULT_CATS);

    tx = data.transactions;

    scheduleSave();
    render();
    showToast("Импорт готов ✅");
  }catch{
    showToast("Импорт не удался");
  }
}

/* ==========
   Wire events
========== */
function wireAppEvents(){
  periodSel && (periodSel.onchange = ()=>{
    const isRange = periodSel.value === "range";
    rangeBox?.classList.toggle("hidden", !isRange);
    render();
  });
  [fromDate, toDate].forEach(el=>{
    if(el) el.onchange = render;
  });

  btnExport && (btnExport.onclick = doExport);
  importFile && (importFile.onchange = ()=>{
    const f = importFile.files?.[0];
    if(f) doImport(f);
    importFile.value = "";
  });

  btnAllTx && (btnAllTx.onclick = ()=>{
    setScreen("list");
    renderList();
  });
  btnBack && (btnBack.onclick = ()=>{
    setScreen("app");
    render();
  });

  [fType, fCurrency, fMethod, search].forEach(el=>{
    if(!el) return;
    el.addEventListener("input", renderList);
    el.addEventListener("change", renderList);
  });

  btnMinus && (btnMinus.onclick = ()=>openModal("expense"));
  btnPlus && (btnPlus.onclick = ()=>openModal("income"));

  btnClose && (btnClose.onclick = closeModal);
  btnCancel && (btnCancel.onclick = closeModal);
  btnSaveManual && (btnSaveManual.onclick = saveManual);

  btnAddCategory && (btnAddCategory.onclick = ()=>{
    if(newCatName) newCatName.value = "";
    if(newCatIcon) newCatIcon.value = "";
    if(newCatType) newCatType.value = currentMode;
    catModal?.classList.remove("hidden");
    setTimeout(()=>newCatName?.focus(), 30);
  });

  btnCloseCat && (btnCloseCat.onclick = ()=>catModal?.classList.add("hidden"));
  btnCancelCat && (btnCancelCat.onclick = ()=>catModal?.classList.add("hidden"));

  btnCreateCat && (btnCreateCat.onclick = ()=>{
    const ok = addCategory(newCatType?.value, newCatName?.value, newCatIcon?.value);
    if(!ok){
      showToast("Не добавилось (проверь название)");
      return;
    }
    showToast("Категория добавлена ✅");
    catModal?.classList.add("hidden");
    renderCatButtons();
    render();
  });
}

/* ==========
   Auth flow
========== */
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    if (authError) authError.textContent = "";
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      showAuthError(e);
    }
  });
}

window.logout = async () => signOut(auth);

/* ==========
   Init
========== */
wireAppEvents();
if(fromDate) fromDate.value = todayISO();
if(toDate) toDate.value = todayISO();
setScreen("auth");
render();

onAuthStateChanged(auth, async (user) => {
  // чистим подписку на старого юзера
  if(unsubUserDoc){
    unsubUserDoc();
    unsubUserDoc = null;
  }

  dataReady = false;

  if (!user) {
    currentUid = null;
    tx = [];
    cats = structuredClone(DEFAULT_CATS);
    setScreen("auth");
    render();
    return;
  }

  currentUid = user.uid;

  try{
    await ensureUserDoc(currentUid);

    // живой sync: если добавишь на Mac — появится на iPhone
    unsubUserDoc = onSnapshot(userDocRef(currentUid), (snap)=>{
      applyRemoteData(snap.data() || {});
    });

    setScreen("app");
  }catch(e){
    console.error(e);
    showToast("Firestore: нет доступа (проверь Rules)");
    setScreen("app"); // UI покажем, но данных не будет
  }
});

// service worker (optional offline)
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
