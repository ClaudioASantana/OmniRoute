import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');

const checkTable = (table) => {
  const pragma = db.prepare(`PRAGMA table_info(${table})`).all();
  return pragma.filter(col => col.notnull === 1).map(col => col.name);
};

console.log("session_model_history NOT NULL columns:", checkTable("session_model_history"));
