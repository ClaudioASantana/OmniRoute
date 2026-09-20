import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');
const row = db.prepare("SELECT data FROM combos WHERE id = 'combo/roteador-inteligente'").get();
console.log(row.data);
