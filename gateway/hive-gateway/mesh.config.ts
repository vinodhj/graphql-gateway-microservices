import { loadGraphQLHTTPSubgraph, defineConfig as defineComposeConfig } from "@graphql-mesh/compose-cli";
import { default as additionalResolvers$0 } from "./src/additional-resolvers";
import { defineConfig as defineGatewayConfig } from "@graphql-hive/gateway";
import dotenv from "dotenv";
dotenv.config();

let USER_SERVICE_URL = process.env.LOCAL_USER_SERVICE_URL;
let EXPENSE_SERVICE_URL = process.env.LOCAL_EXPENSE_SERVICE_URL;
if (process.env.IS_ENV === "PROD") {
  USER_SERVICE_URL = process.env.PROD_USER_SERVICE_URL;
  EXPENSE_SERVICE_URL = process.env.PROD_EXPENSE_SERVICE_URL;
}

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph("UserService", {
        endpoint: USER_SERVICE_URL || "",
        method: "POST",
        operationHeaders: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: "{context.headers.Authorization}",
          "X-Project-Token": "{context.headers.X-Project-Token}",
        },
        retry: 3,
        timeout: 10000,
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph("ExpenseService", {
        endpoint: EXPENSE_SERVICE_URL || "",
        method: "POST",
        operationHeaders: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: "{context.headers.Authorization}",
          "X-Project-Token": "{context.headers.X-Project-Token}",
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
