import { db, auth, functions } from './app.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  collection, addDoc, query, where, orderBy, limit, onSnapshot,
  doc, updateDoc, serverTimestamp, getDocs, getDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js";

const clockInBtn = document.getElementById('clockIn');
const clockOutBtn = document.getElementById('clockOut');
const shiftPrompt = document.getElementById('shiftPrompt');
const submitShift = document.getElementById('submitShift');
const cancelClose = document.getElementById('cancelClose');
const shiftsEl = document.getElementById('shifts');
const signoutBtn = document.getElementById('signout');

let currentShiftId = null;
let currentUser = null;

onAuthStateChanged(auth, async user => {
  if (!user) return location.href = './index.html';
  currentUser = user;
  document.getElementById('uname').innerText = user.displayName || user.email;
  document.getElementById('uemail').innerText = user.email;
  document.getElementById('avatar').innerText = (user.displayName||'U')[0].toUpperCase();
  watchShifts(user.uid);
  await checkOpenShift(user.uid);
  computeTotals(user.uid);
});

signoutBtn.addEventListener('click', ()=> signOut(auth).then(()=> location.href='./index.html'));

async function checkOpenShift(uid){
  const q = query(collection(db,'shifts'), where('userId','==',uid), where('status','==','open'), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    currentShiftId = snap.docs[0].id;
    clockInBtn.disabled = true;
    clockOutBtn.disabled = false;
    document.getElementById('openBadge').innerText = 'Yes';
    document.getElementById('shiftState').innerText = 'Clocked in';
  } else {
    clockInBtn.disabled = false;
    clockOutBtn.disabled = true;
    document.getElementById('openBadge').innerText = 'No';
    document.getElementById('shiftState').innerText = 'Idle';
  }
}

clockInBtn.addEventListener('click', async () => {
  try {
    const docRef = await addDoc(collection(db,'shifts'), {
      userId: currentUser.uid,
      clockIn: serverTimestamp(),
      clockOut: null,
      status: 'open',
      createdAt: serverTimestamp()
    });
    currentShiftId = docRef.id;
    clockInBtn.disabled = true;
    clockOutBtn.disabled = false;
    window.App.toasts('Clocked in');
    document.getElementById('openBadge').innerText = 'Yes';
  } catch(e) { window.App.toasts(e.message) }
});

clockOutBtn.addEventListener('click', async () => {
  if (!currentShiftId) return;
  try {
    await updateDoc(doc(db,'shifts',currentShiftId), { clockOut: serverTimestamp() });
    clockOutBtn.disabled = true;
    shiftPrompt.style.display = 'block';
    window.App.toasts('Clock out recorded — please fill the end-of-shift log');
  } catch(e){ window.App.toasts(e.message) }
});

cancelClose.addEventListener('click', async ()=>{
  // if user cancels, keep shift open and clear server clockOut
  shiftPrompt.style.display = 'none';
  if (!currentShiftId) return;
  await updateDoc(doc(db,'shifts',currentShiftId), { clockOut: null });
  clockOutBtn.disabled = false;
});

submitShift.addEventListener('click', async ()=>{
  const notes = document.getElementById('notes').value || '';
  const links = document.getElementById('links').value.split(',').map(s=>s.trim()).filter(Boolean);
  if (!currentShiftId) return window.App.toasts('No open shift found');
  try {
    // finalize on server (call Cloud Function)
    const finalize = httpsCallable(functions, 'finalizeShiftEU');
    const res = await finalize({ shiftId: currentShiftId });
    await updateDoc(doc(db,'shifts',currentShiftId), { notes, links: links, closedAt: serverTimestamp() });
    window.App.toasts('Shift finalized: ' + (res.data?.earnings ?? '0').toString());
    shiftPrompt.style.display = 'none';
    currentShiftId = null;
    clockInBtn.disabled = false;
    computeTotals(auth.currentUser.uid);
  } catch(e) {
    window.App.toasts(e.message || 'Finalize failed');
  }
});

function watchShifts(uid){
  const q = query(collection(db,'shifts'), where('userId','==',uid), orderBy('createdAt','desc'), limit(20));
  onSnapshot(q, snap => {
    shiftsEl.innerHTML = '';
    snap.forEach(d => {
      const s = d.data();
      const el = document.createElement('div'); el.className='shift';
      const inT = s.clockIn ? new Date(s.clockIn.seconds*1000).toLocaleString() : '-';
      const outT = s.clockOut ? new Date(s.clockOut.seconds*1000).toLocaleString() : (s.status==='open' ? 'open' : '-');
      el.innerHTML = `<div class="meta"><div><strong>${inT}</strong><div style="color:var(--muted);font-size:13px">${outT}</div></div></div>
                      <div style="text-align:right"><div class="earn">${s.earnings ? s.earnings.toFixed(2) : '—'}</div><div class="badge">${s.status}</div></div>`;
      shiftsEl.appendChild(el);
    });
  });
}

async function computeTotals(uid){
  // naive sums client-side for summary
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(dayStart); weekStart.setDate(dayStart.getDate()-7);
  const monthStart = new Date(dayStart); monthStart.setDate(dayStart.getDate()-30);

  const snap = await getDocs(query(collection(db,'shifts'), where('userId','==',uid)));
  let tDay=0,tWeek=0,tMonth=0;
  snap.forEach(d=>{
    const s = d.data();
    if (!s.closedAt || !s.earnings) return;
    const closed = s.closedAt.toDate();
    if (closed >= dayStart) tDay += s.earnings;
    if (closed >= weekStart) tWeek += s.earnings;
    if (closed >= monthStart) tMonth += s.earnings;
  });
  document.getElementById('earnToday').innerText = tDay.toFixed(2);
  document.getElementById('earnWeek').innerText = tWeek.toFixed(2);
  document.getElementById('earn30').innerText = tMonth.toFixed(2);
  document.getElementById('total30').innerText = tMonth.toFixed(2);
}