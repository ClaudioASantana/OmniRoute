import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');

const fixedData = JSON.stringify({
  strategy: "complexity-optimized",
  models: [
    { model: "claude/claude-3-haiku-20240307", weight: 1 },
    { model: "cursor/gemini-2.5-flash", weight: 1 },
    { model: "cursor/gpt-4o-mini", weight: 1 },
    { model: "claude/claude-3-5-sonnet-20241022", weight: 1 },
    { model: "cursor/o1-preview", weight: 1 }
  ]
});

db.prepare("UPDATE combos SET data = ? WHERE id = 'combo/roteador-inteligente'").run(fixedData);
console.log("Combo updated with available provider prefixes (claude/ and cursor/).");
