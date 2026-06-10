import { env } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();
app.listen(env.PORT, () => {
  console.log(`Trustworthy RAG API listening on http://localhost:${env.PORT}`);
});
