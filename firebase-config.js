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

// Alias for modules that expect FIREBASE_CONFIG
window.FIREBASE_CONFIG = firebaseConfig;

// A simple “ready” signal other modules can await.
// Resolves once db/auth are set up AND auth state has been observed at least once.
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

// Robust app initialization:
// - If already initialized (common in hot reloads / partial refreshes), reuse it.
// - Never leave `app` undefined.
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch (e) {
  // As a last resort, try to recover using getApp()
  console.warn("Firebase initialization warning:", e);
  try {
    app = getApp();
  } catch (e2) {
    console.error("Firebase could not initialize at all:", e2);
  }
}

// Initialize Services (guarded)
try {
  if (app) {
    db = getFirestore(app);
    auth = getAuth(app);
  }
} catch (e) {
  console.error("Firebase service initialization failed:", e);
}

// Expose for other modules (system.js, game logic)
window.app = app || null;
window.db = db || null;
window.auth = auth || null;
window.currentUser = null;

// Enable offline persistence for Firestore (best-effort)
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

// Handle Authentication State
if (auth) {
  let authObservedOnce = false;

  onAuthStateChanged(auth, (user) => {
    authObservedOnce = true;

    if (user) {
      console.log("✅ Authenticated as:", user.uid);
      currentUser = user;
      window.currentUser = user;

      // Once we have a user, try to load their cloud save immediately
      if (typeof window.loadFromCloud === 'function') {
        window.loadFromCloud();
      }
    } else {
      console.log("👤 No user, signing in anonymously...");
      signInAnonymously(auth).catch((error) => {
        console.error("Auth failed:", error);
      });
    }

    // Resolve readiness once we’ve observed auth at least once,
    // and have the essential globals assigned.
    if (window.firebaseReady && typeof window.firebaseReady._resolve === 'function') {
      // Only resolve once.
      window.firebaseReady._resolve({ app: window.app, db: window.db, auth: window.auth });
      delete window.firebaseReady._resolve;
    }
  });

  // If auth state never fires for some reason, we still don’t want a deadlock.
  // Force readiness after a short grace period (DB can still work with permissive rules).
  setTimeout(() => {
    if (!authObservedOnce && window.firebaseReady && typeof window.firebaseReady._resolve === 'function') {
      window.firebaseReady._resolve({ app: window.app, db: window.db, auth: window.auth });
      delete window.firebaseReady._resolve;
    }
  }, 2000);
} else {
  // No auth available; still resolve readiness so modules don’t hang forever.
  if (window.firebaseReady && typeof window.firebaseReady._resolve === 'function') {
    window.firebaseReady._resolve({ app: window.app, db: window.db, auth: window.auth });
    delete window.firebaseReady._resolve;
  }
}
