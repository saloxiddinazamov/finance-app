// app.js (минимально рабочий вход для GitHub Pages)

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
const googleProvider = new GoogleAuthProvider();

// --- UI элементы (должны быть в index.html) ---
const authScreen = document.getElementById("authScreen");   // экран логина
const authError  = document.getElementById("authError");

const emailInput = document.getElementById("email");
const passInput  = document.getElementById("password");

const googleBtn  = document.getElementById("googleBtn");
const loginBtn   = document.getElementById("loginBtn");
const registerBtn= document.getElementById("registerBtn");

// Если у тебя есть “замок” (FaceID/PIN) — пусть он будет отдельным блоком
// Например: <div id="auth" class="screen auth">...</div>
const lockScreen = document.getElementById("auth"); // твой экран “Мои финансы / Разблокировать” (если есть)

// --- Helpers ---
function showError(e) {
  console.error(e);
  if (authError) authError.textContent = e?.message || String(e);
}

// --- Кнопки ---
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    authError && (authError.textContent = "");
    try {
      await signInWithPopup(auth, googleProvider); // ВОТ ЭТО — ключевой фикс
    } catch (e) {
      showError(e);
    }
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    authError && (authError.textContent = "");
    try {
      await signInWithEmailAndPassword(auth, emailInput.value, passInput.value);
    } catch (e) {
      showError(e);
    }
  });
}

if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    authError && (authError.textContent = "");
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
    // Пользователь вошёл ✅
    if (authScreen) authScreen.style.display = "none";
    if (lockScreen) lockScreen.style.display = "block"; // теперь можно показывать FaceID/PIN
  } else {
    // Пользователь НЕ вошёл
    if (authScreen) authScreen.style.display = "flex";
    if (lockScreen) lockScreen.style.display = "none";
  }
});

// (опционально) сделать кнопку выхода где-нибудь
window.logout = async () => signOut(auth);
