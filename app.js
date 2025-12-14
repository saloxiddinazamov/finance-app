// app.js (вход для GitHub Pages)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC0yZgKbsk0bqWQxHJoQoRIGt_6wl6SxAo",
  authDomain: "my-finance-app-2e4ff.firebaseapp.com",
  projectId: "my-finance-app-2e4ff",
  storageBucket: "my-finance-app-2e4ff.firebasestorage.app",
  messagingSenderId: "902666583622",
  appId: "1:902666583622:web:a2563e018f2ed46cefd447",
  measurementId: "G-H1D0GLJ4H3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// важно: пусть переменная называется provider, как ты хотел
const provider = new GoogleAuthProvider();

// --- UI элементы ---
const authScreen = document.getElementById("authScreen");
const authError  = document.getElementById("authError");

const emailInput  = document.getElementById("email");
const passInput   = document.getElementById("password");

const googleBtn   = document.getElementById("googleBtn");
const loginBtn    = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");

// это главный экран приложения
const appScreen = document.getElementById("app");

// --- Helpers ---
function showError(e) {
  console.error(e);
  if (authError) authError.textContent = e?.message || String(e);
}

// --- Google вход ---
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    if (authError) authError.textContent = "";
    try {
      await signInWithPopup(auth, provider); // ✅ ТОЛЬКО ТАК
    } catch (e) {
      showError(e);
    }
  });
}

// --- Email/Password (если оставишь в HTML) ---
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    if (authError) authError.textContent = "";
    try {
      await signInWithEmailAndPassword(auth, emailInput.value, passInput.value);
    } catch (e) {
      showError(e);
    }
  });
}

if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    if (authError) authError.textContent = "";
    try {
      await createUserWithEmailAndPassword(auth, emailInput.value, passInput.value);
    } catch (e) {
      showError(e);
    }
  });
}

// --- Реакция на вход/выход ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // вошёл ✅
    if (authScreen) authScreen.style.display = "none";
    if (appScreen) appScreen.classList.remove("hidden");
  } else {
    // не вошёл
    if (authScreen) authScreen.style.display = "flex";
    if (appScreen) appScreen.classList.add("hidden");
  }
});

// (опционально) выход
window.logout = async () => signOut(auth);
