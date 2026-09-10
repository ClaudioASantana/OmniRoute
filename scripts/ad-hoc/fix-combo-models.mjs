import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');

const fixedData = JSON.stringify({
  strategy: "complexity-optimized",
  models: [
    { modelStr: "claude-3-haiku-20240307", weight: 1, config: {} },
    { modelStr: "gemini-2.5-flash-lite", weight: 1, config: {} },
    { modelStr: "gpt-4o-mini", weight: 1, config: {} },
    { modelStr: "claude-3-5-sonnet-20241022", weight: 1, config: {} },
    { modelStr: "o1-preview", weight: 1, config: {} }
  ]
});

db.prepare("UPDATE combos SET data = ? WHERE id = 'combo/roteador-inteligente'").run(fixedData);
console.log("Combo updated in DB.");
