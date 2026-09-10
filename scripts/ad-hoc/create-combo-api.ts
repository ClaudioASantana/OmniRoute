import { createCombo } from "../../src/lib/db/combos";
import { randomUUID } from "node:crypto";

async function run() {
  try {
    const id = `cm/roteador-inteligente`;
    await createCombo({
      id,
      name: "Roteador Inteligente (Complexidade)",
      data: {
        strategy: "complexity-optimized",
        targets: [
          { modelStr: "claude-3-haiku-20240307", weight: 1, config: {} },
          { modelStr: "gemini-2.5-flash-lite", weight: 1, config: {} },
          { modelStr: "gpt-4o-mini", weight: 1, config: {} },
          { modelStr: "claude-3-5-sonnet-20241022", weight: 1, config: {} },
          { modelStr: "o1-preview", weight: 1, config: {} }
        ],
        description: "Roteia automaticamente a requisição baseado na complexidade do prompt."
      }
    });
    console.log(`Combo criado com sucesso! ID: ${id}`);
  } catch (error) {
    console.error("Erro ao criar combo:", error);
  }
}

run();
