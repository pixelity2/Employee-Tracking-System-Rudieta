// Shared Firebase init + helpers (modular SDK)
import { FIREBASE_CONFIG } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, serverTimestamp, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js";

const app = initializeApp(FIREBASE_CONFIG);
try { getAnalytics(app); } catch(e) { /* analytics optional */ }

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

window.App = {
  auth, db, functions,
  toasts: (msg) => {
    const t = document.createElement('div'); t.className='toast'; t.innerText=msg;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 3000);
  }
};

export async function ensureUserDoc(user){
  const uRef = doc(db, 'users', user.uid);
  const snap = await getDoc(uRef);
  if (!snap.exists()) {
    await setDoc(uRef, {
      displayName: user.displayName || user.email,
      email: user.email,
      role: 'employee',
      baseRate: 0,
      active: true,
      createdAt: serverTimestamp()
    });
  }
}

export { FIREBASE_CONFIG, app, auth, db, functions, onAuthStateChanged, signInWithEmailAndPassword, signOut, httpsCallable };