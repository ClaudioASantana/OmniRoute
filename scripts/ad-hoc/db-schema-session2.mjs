import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');

const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'session_model_history'").get();
console.log(schema.sql);
