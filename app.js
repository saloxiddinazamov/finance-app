// AppRightPref.js — Firebase Google Login + Finance App (без FaceID/PIN)
// Работает на GitHub Pages

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

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
const provider = new GoogleAuthProvider();

/* ==========
   Storage keys
========== */
const TX_KEY = "finance_tx_v1";
const CAT_KEY = "finance_cats_v1";
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
   Screen control (без FaceID/PIN)
========== */
function setScreen(which){
  // auth overlay
  if(authScreen) authScreen.style.display = (which === "auth") ? "flex" : "none";

  // app + list use .hidden class from your CSS
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

/* ==========
   App state
========== */
let currentMode = "expense";
let cats = loadCats();

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
  return allTx.filter(tx=>{
    const tt = parseDateTime(tx.date);
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
  saveCats(cats);
  return true;
}

/* ==========
   Save transaction
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
function saveOne(tx){
  const all = loadTx();
  all.push(tx);
  saveTx(all);
}
function tryAutoSaveWithCategory(categoryName){
  const tx = buildTx(categoryName);
  if(!tx){
    showToast("Сначала введи сумму");
    mAmount?.focus();
    return;
  }
  saveOne(tx);
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

  const all = loadTx();
  const periodTx = filterByPeriod(all);

  const income = periodTx.filter(x=>x.type==="income").reduce((a,x)=>a+(Number(x.amount)||0),0);
  const expense = periodTx.filter(x=>x.type==="expense").reduce((a,x)=>a+(Number(x.amount)||0),0);

  setDonut(income, expense);

  const bal = income - expense;
  if(balanceEl) balanceEl.textContent = money(bal);
  if(miniTotals) miniTotals.textContent = `+${money(income)} • -${money(expense)} (визуально)`;

  renderBreakdown(periodTx);
}

function renderList(){
  const all = loadTx();
  const periodTx = filterByPeriod(all);

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
   Wire events (app buttons)
========== */
function wireAppEvents(){
  // top period
  periodSel && (periodSel.onchange = ()=>{
    const isRange = periodSel.value === "range";
    rangeBox?.classList.toggle("hidden", !isRange);
    render();
  });
  [fromDate, toDate].forEach(el=>{
    if(el) el.onchange = render;
  });

  // export/import
  btnExport && (btnExport.onclick = doExport);
  importFile && (importFile.onchange = ()=>{
    const f = importFile.files?.[0];
    if(f) doImport(f);
    importFile.value = "";
  });

  // navigate list
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

  // open modal
  btnMinus && (btnMinus.onclick = ()=>openModal("expense"));
  btnPlus && (btnPlus.onclick = ()=>openModal("income"));

  // modal buttons
  btnClose && (btnClose.onclick = closeModal);
  btnCancel && (btnCancel.onclick = closeModal);
  btnSaveManual && (btnSaveManual.onclick = saveManual);

  // add category
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
    cats = loadCats();
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

// optional logout
window.logout = async () => signOut(auth);

// init app wiring once
wireAppEvents();
if(fromDate) fromDate.value = todayISO();
if(toDate) toDate.value = todayISO();
setScreen("auth");     // пока не вошёл
render();              // можно рендерить заранее — не мешает

onAuthStateChanged(auth, (user) => {
  if (user) {
    // вошёл -> сразу в приложение
    setScreen("app");
    render();
  } else {
    // не вошёл -> логин
    setScreen("auth");
  }
});

// service worker (optional offline)
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
