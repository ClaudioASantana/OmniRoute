import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');

const row = db.prepare("SELECT data FROM combos WHERE id = 'combo/roteador-inteligente'").get();
const comboData = JSON.parse(row.data);

comboData.models = comboData.models.map(m => {
  if (m.model === 'claude/claude-haiku-4.5') {
    m.model = 'claude/claude-haiku-4-5-20251001';
  }
  return m;
});

console.log("Updated models array:");
console.log(comboData.models);

db.prepare("UPDATE combos SET data = ? WHERE id = 'combo/roteador-inteligente'").run(JSON.stringify(comboData));
console.log("Updated database successfully.");
