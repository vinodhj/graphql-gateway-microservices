import { createMeshHTTPHandler } from "@graphql-mesh/http";
import { getMesh } from "@graphql-mesh/runtime";
import { createDevTimingHandler } from "./create-dev-timing-handler";
import { GraphQLError } from "graphql";

export interface Env {
  USER_SERVICE_URL: string;
  EXPENSE_SERVICE_URL: string;
  WORKER_ENV: string;
  USER_SERVICE_WORKER: Fetcher;
  EXPENSE_SERVICE_WORKER: Fetcher;
}

interface Fetcher {
  fetch: typeof fetch;
}
/*
 * Cloudflare Workers free plan limitations (1,000 requests per minute burst limit and 100,000 daily quota)
 * The rate limiting implementation is based on the token bucket algorithm
 * The bucket capacity is 20 tokens and the refill rate is 13.33 tokens per second (800 tokens per minute)
 * The rate limiting is applied per client IP address
 * In-memory storage for rate limiting is used
 */
const ipBuckets = new Map();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    try {
      // Rate limiting
      const clientIP = request.headers.get("CF-Connecting-IP");
      if (!clientIP) {
        return new Response("Client IP not detected", { status: 403 });
      }

      console.log(`Client IP: ${clientIP}`);

      // Configuration
      const BUCKET_CAPACITY = 20; // Maximum burst size
      const REFILL_RATE = 13.33; // Tokens per second (800/60)

      // Get or create bucket
      let bucket = ipBuckets.get(clientIP);
      if (!bucket) {
        bucket = { tokens: BUCKET_CAPACITY, lastRefill: Date.now() };
        ipBuckets.set(clientIP, bucket);
      }

      console.log(`Tokens: ${bucket.tokens}`);

      // Refill tokens based on time elapsed
      const now = Date.now();
      const secondsElapsed = (now - bucket.lastRefill) / 1000;
      bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + secondsElapsed * REFILL_RATE);
      bucket.lastRefill = now;

      console.log(`Tokens after refill: ${bucket.tokens}`);

      // Check if rate limited
      if (bucket.tokens < 1) {
        // Add some logging for your POC
        console.log(`Rate limited IP: ${clientIP}`);

        return new Response(
          JSON.stringify({
            error: "Too many requests. Please try again later.",
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "5",
            },
          },
        );
      }

      // Consume a token
      bucket.tokens -= 1;

      const isDevelopment = env.WORKER_ENV === "dev";
      console.log(`Running in ${isDevelopment ? "development" : "production"} mode`);
      console.log(`User service URL: ${env.USER_SERVICE_URL}`);
      console.log(`Expense service URL: ${env.EXPENSE_SERVICE_URL}`);

      const customGetBuiltMesh = async () => {
        // Import the mesh options but NOT the existing getBuiltMesh
        const { getMeshOptions } = await import("../.mesh");
        // Get fresh options
        const options = await getMeshOptions();

        // Override the sources' fetch functions with service bindings
        // This is the key part that makes service bindings work
        if (options.sources && Array.isArray(options.sources)) {
          for (const source of options.sources) {
            if (source.name === "UserService" && env.USER_SERVICE_WORKER) {
              // @ts-ignore - we're modifying the handler configuration at runtime
              source.handler.config = source.handler.config || {};
              // @ts-ignore - attach the service binding's fetch method
              source.handler.config.fetch = env.USER_SERVICE_WORKER.fetch.bind(env.USER_SERVICE_WORKER);
            }

            if (source.name === "ExpenseService" && env.EXPENSE_SERVICE_WORKER) {
              // @ts-ignore - we're modifying the handler configuration at runtime
              source.handler.config = source.handler.config || {};
              // @ts-ignore - attach the service binding's fetch method
              source.handler.config.fetch = env.EXPENSE_SERVICE_WORKER.fetch.bind(env.EXPENSE_SERVICE_WORKER);
            }
          }
        }

        if (isDevelopment) {
          // Only add timing plugin in development
          options.additionalEnvelopPlugins = options.additionalEnvelopPlugins || [];
          options.additionalEnvelopPlugins.push({
            onExecute({ args }) {
              const startTime = Date.now();
              const operationName = args.operationName ?? "anonymous";
              const { variableValues } = args;

              // Log operation start
              console.log(`Executing operation: ${operationName}`, {
                variables: variableValues || {},
              });

              return {
                onExecuteDone() {
                  const duration = Date.now() - startTime;
                  console.log(`Actual GraphQL execution time from plugin Query : ${operationName} execution took ${duration}ms`);
                },
                onExecuteError({ error }: { error: GraphQLError }) {
                  const duration = Date.now() - startTime;
                  console.error(`Error in ${operationName} after ${duration}ms:`, error);
                  console.error("Error Stack:", error.stack);

                  // GraphQLError often contains an originalError property but it's not in the type
                  // So we need to handle it with type assertion
                  const gqlError = error as GraphQLError & { originalError?: Error };
                  if (gqlError.originalError) {
                    console.error("Original Error:", gqlError.originalError);
                  }
                },
              };
            },
          });
        }

        // Create a new mesh instance directly
        return getMesh(options);
      };

      // Create a new handler using our custom function
      const meshHandler = createMeshHTTPHandler({
        baseDir: ".",
        getBuiltMesh: customGetBuiltMesh,
        rawServeConfig: {
          cors: {
            origin: "*",
            credentials: true,
          },
          playground: true,
        },
      });

      // Use the timing handler in development, raw handler in production
      const handlerToUse = isDevelopment ? createDevTimingHandler(meshHandler) : meshHandler;

      // Handle the request
      return await handlerToUse.fetch(request, env, ctx);
    } catch (error) {
      console.error("Mesh error:", error);

      return new Response(
        JSON.stringify({
          errors: [
            {
              message: error instanceof Error ? error.message : "Unknown error occurred",
              stack: error instanceof Error ? error.stack : undefined,
              type: error instanceof Error ? error.constructor.name : typeof error,
            },
          ],
          data: null,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }
  },
};
