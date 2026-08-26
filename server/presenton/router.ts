/** @fileoverview Read-only tRPC evidence endpoints for the vendored Presenton runtime. */

import { router, protectedProcedure } from "../_core/trpc";
import { embeddedPresentonStatus, readEmbeddedPresentonPackage } from "./embeddedRuntime";

/** Read-only evidence bridge. Runtime startup and generation stay server-policy-only. */
export const presentonRouter = router({
  status: protectedProcedure.query(() => embeddedPresentonStatus()),
  source: protectedProcedure.query(() => readEmbeddedPresentonPackage()),
});
