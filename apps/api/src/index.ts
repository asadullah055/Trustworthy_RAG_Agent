import { env } from "./config.js";
import app from "./app.js";

app.listen(env.PORT, () => {
  console.log(`Trustworthy RAG API listening on http://localhost:${env.PORT}`);
});
