// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.

describe("Hello World worker", () => {
  it("responds with Hello World! (unit style)", async () => {
    const request = new Request("http://example.com", {
      cf: {
        asn: 12345,
        asOrganization: "Example Org",
        colo: "ABC",
        edgeRequestKeepAliveStatus: 1,
        // Add other required properties here
      } as IncomingRequestCfProperties,
    });
    // Create an empty context to pass to `worker.fetch()`.
    const ctx = createExecutionContext();
    if (worker.fetch) {
      const response = await worker.fetch(request, env, ctx);
      // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
      await waitOnExecutionContext(ctx);
      expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
    } else {
      throw new Error("worker.fetch is undefined");
    }
  });

  it("responds with Hello World! (integration style)", async () => {
    const response = await SELF.fetch("https://example.com");
    expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
  });
});
