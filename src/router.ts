import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { dispatchRPC } from "./rpc";
import type { Env } from "./types";

/**
 * Builds the Hono router for the REST and HTTP-RPC endpoints.
 * @returns An instance of the Hono router.
 */
export function buildRouter() {
  const app = new Hono<{ Bindings: Env }>();

  // Add CORS middleware, allowing requests only from the specified origin.
  // In a production app, you would configure this more securely.
  app.use(
    "/api/*",
    cors({
      origin: "*", // Allow all origins for this example
    })
  );

  // Add a simple health check endpoint.
  app.get("/", (c) => {
    return c.json({
      ok: true,
      ts: new Date().toISOString(),
      version: "1.0.0",
    });
  });

  // REST endpoint for creating a task.
  app.post("/api/tasks", async (c) => {
    try {
      const body = await c.req.json();
      const res = await dispatchRPC("createTask", body, c.env, c.executionCtx);
      return c.json(res);
    } catch (e: any) {
      return c.json({ success: false, error: e.message, details: e.issues }, 400);
    }
  });

  // REST endpoint for listing tasks.
  app.get("/api/tasks", async (c) => {
    const res = await dispatchRPC("listTasks", null, c.env, c.executionCtx);
    return c.json(res);
  });

  // REST endpoint for running analysis.
  app.post("/api/analyze", async (c) => {
    try {
      const body = await c.req.json();
      const res = await dispatchRPC("runAnalysis", body, c.env, c.executionCtx);
      return c.json(res);
    } catch (e: any) {
      return c.json({ success: false, error: e.message, details: e.issues }, 400);
    }
  });

  // A dedicated endpoint for HTTP-based RPC calls.
  // This is useful for testing and for clients that don't use REST.
  app.post("/rpc", async (c) => {
    try {
      const { method, params } = await c.req.json<{ method: string, params: unknown }>();
      const result = await dispatchRPC(method, params, c.env, c.executionCtx);
      return c.json({ success: true, result });
    } catch (e: any) {
      const isZodError = e instanceof z.ZodError;
      return c.json(
        {
          success: false,
          error: e?.message ?? "RPC error",
          details: isZodError ? e.issues : undefined,
        },
        400
      );
    }
  });

  return app;
}
