import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');
const rows = db.prepare("SELECT provider, is_active FROM credentials WHERE is_active = 1").all();
console.log([...new Set(rows.map(r => r.provider))]);
