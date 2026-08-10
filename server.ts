import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV || "production",
});

import { getSupabase } from "./src/server/db";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { authMiddleware } from "./src/server/auth";

// Import modular routers
import authRouter from "./src/server/routes/auth";
import clientsRouter from "./src/server/routes/clients";
import accountantsRouter from "./src/server/routes/accountants";
import walletRouter from "./src/server/routes/wallet";
import transactionsRouter from "./src/server/routes/transactions";
import profileRouter from "./src/server/routes/profile";
import settingsRouter from "./src/server/routes/settings";
import monitoringRouter from "./src/server/routes/monitoring";
import dashboardRouter from "./src/server/routes/dashboard";
import adminsRouter from "./src/server/routes/admins";
import attachmentsRouter from "./src/server/routes/attachments";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  if (!process.env.JWT_SECRET) {
    console.warn("⚠️ CRITICAL WARNING: JWT_SECRET environment variable is missing. Authentication APIs will fail until it is configured.");
  }
  const app = express();

  // Standard middleware configurations
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Register Auth Middleware
  



  



  app.use(authMiddleware);

  // Mount modular routing endpoints
  app.use(authRouter);
  app.use(clientsRouter);
  app.use(accountantsRouter);
  app.use(walletRouter);
  app.use(transactionsRouter);
  app.use(profileRouter);
  app.use(settingsRouter);
  app.use(monitoringRouter);
  app.use(dashboardRouter);
  app.use(adminsRouter);
  app.use(attachmentsRouter);

  Sentry.setupExpressErrorHandler(app);

  // Catch-all for unmatched API routes to prevent HTML responses
  app.use("/api/*", (req, res) => {
    res.status(404).json({ success: false, message: "API endpoint not found." });
  });

  // Vite middleware integration / Static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server startup failure:", err);
});
