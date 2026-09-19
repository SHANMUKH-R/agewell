import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { DomainError } from "./lib/agewell-store";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const error = err as { name?: string; status?: number; message?: string };
  if (err instanceof DomainError) { res.status(err.status).json({ error: err.message }); return; }
  if (error.name === "ZodError") { res.status(400).json({ error: "Invalid request or response shape. Check the API contract." }); return; }
  if (error.status === 413) { res.status(413).json({ error: "Request exceeds the 5 MB limit." }); return; }
  if (error.status === 400) { res.status(400).json({ error: "Malformed JSON request." }); return; }
  req.log.error({ error: error.message }, "AgeWell request failed");
  res.status(500).json({ error: "Unable to complete this request." });
});

export default app;
