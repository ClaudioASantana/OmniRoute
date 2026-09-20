import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');

db.prepare("UPDATE combos SET id = 'combo/roteador-inteligente' WHERE id = 'cm/roteador-inteligente'").run();
console.log("Combo ID updated in DB.");
