import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');
const rows = db.prepare("SELECT * FROM routing_decisions WHERE trace_id = 'combo-34e655a0-94fa-4c50-b17a-e42b0edd4e2a'").all();
console.log(JSON.stringify(rows, null, 2));
