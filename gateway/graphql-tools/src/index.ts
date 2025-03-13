import { createYoga } from "graphql-yoga";
import { wrapSchema } from "@graphql-tools/wrap";
import { stitchSchemas } from "@graphql-tools/stitch";
import { print, getIntrospectionQuery, buildClientSchema, DocumentNode, GraphQLSchema, OperationTypeNode } from "graphql";
import { delegateToSchema } from "@graphql-tools/delegate";

export interface Env {
  USER_SERVICE_URL: string;
  EXPENSE_SERVICE_URL: string;
  REQUEST_TIMEOUT_MS?: number;
  SCHEMA_CACHE_TTL_MS?: number;
}

interface ExecutorParams {
  document: DocumentNode | string;
  variables?: Record<string, any>;
  context?: any;
  info?: any;
}

type RemoteExecutor = (params: ExecutorParams) => Promise<any>;

// Custom executor type that matches our implementation
type CustomExecutor = (params: { document: string | DocumentNode; variables?: Record<string, any> }) => Promise<any>;

// Schema cache with timestamps
interface SchemaCache {
  schema: GraphQLSchema;
  timestamp: number;
}

// Schema caches
let userSchemaCache: SchemaCache | null = null;
let expenseSchemaCache: SchemaCache | null = null;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Create remote executors for each service
      const userServiceExecutor: CustomExecutor = async ({ document, variables = {} }) => {
        const query = typeof document === "string" ? document : print(document);
        const response = await fetch(env.USER_SERVICE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables }),
        });
        if (!response.ok) {
          throw new Error(`User service responded with status ${response.status}`);
        }
        return response.json();
      };

      const expenseServiceExecutor: CustomExecutor = async ({ document, variables = {} }) => {
        const query = typeof document === "string" ? document : print(document);
        const response = await fetch(env.EXPENSE_SERVICE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables }),
        });
        if (!response.ok) {
          throw new Error(`Expense service responded with status ${response.status}`);
        }
        return response.json();
      };

      // Create a function to introspect schemas manually
      async function fetchRemoteSchema(executor: CustomExecutor): Promise<GraphQLSchema> {
        const introspectionQuery = getIntrospectionQuery();
        const result = await executor({ document: introspectionQuery });
        if (result.errors) {
          throw new Error(`Schema introspection failed: ${JSON.stringify(result.errors)}`);
        }
        if (!result.data) {
          throw new Error("No data received during schema introspection");
        }
        return buildClientSchema(result.data);
      }

      // Introspect the remote schemas
      const userServiceSchema = wrapSchema({
        schema: await fetchRemoteSchema(userServiceExecutor),
        executor: async (executionParams) => {
          return userServiceExecutor({
            document: executionParams.document,
            variables: executionParams.variables,
          });
        },
      });

      const expenseServiceSchema = wrapSchema({
        schema: await fetchRemoteSchema(expenseServiceExecutor),
        executor: async (executionParams) => {
          return expenseServiceExecutor({
            document: executionParams.document,
            variables: executionParams.variables,
          });
        },
      });

      // Stitch the schemas together
      const schema = stitchSchemas({
        subschemas: [{ schema: userServiceSchema }, { schema: expenseServiceSchema }],
        typeDefs: `
          extend type User {
            expenses: [Expense!]!
          }
          
          extend type Expense {
            user: User!
          }
        `,
        resolvers: {
          User: {
            expenses: {
              selectionSet: "{ id }",
              resolve(user, args, context, info) {
                // Using the older-style delegation pattern which is more compatible
                return delegateToSchema({
                  schema: expenseServiceSchema,
                  operation: "query" as OperationTypeNode,
                  fieldName: "expensesByUser",
                  args: { userId: user.id },
                  context,
                  info,
                });
              },
            },
          },
          Expense: {
            user: {
              selectionSet: "{ userId }",
              resolve(expense, args, context, info) {
                // Using the older-style delegation pattern which is more compatible
                return delegateToSchema({
                  schema: userServiceSchema,
                  operation: "query" as OperationTypeNode,
                  fieldName: "user",
                  args: { id: expense.userId },
                  context,
                  info,
                });
              },
            },
          },
        },
      });

      // Create and set up the GraphQL Yoga server
      const yoga = createYoga({
        schema,
        graphiql: true,
        landingPage: false,
      });

      // Handle the request
      return yoga.fetch(request, env);
    } catch (error: unknown) {
      console.error("Gateway error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: errorMessage,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
  },
};
