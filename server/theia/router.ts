/** @fileoverview Read-only tRPC evidence endpoints for the vendored Theia browser runtime. */

import { publicProcedure, router } from "../_core/trpc";
import { embeddedTheiaStatus, readEmbeddedTheiaPackage } from "./embeddedRuntime.js";

/**
 * Read-only evidence for the vendored Theia runtime. Starting a workbench is
 * deliberately outside browser RPC until Osamah has server-side user policy.
 */
export const theiaRouter = router({
  status: publicProcedure.query(async () => embeddedTheiaStatus()),
  source: publicProcedure.query(async () => readEmbeddedTheiaPackage()),
});
