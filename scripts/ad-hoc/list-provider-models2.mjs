import { PROVIDER_MODELS } from '../../open-sse/config/providerModels.ts';
console.log("anthropic:");
console.log(PROVIDER_MODELS['anthropic']?.map(m => m.id));
console.log("cursor:");
console.log(PROVIDER_MODELS['cursor']?.map(m => m.id));
