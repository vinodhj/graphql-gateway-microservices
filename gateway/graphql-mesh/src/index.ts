import { createMeshHTTPHandler } from "@graphql-mesh/http";
import { getMesh } from "@graphql-mesh/runtime";
import { createDevTimingHandler } from "./create-dev-timing-handler";
import { GraphQLError } from "graphql";

export interface Env {
  USER_SERVICE_URL: string;
  EXPENSE_SERVICE_URL: string;
  WORKER_ENV: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const isDevelopment = env.WORKER_ENV === "dev";
      const customGetBuiltMesh = async () => {
        // Import the mesh options but NOT the existing getBuiltMesh
        const { getMeshOptions } = await import("../.mesh");
        // Get fresh options
        const options = await getMeshOptions();

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
        rawServeConfig: undefined,
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
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
