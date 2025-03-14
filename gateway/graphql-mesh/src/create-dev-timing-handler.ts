// Create a simple timing handler for development
export const createDevTimingHandler = (handler: any) => {
  return {
    fetch: async (request: Request, env: any, ctx: ExecutionContext) => {
      // Extract operation name if possible (only in dev, so we can accept the overhead)
      let operationName = "anonymous";
      if (request.method === "POST") {
        try {
          const clonedRequest = request.clone();
          const bodyText = await clonedRequest.text();
          const bodyJson = JSON.parse(bodyText) as { operationName?: string };
          operationName = bodyJson.operationName ?? "anonymous";
        } catch {
          // Ignore parsing errors
        }
      }

      const startTime = Date.now();

      // Execute the original handler
      const response = await handler.fetch(request, env, ctx);

      // Log execution time - simple and effective for development
      const duration = Date.now() - startTime;
      if (duration > 100) {
        // Highlight slow queries
        console.warn(`⚠️ SLOW QUERY: ${operationName} took ${duration}ms`);
      } else {
        console.log(`Query: ${operationName} execution took ${duration}ms`);
      }

      return response;
    },
  };
};
