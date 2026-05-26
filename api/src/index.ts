import "./config/env.js"; // Load environment variables first!
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./modules/auth/auth.js";
import { ENV } from "./config/env.js";

import { prisma } from "./modules/auth/services/db.service.js";

import {
  deleteDocumentHandler,
  ragRouter,
} from "./modules/rag/rag.controller.js";
import { internalRouter } from "./modules/documents/document.internal.controller.js";
import { chatRouter } from "./modules/chat/chat.controller.js";
import { lecturerAdminRouter } from "./modules/auth/lecturer.controller.js";
import { subscriptionRouter } from "./modules/subscriptions/subscription.controller.js";

export const app = new Hono();

// Basic CORS setup for local development
app.use(
  "*",
  cors({
    origin: (origin) => origin, // Reflect origin
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    credentials: true,
  }),
);

// Serve uploaded documents statically from ./uploads directory
app.use("/uploads/*", serveStatic({ root: "./" }));

// Mount API modules
app.route("/api/courses", ragRouter);
app.route("/api/internal", internalRouter);
app.route("/api/chat", chatRouter);
app.route("/api/auth-admin", lecturerAdminRouter);
app.route("/api/subscriptions", subscriptionRouter);

app.delete(
  "/api/courses/:courseId/documents/:documentId",
  deleteDocumentHandler,
);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// Detailed Health Check API
app.get("/api/health", async (c) => {
  const start = performance.now();
  let dbStatus = "UP";
  let dbLatency = 0;
  let dbError: string | null = null;

  try {
    // Run simple SELECT 1 query to check DB availability and measure latency
    const dbStart = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Math.round(performance.now() - dbStart);
  } catch (err: any) {
    dbStatus = "DOWN";
    dbError = err.message || String(err);
  }

  const uptime = process.uptime();
  const memory = process.memoryUsage();
  const status = dbStatus === "UP" ? "UP" : "DOWN";
  const statusCode = status === "UP" ? 200 : 503;

  return c.json(
    {
      status,
      timestamp: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - start),
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbStatus === "UP" ? dbLatency : undefined,
          error: dbError || undefined,
        },
      },
      system: {
        uptimeSeconds: Math.round(uptime * 100) / 100,
        memoryUsage: {
          rss: `${Math.round((memory.rss / 1024 / 1024) * 100) / 100} MB`,
          heapTotal: `${Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100} MB`,
          heapUsed: `${Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100} MB`,
          external: `${Math.round((memory.external / 1024 / 1024) * 100) / 100} MB`,
        },
        nodeVersion: process.version,
        platform: process.platform,
      },
    },
    statusCode,
  );
});

// Mount Better Auth endpoints (SignUp, SignIn, Org management, Admin, OpenAPI UI etc.)
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

serve(
  {
    fetch: app.fetch,
    port: ENV.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
