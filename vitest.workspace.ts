import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "./gateway/graphql-tools/vitest.config.mts",
  "./gateway/graphql-mesh/vitest.config.mts",
  "./services/user-service/vitest.config.mts",
  "./services/expense-service/vitest.config.mts",
]);
