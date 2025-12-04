import "dotenv/config";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import { fetch as undiciFetch } from "undici";

import type { ApiOffer, ApiOffersPage } from "./types/offers";
import type { ApiMessageThreadsPage } from "./types/threads";
import { apiResidenceToDomain } from "./lib/residences-domain";
import { ApiResidence } from "./types/residences";

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

/**
 * Fetches the position on an offer
 * @param offerId
 * @returns
 */
export async function getPositionOnOffer(offerId: string) {
  const res = await fetch(
    `${BASE_URL}/api/search/waiting-lists/applicants/position-on-offer/${offerId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch position on offer: ${res.status}: ${res.statusText}`
    );
  }

  return res.json();
}

/**
 * Fetches a residence by ID
 * @param residenceId
 * @returns
 */
export async function getResidence(residenceId: string) {
  const res = await fetch(`${BASE_URL}/api/models/residence/${residenceId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch residence: ${res.status}: ${res.statusText}`
    );
  }

  return res.json();
}

/**
 * Fetches the thread for an offer
 * @param offerId
 * @returns
 */
export async function getThreadForOffer(offerId: string) {
  const res = await fetch(`${BASE_URL}/api/communications/messages/thread/related-to/${offerId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch thread for offer: ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetches upcoming appointments
 * @returns
 */
export async function getUpcomingAppointments() {
  try {
    const offers = await fetchOffers();
    // filter offers with state "Finished"
    const finishedOffers = offers.results.filter(
      (offer: ApiOffer) => offer.state === "Finished"
    );

    const offersWithResidenceAndThread = await Promise.all(finishedOffers.map(async (offer) => {
      if (!offer.residenceId || !offer.id) {
        return null;
      }
      const residence = await getResidence(offer.residenceId);
      const thread = await getThreadForOffer(offer.id);
      return {
        residence: apiResidenceToDomain(residence as ApiResidence),
        thread,
        ...offer,
      };
    }));

    return offersWithResidenceAndThread;
  } catch (error) {
    console.error("Failed to fetch upcoming appointments:", error);
    throw error;
  }
}

/**
 * Fetches the user data
 * @returns
 */
export async function getUserData() {
  const res = await fetch(`${BASE_URL}/api/users/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user data: ${res.status}`);
  }

  return res.json();
}
