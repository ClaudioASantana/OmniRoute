import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');

const checkTable = (table) => {
  const pragma = db.prepare(`PRAGMA table_info(${table})`).all();
  return pragma.filter(col => col.notnull === 1).map(col => col.name);
};

console.log("routing_decisions NOT NULL columns:", checkTable("routing_decisions"));
console.log("combo_adaptation_state NOT NULL columns:", checkTable("combo_adaptation_state"));
console.log("call_logs NOT NULL columns:", checkTable("call_logs"));
