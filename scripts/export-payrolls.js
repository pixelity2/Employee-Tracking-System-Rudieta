// Node script to export payrolls server-side (requires firebase-admin + service account)
const admin = require('firebase-admin');
const fs = require('fs');
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

async function exportCSV(path='payroll_export.csv'){
  const db = admin.firestore();
  const snap = await db.collection('shifts').where('status','==','closed').get();
  const rows = [['shiftId','userId','clockIn','clockOut','hours','earnings','notes','links']];
  snap.forEach(d => {
    const s = d.data();
    const inT = s.clockIn ? s.clockIn.toDate().toISOString() : '';
    const outT = s.clockOut ? s.clockOut.toDate().toISOString() : '';
    const notes = (s.notes||'').replace(/\n/g,' ').replace(/"/g,'""');
    const links = (s.links||[]).join(';');
    rows.push([d.id, s.userId, inT, outT, s.durationHours||'', s.earnings||0, `"${notes}"`, `"${links}"`]);
  });
  fs.writeFileSync(path, rows.map(r=>r.join(',')).join('\n'));
  console.log('Exported to',path);
}
exportCSV().catch(console.error);