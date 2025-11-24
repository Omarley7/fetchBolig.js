import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import * as findboligClient from "./findbolig-client.js";
import { serve } from "@hono/node-server";

const app = new Hono();

app.notFound((c) => c.json({ error: "Not found", ok: false }, 404));
app.get("/*", serveStatic({ root: "../public" }));

const auth = new Hono();
const offers = new Hono();
const threads = new Hono();
const users = new Hono();
const residences = new Hono();

app.route("/api/auth", auth);
app.route("/api/offers", offers);
app.route("/api/threads", threads);
app.route("/api/users", users);
app.route("/api/models/residence", residences);

app.use("/api/*", cors(), logger(), prettyJSON());

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
    return c.json({ error: "Internal server error" }, 500);
  }
});

offers.get("/", async (c) => {
  try {
    const offers = await findboligClient.fetchOffers();
    return c.json(offers.results);
  } catch (error) {
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
    return c.json({ error: "Internal server error" }, 500);
  }
});

threads.get("/", async (c) => {
  try {
    const threads = await findboligClient.fetchThreads();
    return c.json(threads.results);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

users.get("/me", async (c) => {
  try {
    const user = await findboligClient.getUserData();
    return c.json(user);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

residences.get("/:residenceId", async (c) => {
  try {
    const residenceId = c.req.param("residenceId");
    const residence = await findboligClient.getResidence(residenceId);
    return c.json(residence);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

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
