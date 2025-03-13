import { createYoga } from "graphql-yoga";
import { wrapSchema } from "@graphql-tools/wrap";
import { stitchSchemas } from "@graphql-tools/stitch";
import { print, getIntrospectionQuery, buildClientSchema, DocumentNode, GraphQLSchema, OperationTypeNode } from "graphql";
import { delegateToSchema } from "@graphql-tools/delegate";
import DataLoader from "dataloader";

export interface Env {
  USER_SERVICE_URL: string;
  EXPENSE_SERVICE_URL: string;
  REQUEST_TIMEOUT_MS?: number;
  SCHEMA_CACHE_TTL_MS?: number;
}

// Add these interfaces
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  createdAt: string;
}

interface ExecutorParams {
  document: DocumentNode | string;
  variables?: Record<string, any>;
  context?: any;
  info?: any;
}

type RemoteExecutor = (params: ExecutorParams) => Promise<any>;

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
      const timeout = env.REQUEST_TIMEOUT_MS ?? 5000;
      const schemaCacheTtl = env.SCHEMA_CACHE_TTL_MS ?? 3600000; // Default 1 hour

      // Get authorization header from the original request
      const authHeader = request.headers.get("Authorization");

      // Create remote executors for each service
      const userServiceExecutor: RemoteExecutor = async ({ document, variables = {}, context }) => {
        const query = typeof document === "string" ? document : print(document);

        const headers = {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        };

        try {
          const response = await fetch(env.USER_SERVICE_URL, {
            method: "POST",
            headers,
            body: JSON.stringify({ query, variables }),
            signal: AbortSignal.timeout(timeout),
          });

          if (!response.ok) {
            throw new Error(`User service responded with status ${response.status}`);
          }

          return response.json();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          throw new Error(`User service error: ${message}`);
        }
      };

      const expenseServiceExecutor: RemoteExecutor = async ({ document, variables = {}, context }) => {
        const query = typeof document === "string" ? document : print(document);

        const headers = {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        };

        try {
          const response = await fetch(env.EXPENSE_SERVICE_URL, {
            method: "POST",
            headers,
            body: JSON.stringify({ query, variables }),
            signal: AbortSignal.timeout(timeout),
          });

          if (!response.ok) {
            throw new Error(`Expense service responded with status ${response.status}`);
          }

          return response.json();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          throw new Error(`Expense service error: ${message}`);
        }
      };

      // Create a function to introspect schemas manually
      async function fetchRemoteSchema(
        executor: RemoteExecutor,
        schemaCache: SchemaCache | null,
        cacheTtl: number,
      ): Promise<GraphQLSchema> {
        const now = Date.now();

        // Return cached schema if valid
        if (schemaCache && now - schemaCache.timestamp < cacheTtl) {
          return schemaCache.schema;
        }

        console.log("Schema cache miss or expired, fetching schema via introspection");

        const introspectionQuery = getIntrospectionQuery();
        const result = await executor({ document: introspectionQuery });
        if (result.errors) {
          throw new Error(`Schema introspection failed: ${JSON.stringify(result.errors)}`);
        }
        if (!result.data) {
          throw new Error("No data received during schema introspection");
        }
        const schema = buildClientSchema(result.data);
        return schema;
      }

      // Introspect the remote schemas
      const userServiceSchema = wrapSchema({
        schema: await fetchRemoteSchema(userServiceExecutor, userSchemaCache, schemaCacheTtl),
        executor: async ({ document, variables, context, info }) => {
          return userServiceExecutor({ document, variables, context, info });
        },
      });

      // Update the cache
      userSchemaCache = {
        schema: userServiceSchema,
        timestamp: Date.now(),
      };

      const expenseServiceSchema = wrapSchema({
        schema: await fetchRemoteSchema(expenseServiceExecutor, expenseSchemaCache, schemaCacheTtl),
        executor: async ({ document, variables, context, info }) => {
          return expenseServiceExecutor({ document, variables, context, info });
        },
      });

      // Update the cache
      expenseSchemaCache = {
        schema: expenseServiceSchema,
        timestamp: Date.now(),
      };

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
              async resolve(user, args, context, info) {
                // Create or get DataLoader from the context
                if (!context.expensesByUserLoader) {
                  context.expensesByUserLoader = new DataLoader(async (userIds: readonly string[]) => {
                    // For multiple IDs, use a batched query if the service supports it
                    try {
                      // Attempt to use a batch query if available
                      const result = await delegateToSchema({
                        schema: expenseServiceSchema,
                        operation: "query" as OperationTypeNode,
                        fieldName: "expensesByUserBatch",
                        args: { userIds: [...userIds] },
                        context,
                        info,
                      });
                      return result;
                    } catch (error) {
                      // Fallback to individual queries if batched query is not supported
                      console.log("Batched query not supported, falling back to individual queries");
                      const results = await Promise.all(
                        userIds.map((userId) =>
                          delegateToSchema({
                            schema: expenseServiceSchema,
                            operation: "query" as OperationTypeNode,
                            fieldName: "expensesByUser",
                            args: { userId },
                            context,
                            info,
                          }),
                        ),
                      );
                      return results;
                    }
                  });
                }

                // Use the DataLoader to batch or cache requests
                return context.expensesByUserLoader.load(user.id);
              },
            },
          },
          Expense: {
            user: {
              selectionSet: "{ userId }",
              async resolve(expense, args, context, info) {
                // Create or get DataLoader from the context
                if (!context.userLoader) {
                  context.userLoader = new DataLoader(async (userIds: readonly string[]) => {
                    // For a single ID, just delegate directly
                    if (userIds.length === 1) {
                      const user = await delegateToSchema({
                        schema: userServiceSchema,
                        operation: "query" as OperationTypeNode,
                        fieldName: "user",
                        args: { id: userIds[0] },
                        context,
                        info,
                      });
                      return [user];
                    }

                    // For multiple IDs, try to use a batch query
                    try {
                      const users = await delegateToSchema({
                        schema: userServiceSchema,
                        operation: "query" as OperationTypeNode,
                        fieldName: "usersByIds",
                        args: { ids: [...userIds] },
                        context,
                        info,
                      });

                      // Make sure we return results in the same order as the requested IDs
                      const userMap = new Map();
                      users.forEach((user: User) => userMap.set(user.id, user));
                      return userIds.map((id) => userMap.get(id));
                    } catch (error) {
                      // Fallback to individual queries
                      console.log("Batched user query not supported, falling back to individual queries");
                      const users = await Promise.all(
                        userIds.map((id) =>
                          delegateToSchema({
                            schema: userServiceSchema,
                            operation: "query" as OperationTypeNode,
                            fieldName: "user",
                            args: { id },
                            context,
                            info,
                          }),
                        ),
                      );
                      return users;
                    }
                  });
                }

                // Use the DataLoader to batch or cache requests
                return context.userLoader.load(expense.userId);
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
        plugins: [
          // Request tracing plugin
          {
            onExecute({ args }: { args: { operationName?: string } }) {
              const startTime = Date.now();
              const operationName = args.operationName ?? "anonymous";

              console.log(`Executing ${operationName} operation`);

              return {
                onExecuteDone({ result }: { result: any }) {
                  const duration = Date.now() - startTime;
                  console.log(`Query ${operationName} execution took ${duration}ms`);

                  // Add execution time to the extensions
                  if (!result.extensions) {
                    result.extensions = {};
                  }

                  result.extensions.executionTime = `${duration}ms`;
                },
              };
            },
          },
        ],
        // Create a new context with DataLoaders for each request
        context: () => ({
          // DataLoaders will be initialized in the resolvers
        }),
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
