// AppRightPrefFirestore.js — Firebase Google Login + Finance App + Firestore Sync (Fixed)
// GitHub Pages friendly. Sync by user.uid across devices.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
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
function showAuthError(e){
  console.error(e);
  if (authError) authError.textContent = e?.message || String(e);
}

function isIOSLike(){
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  return isIOS && isSafari;
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
   Firestore model
   users/{uid}
     - categories: {expense:[], income:[]}
   users/{uid}/transactions/{txId}
     - type, amount, currency, method, category, date, note
     - createdAt: serverTimestamp()
     - createdAtMs: Date.now()   <-- стабильная сортировка
========== */
let currentUid = null;
let unsubUser = null;
let unsubTx = null;

// memory caches
let cats = structuredClone(DEFAULT_CATS);
let txCache = [];
let currentMode = "expense";

async function ensureUserDoc(uid){
  const ref = doc(db, "users", uid);
  await setDoc(ref, {
    categories: DEFAULT_CATS,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function stopRealtime(){
  if(unsubUser) { unsubUser(); unsubUser = null; }
  if(unsubTx) { unsubTx(); unsubTx = null; }
}

function normalizeTx(raw){
  // Firestore Timestamp -> ms
  const createdAtMs =
    typeof raw.createdAtMs === "number"
      ? raw.createdAtMs
      : (raw.createdAt?.toMillis ? raw.createdAt.toMillis() : 0);

  return {
    id: raw.id,
    type: raw.type || "expense",
    amount: Number(raw.amount)||0,
    currency: raw.currency === "USD" ? "USD" : "UZS",
    method: raw.method === "card" ? "card" : "cash",
    category: raw.category || "Другое",
    date: raw.date || todayISO(),
    note: (raw.note || "").trim(),
    createdAtMs
  };
}

function startRealtime(uid){
  stopRealtime();

  const userRef = doc(db, "users", uid);
  unsubUser = onSnapshot(userRef, (snap)=>{
    const data = snap.data();
    cats = data?.categories || structuredClone(DEFAULT_CATS);
    if(modal && !modal.classList.contains("hidden")) renderCatButtons();
    render();
    if(listScreen && !listScreen.classList.contains("hidden")) renderList();
  });

  const txRef = collection(db, "users", uid, "transactions");
  // ВАЖНО: сортируем по createdAtMs (а не serverTimestamp)
  const qTx = query(txRef, orderBy("createdAtMs", "desc"));
  unsubTx = onSnapshot(qTx, (snap)=>{
    txCache = snap.docs.map(d => normalizeTx({ id: d.id, ...d.data() }));
    render();
    if(listScreen && !listScreen.classList.contains("hidden")) renderList();
  });
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

    btn.addEventListener("click", ()=>tryAutoSaveWithCategory(c.name));
    catGrid.appendChild(btn);
  }
}

async function addCategory(type, name, icon){
  name = (name||"").trim();
  icon = (icon||"").trim() || "🧾";
  if(!name) return false;

  const exists = (cats[type]||[]).some(x=>x.name.toLowerCase() === name.toLowerCase());
  if(exists) return false;

  const next = structuredClone(cats);
  next[type] = [ { name, icon }, ...(next[type]||[]) ];
  cats = next;

  if(!currentUid) return false;
  await updateDoc(doc(db, "users", currentUid), {
    categories: next,
    updatedAt: serverTimestamp()
  });

  return true;
}

/* ==========
   Transactions (Firestore)
========== */
function buildTx(categoryName){
  const amount = Number(mAmount?.value);
  if(!amount || amount <= 0) return null;

  const nowMs = Date.now();

  return {
    type: currentMode,
    amount,
    currency: mCurrency?.value === "USD" ? "USD" : "UZS",
    method: mMethod?.value === "card" ? "card" : "cash",
    category: categoryName || "Другое",
    date: mDate?.value || todayISO(),
    note: (mNote?.value || "").trim(),
    createdAt: serverTimestamp(),
    createdAtMs: nowMs
  };
}

async function saveOne(tx){
  if(!currentUid) throw new Error("No user");
  const txRef = collection(db, "users", currentUid, "transactions");
  await addDoc(txRef, tx);
  await updateDoc(doc(db, "users", currentUid), { updatedAt: serverTimestamp() });
}

async function tryAutoSaveWithCategory(categoryName){
  const tx = buildTx(categoryName);
  if(!tx){
    showToast("Сначала введи сумму");
    mAmount?.focus();
    return;
  }
  try{
    await saveOne(tx);
    showToast("Сохранено ✅");
    closeModal();
  }catch(e){
    console.error(e);
    showToast("Ошибка сохранения");
  }
}

function saveManual(){
  showToast("Выбери категорию (или добавь новую)");
}

async function removeTx(txId){
  if(!currentUid) return;
  await deleteDoc(doc(db, "users", currentUid, "transactions", txId));
  await updateDoc(doc(db, "users", currentUid), { updatedAt: serverTimestamp() });
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

  const periodTx = filterByPeriod(txCache);

  const income = periodTx.filter(x=>x.type==="income").reduce((a,x)=>a+(Number(x.amount)||0),0);
  const expense = periodTx.filter(x=>x.type==="expense").reduce((a,x)=>a+(Number(x.amount)||0),0);

  setDonut(income, expense);

  const bal = income - expense;
  if(balanceEl) balanceEl.textContent = money(bal);
  if(miniTotals) miniTotals.textContent = `+${money(income)} • -${money(expense)} (визуально)`;

  renderBreakdown(periodTx);
}

function renderList(){
  const periodTx = filterByPeriod(txCache);

  const t = fType?.value || "all";
  const c = fCurrency?.value || "all";
  const m = fMethod?.value || "all";
  const q = (search?.value||"").trim().toLowerCase();

  const items = periodTx
    .filter(x => t === "all" ? true : x.type === t)
    .filter(x => c === "all" ? true : (x.currency||"UZS") === c)
    .filter(x => m === "all" ? true : (x.method||"cash") === m)
    .filter(x => !q ? true : ((x.note||"").toLowerCase().includes(q) || (x.category||"").toLowerCase().includes(q)))
    .sort((a,b)=> (b.createdAtMs||0) - (a.createdAtMs||0));

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
    del.onclick = async ()=>{
      try{
        await removeTx(tx.id);
        showToast("Удалено ✅");
      }catch(e){
        console.error(e);
        showToast("Не удалось удалить");
      }
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
async function doExport(){
  if(!currentUid) return;

  const userCats = cats || DEFAULT_CATS;
  const txRef = collection(db, "users", currentUid, "transactions");
  const snap = await getDocs(txRef);
  const tx = snap.docs.map(d => normalizeTx({ id: d.id, ...d.data() }));

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: userCats,
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
  if(!currentUid) return;

  try{
    const text = await file.text();
    const data = JSON.parse(text);
    if(!data || !Array.isArray(data.transactions)) throw new Error("bad");

    // categories
    const nextCats = data.categories || DEFAULT_CATS;
    await setDoc(doc(db, "users", currentUid), {
      categories: nextCats,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // replace transactions
    const txRef = collection(db, "users", currentUid, "transactions");
    const existing = await getDocs(txRef);
    await Promise.all(existing.docs.map(d => deleteDoc(d.ref)));

    for(const t of data.transactions){
      const nowMs = Date.now();
      const tx = {
        type: t.type || "expense",
        amount: Number(t.amount)||0,
        currency: t.currency === "USD" ? "USD" : "UZS",
        method: t.method === "card" ? "card" : "cash",
        category: t.category || "Другое",
        date: t.date || todayISO(),
        note: (t.note || "").trim(),
        createdAt: serverTimestamp(),
        createdAtMs: typeof t.createdAtMs === "number" ? t.createdAtMs : nowMs
      };
      await addDoc(txRef, tx);
    }

    showToast("Импорт готов ✅");
  }catch(e){
    console.error(e);
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

  btnCreateCat && (btnCreateCat.onclick = async ()=>{
    const ok = await addCategory(newCatType?.value, newCatName?.value, newCatIcon?.value);
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
   Auth flow (FIX for iPhone Safari)
========== */
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    if (authError) authError.textContent = "";
    try {
      // iPhone Safari / Incognito: redirect работает стабильнее popup
      if (isIOSLike()) {
        await signInWithRedirect(auth, provider);
      } else {
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";      }
    } catch (e) {
      showAuthError(e);
    }
  });
}

// optional logout
window.logout = async () => signOut(auth);

/* ==========
   Init
========== */
wireAppEvents();
if(fromDate) fromDate.value = todayISO();
if(toDate) toDate.value = todayISO();
setScreen("auth");
render();

// IMPORTANT: handle redirect result (iPhone)
getRedirectResult(auth).catch((e)=>showAuthError(e));

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUid = user.uid;
    await ensureUserDoc(currentUid);
    startRealtime(currentUid);
    setScreen("app");
    render();
  } else {
    currentUid = null;
    stopRealtime();
    setScreen("auth");
  }
});

// service worker (optional offline)
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
