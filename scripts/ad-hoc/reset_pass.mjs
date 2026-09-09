import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');
db.prepare("DELETE FROM key_value WHERE namespace = 'settings' AND key = 'password'").run();
console.log("Password reset successfully.");
