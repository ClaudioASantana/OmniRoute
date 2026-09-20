import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');
const row = db.prepare("SELECT value FROM domain_config WHERE key = 'auth_password'").get();
console.log("DB password hash:", row ? row.value : "NOT SET (will use INITIAL_PASSWORD from .env)");
