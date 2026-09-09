import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');
const row = db.prepare("SELECT value FROM key_value WHERE namespace = 'settings' AND key = 'password'").get();
console.log("DB password hash:", row ? row.value : "NOT SET (will use INITIAL_PASSWORD from .env)");
