import type { Express } from "express";

export const config = {
  maxDuration: 60,
};

let appPromise: Promise<Express> | undefined;

async function getApp() {
  appPromise ??= import("../apps/api/src/app.js").then(({ default: app }) => app);

  try {
    return await appPromise;
  } catch (error) {
    appPromise = undefined;
    throw error;
  }
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();

    await new Promise<void>((resolve, reject) => {
      res.on("finish", resolve);
      res.on("close", resolve);
      res.on("error", reject);
      app(req, res);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API startup error";
    console.error("Vercel API startup failed:", error);

    if (res.headersSent) {
      res.end();
      return;
    }

    return res.status(500).json({
      error: "API failed to initialize",
      details: message,
    });
  }
}
