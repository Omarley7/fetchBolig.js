import "dotenv/config";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import * as findboligClient from "./findbolig-client.js";
import {
  makeServeStatic,
  parseBody,
  sendHTML,
  sendJSON,
} from "./http-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

type Handler = (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => void | Promise<void>;

const routes: Map<string, Handler> = new Map();
const route = (urlPath: string, handler: Handler) =>
  routes.set(urlPath, handler);

route("/", async (req, res) => {
  const htmlPath = path.join(__dirname, "../client/index.html");
  const html = fs.readFileSync(htmlPath, "utf-8");
  sendHTML(res, html);
});

route("/api/auth/login", async (req, res) => {
  const body = await parseBody(req);
  const { email, password } = body;

  if (!email || !password) {
    return sendJSON(
      res,
      { success: false, message: "Email and password required" },
      400
    );
  }

  const success = await findboligClient.login(email, password);

  if (success) sendJSON(res, { success: true, message: "Login successful" });
  else sendJSON(res, { success: false, message: "Login failed" }, 401);
});

route("/api/offers", async (req, res) => {
  try {
    const apiData = await findboligClient.fetchOffers();
    sendJSON(res, apiData.results);
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    sendJSON(res, { error: error.message }, status);
  }
});

route("/api/threads", async (req, res) => {
  try {
    const apiData = await findboligClient.fetchThreads();
    sendJSON(res, apiData.results);
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    sendJSON(res, { error: error.message }, status);
  }
});

// Combined update route: fetch both offers and threads
route("/api/update", async (req, res) => {
  try {
    const [offersPage, threadsPage] = await Promise.all([
      findboligClient.fetchOffers(),
      findboligClient.fetchThreads(),
    ]);
    sendJSON(res, { offers: offersPage.results, threads: threadsPage.results });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    sendJSON(res, { error: error.message }, status);
  }
});

// Login modal fragment route
route("/login", async (req, res) => {
  const htmlPath = path.join(__dirname, "../client/login/index.html");
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, "utf-8");
    sendHTML(res, html);
  } else {
    sendHTML(res, "<div>Login form not found</div>");
  }
});

const serveStatic = makeServeStatic(path.join(__dirname, "../public"));
const server = http.createServer(async (req, res) => {
  const url = req.url || "/";

  const handler = routes.get(url);
  if (handler) {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error("Handler error:", error);
      sendJSON(res, { error: error.message }, 500);
    }
    return;
  }

  if (url.startsWith("/dist/") || url.startsWith("/htmx")) {
    serveStatic(req, res);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`🌼 Server running at http://localhost:${PORT}`);
});
