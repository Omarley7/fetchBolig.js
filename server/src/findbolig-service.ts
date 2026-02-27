import "dotenv/config";

import { UserData } from "@/types";
import { apiResidenceToDomain, apiUserDataToDomain, mapAppointmentToDomain } from "~/lib/findbolig-domain";
import type { ApiOffersPage, ApiUserData } from "~/types/offers";
import type { ApiResidence } from "~/types/residences";
import type {
  ApiMessageThreadFull,
  ApiMessageThreadsPage,
} from "~/types/threads";
import { extractAppointmentDetailsWithLLM } from "./lib/llm/openai-extractor";

// Disable TLS verification for development (remove in production)
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const BASE_URL = "https://findbolig.nu";

// Timeout constants (milliseconds)
const TIMEOUT_LOGIN = 10_000;     // 10s – user is waiting on a modal
const TIMEOUT_REFRESH = 10_000;   // 10s – background session check
const TIMEOUT_DATA = 20_000;      // 20s – heavier data fetches

export class TimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs / 1000}s`);
    this.name = "TimeoutError";
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new TimeoutError(url, timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Performs initial GET and login to establish authenticated session
 * Returns the Set-Cookie headers if successful
 */
export async function login(
  email: string,
  password: string,
): Promise<UserData | null> {
  try {
    // Initial GET to receive __Secure-SID cookie
    const initialRes = await fetchWithTimeout(BASE_URL, { redirect: "follow" }, TIMEOUT_LOGIN);
    const initialCookies = initialRes.headers.getSetCookie();

    // Perform login with initial cookies
    const cookieHeader = initialCookies.join("; ");
    const res = await fetchWithTimeout(`${BASE_URL}/api/authentication/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      body: JSON.stringify({ email, password }),
    }, TIMEOUT_LOGIN);

    if (!res.ok) {
      return null;
    }
    // Combine cookies from both requests
    return apiUserDataToDomain(await res.json() as ApiUserData, [...initialCookies, ...res.headers.getSetCookie()]);

  } catch (error) {
    console.error("Login failed:", error);
    return null;
  }
}

/**
 * Fetches offers from the API (requires prior authentication)
 */
export async function fetchOffers(cookies: string): Promise<ApiOffersPage> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/search/offers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: cookies,
    },
    body: JSON.stringify({
      search: null,
      filters: {},
      pageSize: 2147483647,
      page: 0,
      orderDirection: "desc",
      orderBy: "created",
    }),
  }, TIMEOUT_DATA);

  if (!res.ok) {
    throw new Error(`Failed to fetch offers: ${res.status}`);
  }

  return (await res.json()) as ApiOffersPage;
}

/**
 * Fetches message threads from the API (requires prior authentication)
 */
export async function fetchThreads(
  cookies: string,
): Promise<ApiMessageThreadsPage> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/communications/threads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: cookies,
    },
    body: JSON.stringify({
      page: 0,
      pageSize: 100,
      orderDirection: "DESC",
    }),
  }, TIMEOUT_DATA);

  if (!res.ok) {
    throw new Error(`Failed to fetch threads: ${res.status}`);
  }

  return (await res.json()) as ApiMessageThreadsPage;
}

/**
 * Fetches the position on an offer
 * @param offerId
 * @returns
 */
export async function getPositionOnOffer(offerId: string, cookies: string) {
  const res = await fetchWithTimeout(
    `${BASE_URL}/api/search/waiting-lists/applicants/position-on-offer/${offerId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookies,
      },
    },
    TIMEOUT_DATA,
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch position on offer: ${res.status}: ${res.statusText}`,
    );
  }

  const data = await res.json();
  return data;
}

/**
 * Fetches a residence by ID
 * @param residenceId
 * @returns
 */
export async function getResidence(residenceId: string, cookies: string) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/models/residence/${residenceId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: cookies,
    },
  }, TIMEOUT_DATA);

  if (!res.ok) {
    throw new Error(
      `Failed to fetch residence: ${res.status}: ${res.statusText}`,
    );
  }
  const data = await res.json();
  const residence = apiResidenceToDomain(data as ApiResidence);

  return residence;
}

/**
 * Fetches the thread for an offer
 * @param offerId
 * @returns
 */
export async function getThreadForOffer(
  offerId: string,
  cookies: string,
): Promise<ApiMessageThreadFull | null> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/api/communications/messages/thread/related-to/${offerId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookies,
      },
    },
    TIMEOUT_DATA,
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch thread for offer: ${res.status}: ${res.statusText}`,
    );
  }

  const text = await res.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text) as ApiMessageThreadFull;
}

/**
 * Fetches upcoming appointments
 * @param includeAll - If true, fetches all offers; if false, only fetches active offers (Finished/Published)
 * @returns
 */
export async function getUpcomingAppointments(
  cookies: string,
  includeAll: boolean = false,
) {
  try {
    let offers = (await fetchOffers(cookies)).results;
    // So far it seems that the default state once you get the offer is either 'Finished' or 'Published'
    // there may be other state values used that represents same state

    if (!includeAll) {
      offers = offers.filter(
        (offer) => offer.state === "Finished" || offer.state === "Published",
      );
    }

    const offersWithResidenceAndThread = await Promise.all(
      offers.map(async (offer) => {
        if (!offer.residenceId || !offer.id) {
          return null;
        }
        const [residence, thread, position] = await Promise.all([
          getResidence(offer.residenceId, cookies),
          getThreadForOffer(offer.id, cookies),
          getPositionOnOffer(offer.id, cookies).catch(() => null),
        ]);
        if (!thread) {
          return null;
        }
        const details = await extractAppointmentDetailsWithLLM(thread);
        const domainAppointment = mapAppointmentToDomain({
          offer,
          residence,
          details,
          position,
        });
        return domainAppointment;
      }),
    );

    return offersWithResidenceAndThread.filter(
      (a): a is NonNullable<typeof a> => a !== null,
    );
  } catch (error) {
    console.error("Failed to fetch upcoming appointments:", error);
    throw error;
  }
}

/**
 * Fetches the user data
 * @returns
 */
export async function getUserData(cookies: string) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/users/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: cookies,
    },
  }, TIMEOUT_DATA);

  if (!res.ok) {
    throw new Error(`Failed to fetch user data: ${res.status}`);
  }

  return res.json();
}

/**
 * Refreshes the session by calling an authenticated endpoint. If the upstream
 * returns new Set-Cookie headers they will be returned alongside the user data
 * so the client can update its stored cookie header.
 */
export async function refreshSession(cookies: string) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/users/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: cookies,
    },
  }, TIMEOUT_REFRESH);

  if (!res.ok) {
    return null;
  }

  // Return the mapped user data together with any Set-Cookie headers
  return apiUserDataToDomain(await res.json() as ApiUserData, res.headers.getSetCookie() ?? []);
}
