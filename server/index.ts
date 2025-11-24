import "dotenv/config";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { prettyJSON } from "hono/pretty-json";
import * as findboligClient from "./findbolig-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = new Hono();

app.get("/*", serveStatic({ root: "./public" }));
app.get("/", (c) => {
  const htmlPath = path.join(__dirname, "../client/index.html");
  const html = fs.readFileSync(htmlPath, "utf-8");
  return c.html(html);
});
app.notFound((c) => c.json({ error: "Not found", ok: false }, 404));

const api = new Hono();

const auth = new Hono().basePath("/auth");
const offers = new Hono().basePath("/offers");
const threads = new Hono().basePath("/threads");
const users = new Hono().basePath("/users");
const residences = new Hono().basePath("/residence");
const appointments = new Hono().basePath("/appointments");

api.use("/*", cors(), logger(), prettyJSON());

appointments.get("/upcoming", async (c) => {
  try {
    const appointments = await findboligClient.getUpcomingAppointments();
    return c.json(appointments);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

auth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const success = await findboligClient.login(email, password);
    return c.json({ success });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

offers.get("/", async (c) => {
  try {
    const offers = await findboligClient.fetchOffers();
    return c.json(offers.results);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

offers.get("/:offerId/position", async (c) => {
  try {
    const offerId = c.req.param("offerId");
    if (!offerId) {
      return c.json({ error: "Offer ID is required" }, 400);
    }
    const position = await findboligClient.getPositionOnOffer(offerId);
    return c.json(position);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

threads.get("/", async (c) => {
  try {
    const threads = await findboligClient.fetchThreads();
    return c.json(threads.results);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

users.get("/me", async (c) => {
  try {
    const user = await findboligClient.getUserData();
    return c.json(user);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

residences.get("/:residenceId", async (c) => {
  try {
    const residenceId = c.req.param("residenceId");
    const residence = await findboligClient.getResidence(residenceId);
    return c.json(residence);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

api.route("/", auth);
api.route("/", offers);
api.route("/", threads);
api.route("/", users);
api.route("/", residences);
api.route("/", appointments);

app.route("/api", api);

const server = serve(app);
// graceful shutdown
process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
