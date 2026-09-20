import { PROVIDER_MODELS } from '../../open-sse/config/providerModels.ts';

console.log("Claude models:");
console.log(PROVIDER_MODELS['claude']?.map(m => m.id));

console.log("\nCursor models:");
console.log(PROVIDER_MODELS['cursor']?.map(m => m.id));

