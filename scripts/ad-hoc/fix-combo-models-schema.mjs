import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');

const fixedData = JSON.stringify({
  strategy: "complexity-optimized",
  models: [
    { model: "claude-3-haiku-20240307", weight: 1 },
    { model: "gemini-2.5-flash-lite", weight: 1 },
    { model: "gpt-4o-mini", weight: 1 },
    { model: "claude-3-5-sonnet-20241022", weight: 1 },
    { model: "o1-preview", weight: 1 }
  ]
});

db.prepare("UPDATE combos SET data = ? WHERE id = 'combo/roteador-inteligente'").run(fixedData);
console.log("Combo updated with correct 'model' key in models array.");
