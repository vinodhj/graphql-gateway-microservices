import { createMeshHTTPHandler } from "@graphql-mesh/http";
import { getMesh } from "@graphql-mesh/runtime";

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
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
      const handler = createMeshHTTPHandler({
        baseDir: ".",
        getBuiltMesh: customGetBuiltMesh,
        rawServeConfig: undefined,
      });

      // Handle the request
      return await handler.fetch(request, env, ctx);
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
