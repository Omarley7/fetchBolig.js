import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import * as findboligClient from "~/findbolig-client.js";

const app = new Hono();

app.get("/*", serveStatic({ root: "../client/dist" }));

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
    const cookies = c.req.header("x-findbolig-cookies");
    if (!cookies) {
      return c.json({ error: "Authentication required" }, 401);
    }
    const appointments = await findboligClient.getUpcomingAppointments(cookies);
    return c.json(appointments);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

auth.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const result = await findboligClient.login(email, password);
    return c.json(result);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

offers.get("/", async (c) => {
  try {
    const cookies = c.req.header("x-findbolig-cookies");
    if (!cookies) {
      return c.json({ error: "Authentication required" }, 401);
    }
    const offers = await findboligClient.fetchOffers(cookies);
    return c.json(offers.results);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

offers.get("/:offerId/position", async (c) => {
  try {
    const cookies = c.req.header("x-findbolig-cookies");
    if (!cookies) {
      return c.json({ error: "Authentication required" }, 401);
    }
    const offerId = c.req.param("offerId");
    if (!offerId) {
      return c.json({ error: "Offer ID is required" }, 400);
    }
    const position = await findboligClient.getPositionOnOffer(offerId, cookies);
    return c.json(position);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

threads.get("/", async (c) => {
  try {
    const cookies = c.req.header("x-findbolig-cookies");
    if (!cookies) {
      return c.json({ error: "Authentication required" }, 401);
    }
    const threads = await findboligClient.fetchThreads(cookies);
    return c.json(threads.results);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

users.get("/me", async (c) => {
  try {
    const cookies = c.req.header("x-findbolig-cookies");
    if (!cookies) {
      return c.json({ error: "Authentication required" }, 401);
    }
    const user = await findboligClient.getUserData(cookies);
    return c.json(user);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

residences.get("/:residenceId", async (c) => {
  try {
    const cookies = c.req.header("x-findbolig-cookies");
    if (!cookies) {
      return c.json({ error: "Authentication required" }, 401);
    }
    const residenceId = c.req.param("residenceId");
    const residence = await findboligClient.getResidence(residenceId, cookies);
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

const server = serve(app, (info) => {
  console.log(`Server is running on ${info.address}:${info.port}`);
});

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
