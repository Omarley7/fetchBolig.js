import "dotenv/config";

import { mapAppointmentToDomain } from "~/lib/appointments-domain.js";
import { apiResidenceToDomain } from "~/lib/residences-domain.js";
import type { ApiOffersPage } from "~/types/offers.js";
import type { ApiResidence } from "~/types/residences.js";
import type {
  ApiMessageThreadFull,
  ApiMessageThreadsPage,
} from "~/types/threads.js";
import { extractAppointmentDetailsWithLLM } from "./lib/llm/openai-extractor.js";

// Disable TLS verification for development (remove in production)
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const BASE_URL = "https://findbolig.nu";

/**
 * Performs initial GET and login to establish authenticated session
 * Returns the Set-Cookie headers if successful
 */
export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; cookies?: string[] }> {
  try {
    // Initial GET to receive __Secure-SID cookie
    const initialRes = await fetch(BASE_URL, { redirect: "follow" });
    const initialCookies = initialRes.headers.getSetCookie();

    // Perform login with initial cookies
    const cookieHeader = initialCookies.join("; ");
    const res = await fetch(`${BASE_URL}/api/authentication/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      // Combine cookies from both requests
      const loginCookies = res.headers.getSetCookie();
      const allCookies = [...initialCookies, ...loginCookies];
      return { success: true, cookies: allCookies };
    }

    return { success: false };
  } catch (error) {
    console.error("Login failed:", error);
    return { success: false };
  }
}

/**
 * Fetches offers from the API (requires prior authentication)
 */
export async function fetchOffers(cookies: string): Promise<ApiOffersPage> {
  const res = await fetch(`${BASE_URL}/api/search/offers`, {
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
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch offers: ${res.status}`);
  }

  return (await res.json()) as ApiOffersPage;
}

/**
 * Fetches message threads from the API (requires prior authentication)
 */
export async function fetchThreads(
  cookies: string
): Promise<ApiMessageThreadsPage> {
  const res = await fetch(`${BASE_URL}/api/communications/threads`, {
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
export async function getPositionOnOffer(offerId: string, cookies: string) {
  const res = await fetch(
    `${BASE_URL}/api/search/waiting-lists/applicants/position-on-offer/${offerId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookies,
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
export async function getResidence(residenceId: string, cookies: string) {
  const res = await fetch(`${BASE_URL}/api/models/residence/${residenceId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: cookies,
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch residence: ${res.status}: ${res.statusText}`
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
  cookies: string
): Promise<ApiMessageThreadFull> {
  const res = await fetch(
    `${BASE_URL}/api/communications/messages/thread/related-to/${offerId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookies,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch thread for offer: ${res.status}: ${res.statusText}`
    );
  }

  return (await res.json()) as ApiMessageThreadFull;
}

/**
 * Fetches upcoming appointments
 * @returns
 */
export async function getUpcomingAppointments(cookies: string) {
  try {
    const offers = await fetchOffers(cookies);
    // So far it seems that the default state once you get the offer is either 'Finished' or 'Published'
    // there may be other state values used that represents same state
    const activeOffers = offers.results.filter(
      (offer) => offer.state === "Finished" || offer.state === "Published"
    );

    const offersWithResidenceAndThread = await Promise.all(
      activeOffers.map(async (offer) => {
        if (!offer.residenceId || !offer.id) {
          return null;
        }
        const residence = await getResidence(offer.residenceId, cookies);
        const thread = await getThreadForOffer(offer.id, cookies);
        const details = await extractAppointmentDetailsWithLLM(thread);
        const domainAppointment = mapAppointmentToDomain({
          offer,
          residence,
          details,
        });
        return domainAppointment;
      })
    );

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
export async function getUserData(cookies: string) {
  const res = await fetch(`${BASE_URL}/api/users/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: cookies,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user data: ${res.status}`);
  }

  return res.json();
}
