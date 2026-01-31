import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  enableMultiTabIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBTWGzgqSg4ipVWfU5UjPtNZCDLXSMgP6o",
  authDomain: "pocket-sprout.firebaseapp.com",
  projectId: "pocket-sprout",
  storageBucket: "pocket-sprout.firebasestorage.app",
  messagingSenderId: "279863159773",
  appId: "1:279863159773:web:72aa0ffd63d222e5d16434"
};

window.FIREBASE_CONFIG = firebaseConfig;


window.firebaseReady = window.firebaseReady || (function () {
  let resolveFn;
  const p = new Promise((resolve) => { resolveFn = resolve; });
  p._resolve = resolveFn;
  return p;
})();

let app;
let db;
let auth;
let currentUser = null;



try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch (e) {

  console.warn("Firebase initialization warning:", e);
  try {
    app = getApp();
  } catch (e2) {
    console.error("Firebase could not initialize at all:", e2);
  }
}

try {
  if (app) {
    db = getFirestore(app);
    auth = getAuth(app);
  }
} catch (e) {
  console.error("Firebase service initialization failed:", e);
}

window.app = app || null;
window.db = db || null;
window.auth = auth || null;
window.currentUser = null;

if (db) {
  enableMultiTabIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.log("Persistence failed: Multiple tabs open");
      } else if (err.code === 'unimplemented') {
        console.log("Persistence not supported by browser");
      } else {
        console.log("Persistence failed:", err);
      }
    });
}

if (auth) {
  let authObservedOnce = false;

  onAuthStateChanged(auth, (user) => {
    authObservedOnce = true;

    if (user) {
      console.log("✅ Authenticated as:", user.uid);
      currentUser = user;
      window.currentUser = user;

      if (typeof window.loadFromCloud === 'function') {
        window.loadFromCloud();
      }
    } else {
      console.log("👤 No user, signing in anonymously...");
      signInAnonymously(auth).catch((error) => {
        console.error("Auth failed:", error);
      });
    }


    if (window.firebaseReady && typeof window.firebaseReady._resolve === 'function') {

      window.firebaseReady._resolve({ app: window.app, db: window.db, auth: window.auth });
      delete window.firebaseReady._resolve;
    }
  });


  setTimeout(() => {
    if (!authObservedOnce && window.firebaseReady && typeof window.firebaseReady._resolve === 'function') {
      window.firebaseReady._resolve({ app: window.app, db: window.db, auth: window.auth });
      delete window.firebaseReady._resolve;
    }
  }, 2000);
} else {

  if (window.firebaseReady && typeof window.firebaseReady._resolve === 'function') {
    window.firebaseReady._resolve({ app: window.app, db: window.db, auth: window.auth });
    delete window.firebaseReady._resolve;
  }
}
