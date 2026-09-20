import { getComboById, getComboByName } from '../../src/lib/db/combos.ts';

async function run() {
  console.log("getComboById:", await getComboById("combo/roteador-inteligente"));
  console.log("getComboByName:", await getComboByName("combo/roteador-inteligente"));
  console.log("getComboByName(real name):", await getComboByName("Roteador Inteligente (Complexidade)"));
}

run().catch(console.error);
