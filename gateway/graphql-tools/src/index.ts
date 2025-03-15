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
  pending?: Promise<GraphQLSchema>;
}

// Schema caches
let userSchemaCache: SchemaCache | null = null;
let expenseSchemaCache: SchemaCache | null = null;
let stitchedSchemaCache: {
  schema: GraphQLSchema;
  userTimestamp: number;
  expenseTimestamp: number;
} | null = null;

function createExecutor(serviceUrl: string, serviceName: string, timeout: number, authHeader: string | null): RemoteExecutor {
  return async ({ document, variables = {} }) => {
    const query = typeof document === "string" ? document : print(document);
    const headers = {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    const response = await fetch(serviceUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`${serviceName} service responded with status ${response.status}`);
    }

    return response.json();
  };
}

async function fetchRemoteSchema(
  executor: RemoteExecutor,
  cache: SchemaCache | null,
  cacheTtl: number,
  serviceName: string,
): Promise<GraphQLSchema> {
  const now = Date.now();

  if (cache && now - cache.timestamp < cacheTtl) {
    return cache.schema;
  }

  if (cache?.pending) {
    return cache.pending;
  }

  const pendingPromise = (async () => {
    console.log(`Fetching fresh schema for ${serviceName}`);
    const result = await executor({ document: getIntrospectionQuery() });

    if (result.errors) {
      throw new Error(`${serviceName} schema error: ${JSON.stringify(result.errors)}`);
    }

    return buildClientSchema(result.data);
  })();

  if (cache) {
    cache.pending = pendingPromise;
  }

  try {
    const schema = await pendingPromise;
    return schema;
  } finally {
    if (cache) {
      cache.pending = undefined;
    }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const timeout = env.REQUEST_TIMEOUT_MS ?? 5000;
      const schemaCacheTtl = env.SCHEMA_CACHE_TTL_MS ?? 3600000; // Default 1 hour
      const authHeader = request.headers.get("Authorization");

      // Create executors
      const userExecutor = createExecutor(env.USER_SERVICE_URL, "User", timeout, authHeader);
      const expenseExecutor = createExecutor(env.EXPENSE_SERVICE_URL, "Expense", timeout, authHeader);

      // Fetch schemas with concurrency control
      const [userSchemaResult, expenseSchemaResult] = await Promise.all([
        fetchRemoteSchema(userExecutor, userSchemaCache, schemaCacheTtl, "User"),
        fetchRemoteSchema(expenseExecutor, expenseSchemaCache, schemaCacheTtl, "Expense"),
      ]);

      // Update schema caches
      const now = Date.now();
      userSchemaCache = { schema: userSchemaResult, timestamp: now };
      expenseSchemaCache = { schema: expenseSchemaResult, timestamp: now };

      // Create wrapped schemas
      const userServiceSchema = wrapSchema({
        schema: userSchemaResult,
        executor: userExecutor,
      });

      const expenseServiceSchema = wrapSchema({
        schema: expenseSchemaResult,
        executor: expenseExecutor,
      });

      // Stitch the schemas together with Cache
      if (
        !stitchedSchemaCache ||
        stitchedSchemaCache.userTimestamp !== userSchemaCache.timestamp ||
        stitchedSchemaCache.expenseTimestamp !== expenseSchemaCache.timestamp
      ) {
        stitchedSchemaCache = {
          schema: stitchSchemas({
            subschemas: [userServiceSchema, expenseServiceSchema],
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
                  resolve(user, _, context, info) {
                    if (!context.expensesByUserLoader) {
                      context.expensesByUserLoader = new DataLoader(async (userIds: readonly string[]) => {
                        try {
                          const result = await delegateToSchema({
                            schema: expenseServiceSchema,
                            operation: "query" as OperationTypeNode,
                            fieldName: "expensesByUserBatch",
                            args: { userIds },
                            context,
                            info,
                          });

                          // Group expenses by user ID
                          const expenseMap = new Map<string, Expense[]>();
                          (result as Expense[]).forEach((expense) => {
                            const list = expenseMap.get(expense.userId) || [];
                            list.push(expense);
                            expenseMap.set(expense.userId, list);
                          });

                          return userIds.map((id) => expenseMap.get(id) || []);
                        } catch (error) {
                          console.log("Batch load failed, falling back to single queries");
                          return Promise.all(
                            userIds.map((id) =>
                              delegateToSchema({
                                schema: expenseServiceSchema,
                                operation: "query" as OperationTypeNode,
                                fieldName: "expensesByUser",
                                args: { userId: id },
                                context,
                                info,
                              }),
                            ),
                          );
                        }
                      });
                    }
                    return context.expensesByUserLoader.load(user.id);
                  },
                },
              },
              Expense: {
                user: {
                  selectionSet: "{ userId }",
                  resolve(expense, _, context, info) {
                    if (!context.userLoader) {
                      context.userLoader = new DataLoader(async (userIds: readonly string[]) => {
                        try {
                          const users = (await delegateToSchema({
                            schema: userServiceSchema,
                            operation: "query" as OperationTypeNode,
                            fieldName: "usersByIds",
                            args: { ids: userIds },
                            context,
                            info,
                          })) as User[];

                          const userMap = new Map(users.map((u) => [u.id, u]));
                          return userIds.map((id) => userMap.get(id));
                        } catch (error) {
                          console.log("Batch user load failed, falling back to single queries");
                          return Promise.all(
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
                        }
                      });
                    }
                    return context.userLoader.load(expense.userId);
                  },
                },
              },
            },
          }),
          userTimestamp: userSchemaCache.timestamp,
          expenseTimestamp: expenseSchemaCache.timestamp,
        };
      }

      // Create and set up the GraphQL Yoga server
      const yoga = createYoga({
        schema: stitchedSchemaCache.schema,
        graphiql: true,
        landingPage: false,
        plugins: [
          // Request tracing plugin
          {
            onExecute({ args }: { args: { operationName?: string } }) {
              const startTime = Date.now();
              const operationName = args.operationName ?? "anonymous";

              return {
                onExecuteDone({ result }: { result: any }) {
                  const duration = Date.now() - startTime;
                  result.extensions = { ...result.extensions, executionTime: `${duration}ms` };
                  console.log(`Query ${operationName} execution took ${duration}ms`);
                },
              };
            },
          },
        ],
        context: () => ({}),
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
