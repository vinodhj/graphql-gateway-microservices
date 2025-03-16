import { loadGraphQLHTTPSubgraph, defineConfig as defineComposeConfig } from "@graphql-mesh/compose-cli";
import { default as additionalResolvers$0 } from "./src/additional-resolvers.ts";
import { defineConfig as defineGatewayConfig } from "@graphql-hive/gateway";

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph("UserService", {
        endpoint: "http://localhost:7501/graphql",
        method: "POST",
        operationHeaders: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        retry: 3,
        timeout: 10000,
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph("ExpenseService", {
        endpoint: "http://localhost:7502/graphql",
        method: "POST",
        operationHeaders: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        retry: 3,
        timeout: 10000,
      }),
    },
  ],
  additionalTypeDefs: `
    extend type User {
      expenses: [Expense!]!
    }
    extend type Expense {
      user: User!
    }
  `,
});

export const gatewayConfig = defineGatewayConfig({
  additionalResolvers: [additionalResolvers$0],
  cors: { origin: "*", credentials: true },
  plugins: (ctx) => [],
});
