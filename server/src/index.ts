import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import * as findboligService from "~/findbolig-service";
import { TimeoutError } from "~/findbolig-service";
import { requireAuth } from "~/lib/auth-helpers";
import type { Context } from "hono";

function handleError(c: Context, error: unknown) {
  console.error(error);
  if (error instanceof TimeoutError) {
    return c.json({ error: "timeout", message: "findbolig.nu is not responding" }, 504);
  }
  return c.json({ error: "Internal server error" }, 500);
}

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
    const cookies = requireAuth(c);
    if (cookies instanceof Response) return cookies;

    const includeAll = c.req.query("includeAll") === "true";
    const appointments = await findboligService.getUpcomingAppointments(
      cookies,
      includeAll
    );
    return c.json(appointments);
  } catch (error) {
    return handleError(c, error);
  }
});

auth.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const result = await findboligService.login(email, password);
    return c.json(result);
  } catch (error) {
    return handleError(c, error);
  }
});

auth.get("/refresh", async (c) => {
  try {
    const cookies = requireAuth(c);
    if (cookies instanceof Response) return cookies;

    const result = await findboligService.refreshSession(cookies);
    if (!result) {
      return c.json({ error: "Failed to refresh session" }, 401);
    }
    return c.json(result);
  } catch (error) {
    return handleError(c, error);
  }
});

offers.get("/", async (c) => {
  try {
    const cookies = requireAuth(c);
    if (cookies instanceof Response) return cookies;

    const offers = await findboligService.fetchOffers(cookies);
    return c.json(offers.results);
  } catch (error) {
    return handleError(c, error);
  }
});

offers.get("/:offerId/position", async (c) => {
  try {
    const cookies = requireAuth(c);
    if (cookies instanceof Response) return cookies;

    const offerId = c.req.param("offerId");
    if (!offerId) {
      return c.json({ error: "Offer ID is required" }, 400);
    }
    const position = await findboligService.getPositionOnOffer(
      offerId,
      cookies
    );
    return c.json(position);
  } catch (error) {
    return handleError(c, error);
  }
});

threads.get("/", async (c) => {
  try {
    const cookies = requireAuth(c);
    if (cookies instanceof Response) return cookies;

    const threads = await findboligService.fetchThreads(cookies);
    return c.json(threads.results);
  } catch (error) {
    return handleError(c, error);
  }
});

users.get("/me", async (c) => {
  try {
    const cookies = requireAuth(c);
    if (cookies instanceof Response) return cookies;

    const user = await findboligService.getUserData(cookies);
    return c.json(user);
  } catch (error) {
    return handleError(c, error);
  }
});

residences.get("/:residenceId", async (c) => {
  try {
    const cookies = requireAuth(c);
    if (cookies instanceof Response) return cookies;

    const residenceId = c.req.param("residenceId");
    const residence = await findboligService.getResidence(residenceId, cookies);
    return c.json(residence);
  } catch (error) {
    return handleError(c, error);
  }
});

api.route("/", auth);
api.route("/", offers);
api.route("/", threads);
api.route("/", users);
api.route("/", residences);
api.route("/", appointments);

app.route("/api", api);

// SPA fallback: serve index.html for any unmatched routes so client-side routing works on refresh
app.get("*", serveStatic({ root: "../client/dist", rewriteRequestPath: () => "/index.html" }));

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
