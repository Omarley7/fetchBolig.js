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
    sendJSON(res, { error: error.message }, 500);
  }
});

route("/api/threads", async (req, res) => {
  try {
    const apiData = await findboligClient.fetchThreads();
    sendJSON(res, apiData.results);
  } catch (error: any) {
    sendJSON(res, { error: error.message }, 500);
  }
});

route("/api/offers/position", async (req, res) => {
  try {
    const offerId = req.url?.split('?offerId=')[1];
    if (!offerId) {
      return sendJSON(res, { error: "Offer ID is required" }, 400);
    }
    const apiData = await findboligClient.getPositionOnOffer(offerId);
    sendJSON(res, apiData);
  } catch (error: any) {
    sendJSON(res, { error: error.message }, 500);
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
