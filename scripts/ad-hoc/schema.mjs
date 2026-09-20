import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');
console.log(db.prepare("PRAGMA table_info(combos);").all());
