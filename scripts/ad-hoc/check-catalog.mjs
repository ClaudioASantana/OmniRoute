import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');
const rows = db.prepare("SELECT models FROM provider_profiles WHERE provider_id = 'claude'").get();
console.log(rows.models);
