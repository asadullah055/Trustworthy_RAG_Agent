export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  try {
    const { createApp } = await import("../apps/api/src/app.js");
    return createApp()(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API startup error";
    console.error("Vercel API startup failed:", error);

    return res.status(500).json({
      error: "API failed to initialize",
      details: message,
    });
  }
}
