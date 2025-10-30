import { auth, db, functions } from './app.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js";

const createBtn = document.getElementById('createEmp');
const emailIn = document.getElementById('empEmail');
const nameIn = document.getElementById('empName');
const rateIn = document.getElementById('empRate');
const statusEl = document.getElementById('createStatus');
const signoutBtn = document.getElementById('signout');
const recentEl = document.getElementById('recentShifts');
const exportBtn = document.getElementById('exportCsv');

onAuthStateChanged(auth, async user => {
  if (!user) return location.href='./index.html';
  // basic admin gate: check user doc role
  const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js');
  const u = await getDoc(doc(db,'users',user.uid));
  if (!u.exists() || u.data().role !== 'admin') {
    alert('Not authorized'); return location.href='./index.html';
  }
  loadRecent();
});

createBtn.addEventListener('click', async () => {
  statusEl.innerText = '';
  try {
    const createEmployee = httpsCallable(functions,'createEmployee');
    const res = await createEmployee({ email: emailIn.value, displayName: nameIn.value, baseRate: parseFloat(rateIn.value||0) });
    statusEl.innerText = 'Created ' + res.data.email;
  } catch(e){ statusEl.innerText = e.message; }
});

exportBtn.addEventListener('click', async () => {
  // call local script that gathers shifts and constructs CSV client-side
  const csv = await exportPayrollCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'payroll.csv'; a.click();
  URL.revokeObjectURL(url);
});

signoutBtn.addEventListener('click', ()=> signOut(auth).then(()=> location.href='./index.html'));

async function loadRecent(){
  recentEl.innerHTML = '';
  const thirty = new Date(); thirty.setDate(thirty.getDate()-30);
  const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js');
  const q = query(collection(db,'shifts'), where('status','==','closed'), orderBy('closedAt','desc'));
  const snap = await getDocs(q);
  let total = 0;
  for (const d of snap.docs.slice(0,50)) {
    const s = d.data();
    total += s.earnings || 0;
    const el = document.createElement('div'); el.className='shift';
    const dtIn = s.clockIn ? new Date(s.clockIn.seconds*1000).toLocaleString() : '-';
    const dtOut = s.clockOut ? new Date(s.clockOut.seconds*1000).toLocaleString() : '-';
    el.innerHTML = `<div><strong>${dtIn}</strong><div style="color:var(--muted);font-size:13px">${dtOut}</div></div>
                    <div style="text-align:right"><div style="color:var(--accent);font-weight:700">${(s.earnings||0).toFixed(2)}</div>
                    <div class="badge">${s.userId}</div></div>`;
    recentEl.appendChild(el);
  }
  document.getElementById('tot30').innerText = total.toFixed(2);
}

async function exportPayrollCSV(){
  // fetch closed shifts last 30 days and build CSV
  const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js');
  const q = query(collection(db,'shifts'), where('status','==','closed'));
  const snap = await getDocs(q);
  const rows = [['shiftId','userId','clockIn','clockOut','hours','earnings','notes','links']];
  for (const d of snap.docs) {
    const s = d.data();
    const inT = s.clockIn ? new Date(s.clockIn.seconds*1000).toISOString() : '';
    const outT = s.clockOut ? new Date(s.clockOut.seconds*1000).toISOString() : '';
    const hours = s.durationHours || '';
    const notes = (s.notes||'').replace(/\n/g,' ').replace(/"/g,'""');
    const links = (s.links||[]).join(';');
    rows.push([d.id, s.userId, inT, outT, hours, s.earnings||0, `"${notes}"`, `"${links}"`]);
  }
  return rows.map(r => r.join(',')).join('\n');
}