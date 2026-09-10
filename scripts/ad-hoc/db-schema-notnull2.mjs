import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');

const checkTable = (table) => {
  const pragma = db.prepare(`PRAGMA table_info(${table})`).all();
  return pragma.filter(col => col.notnull === 1).map(col => col.name);
};

console.log("usage_history NOT NULL columns:", checkTable("usage_history"));
console.log("request_detail_logs NOT NULL columns:", checkTable("request_detail_logs"));
console.log("api_keys NOT NULL columns:", checkTable("api_keys"));
