import "dotenv/config";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import { fetch as undiciFetch } from "undici";
import type { ApiOffersPage } from "../shared/types/offers.js";
import type { ApiMessageThreadsPage } from "../shared/types/threads.js";

// Disable TLS verification for development (remove in production)
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const jar = new CookieJar();
const fetch = fetchCookie(undiciFetch, jar);

const BASE_URL = "https://findbolig.nu";

/**
 * Performs initial GET and login to establish authenticated session
 */
export async function login(email: string, password: string): Promise<boolean> {
  try {
    // Initial GET to receive __Secure-SID cookie
    await fetch(BASE_URL, { redirect: "follow" });

    // Perform login
    const res = await fetch(`${BASE_URL}/api/authentication/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    return res.ok;
  } catch (error) {
    console.error("Login failed:", error);
    return false;
  }
}

/**
 * Fetches offers from the API (requires prior authentication)
 */
export async function fetchOffers(): Promise<ApiOffersPage> {
  const res = await fetch(`${BASE_URL}/api/search/offers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      search: null,
      filters: {},
      pageSize: 2147483647,
      page: 0,
      orderDirection: "desc",
      orderBy: "created",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch offers: ${res.status}`);
  }

  return (await res.json()) as ApiOffersPage;
}

/**
 * Fetches message threads from the API (requires prior authentication)
 */
export async function fetchThreads(): Promise<ApiMessageThreadsPage> {
  const res = await fetch(`${BASE_URL}/api/communications/threads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      page: 0,
      pageSize: 100,
      orderDirection: "DESC",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch threads: ${res.status}`);
  }

  return (await res.json()) as ApiMessageThreadsPage;
}
