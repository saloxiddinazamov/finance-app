// app.js — только логин Google, потом подгружаем твой старый код (app-old.js)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// 1) Твой Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC0yZgKbsk0bqWQxHJoQoRIGt_6wl6SxAo",
  authDomain: "my-finance-app-2e4ff.firebaseapp.com",
  projectId: "my-finance-app-2e4ff",
  storageBucket: "my-finance-app-2e4ff.firebasestorage.app",
  messagingSenderId: "902666583622",
  appId: "1:902666583622:web:a2563e018f2ed46cefd447",
  measurementId: "G-H1D0GLJ4H3",
};

// 2) Инициализация Firebase Auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 3) UI элементы (они уже есть в index.html)
const authScreen = document.getElementById("authScreen");
const googleBtn = document.getElementById("googleBtn");
const authError = document.getElementById("authError");

// 4) Подгрузка твоего старого кода ТОЛЬКО после успешного входа
function loadOldApp() {
  // чтобы не грузить два раза
  if (window.__OLD_APP_LOADED__) return;
  window.__OLD_APP_LOADED__ = true;

  const s = document.createElement("script");
  s.src = "app-old.js";
  s.defer = true;
  document.body.appendChild(s);
}

// 5) Redirect-result (для iPhone/PWA это самый стабильный способ)
getRedirectResult(auth).catch((e) => {
  // не пугаем пользователя лишними ошибками
  if (authError && e?.message) authError.textContent = e.message;
});

// 6) Кнопка "Войти через Google"
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    if (authError) authError.textContent = "";
    try {
      await signInWithRedirect(auth, provider);
    } catch (e) {
      if (authError) authError.textContent = e?.message || "Ошибка входа через Google";
    }
  });
}

// 7) Состояние входа: не вошёл → показать экран, вошёл → скрыть и запустить старый код
onAuthStateChanged(auth, (user) => {
  if (!user) {
    if (authScreen) authScreen.style.display = "flex";
    return;
  }

  if (authScreen) authScreen.style.display = "none";

  // Сохраняем uid/email на всякий случай — пригодится для Firestore
  window.currentUser = {
    uid: user.uid,
    email: user.email,
    name: user.displayName,
  };

  loadOldApp();
});
