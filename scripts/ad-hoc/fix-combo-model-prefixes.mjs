import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');

const fixedData = JSON.stringify({
  strategy: "complexity-optimized",
  models: [
    { model: "claude/claude-haiku-4.5", weight: 1 },
    { model: "antigravity/gemini-3.1-flash-lite", weight: 1 },
    { model: "antigravity/gemini-3.7-flash-high", weight: 1 },
    { model: "claude/claude-sonnet-4.6", weight: 1 },
    { model: "claude/claude-opus-5", weight: 1 }
  ]
});

db.prepare("UPDATE combos SET data = ? WHERE id = 'combo/roteador-inteligente'").run(fixedData);
console.log("Combo updated with 2026 models from live catalog.");
