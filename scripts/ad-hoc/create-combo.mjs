import Database from 'better-sqlite3';
const db = new Database('/home/gattsu/.omniroute/storage.sqlite');

try {
  db.prepare(`
    INSERT INTO combos (id, name, strategy, mode)
    VALUES ('cm/complex-router', 'Roteador por Complexidade', 'complexity-optimized', 'chat')
  `).run();
  
  db.prepare(`
    INSERT INTO combo_targets (id, combo_id, model_str, priority)
    VALUES 
      ('t1', 'cm/complex-router', 'claude-3-haiku-20240307', 1),
      ('t2', 'cm/complex-router', 'gemini-2.5-flash-lite', 2),
      ('t3', 'cm/complex-router', 'gpt-4o-mini', 3),
      ('t4', 'cm/complex-router', 'claude-3-5-sonnet-20241022', 4),
      ('t5', 'cm/complex-router', 'o1-preview', 5)
  `).run();
  console.log("Combo created successfully!");
} catch (err) {
  console.error(err);
}
