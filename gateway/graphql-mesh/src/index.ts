import { createMeshHTTPHandler } from "@graphql-mesh/http";
import { getMesh } from "@graphql-mesh/runtime";
import { createDevTimingHandler } from "./create-dev-timing-handler";

export interface Env {
  USER_SERVICE_URL: string;
  EXPENSE_SERVICE_URL: string;
  WORKER_ENV: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const customGetBuiltMesh = async () => {
        // Import the mesh options but NOT the existing getBuiltMesh
        const { getMeshOptions } = await import("../.mesh");
        // Get fresh options
        const options = await getMeshOptions();
        // Create a new mesh instance directly
        return getMesh(options);
      };

      // Create a new handler using our custom function
      const meshHandler = createMeshHTTPHandler({
        baseDir: ".",
        getBuiltMesh: customGetBuiltMesh,
        rawServeConfig: undefined,
      });

      // Only add timing handler in development environment
      const isDevelopment = env.WORKER_ENV === "dev";

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
