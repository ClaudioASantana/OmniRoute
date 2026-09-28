import { getDbInstance } from "../../src/lib/db/core";
import { ensureCompressionRunTelemetryTable } from "../../src/lib/db/compressionRunTelemetry";
import { cleanupCompressionRunTelemetry } from "../../src/lib/db/cleanup";
import { tableExists } from "../../src/lib/db/cleanup/usagePurge";

async function run() {
  console.log("Before ensure:", tableExists("compression_run_telemetry"));
  ensureCompressionRunTelemetryTable();
  console.log("After ensure:", tableExists("compression_run_telemetry"));
  const res = await cleanupCompressionRunTelemetry();
  console.log("Cleanup result:", res);
}
run().catch(console.error);
