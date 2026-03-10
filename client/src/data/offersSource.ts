import type { Offer, RecipientState } from "@/types";
import { MOCK_OFFERS } from "./mockData";
import { HttpError } from "./appointmentsSource";
import config from "~/config";

const TIMEOUT_FETCH = 90_000;
const TIMEOUT_ACTION = 25_000;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function fetchActiveOffers(): Promise<{
  updatedAt: Date;
  offers: Offer[];
}> {
  if (config.useMockData) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { updatedAt: new Date(), offers: MOCK_OFFERS };
  }

  const res = await fetchWithTimeout(
    `${config.backendDomain}/api/offers/active`,
    { method: "GET", credentials: "include" },
    TIMEOUT_FETCH,
  );

  if (!res.ok) {
    throw new HttpError(`Failed to fetch offers: ${res.status}`, res.status);
  }

  const data = await res.json();
  return { updatedAt: new Date(), offers: data as Offer[] };
}

export async function acceptOffer(offerId: string): Promise<RecipientState> {
  const res = await fetchWithTimeout(
    `${config.backendDomain}/api/offers/${offerId}/accept`,
    { method: "POST", credentials: "include" },
    TIMEOUT_ACTION,
  );

  if (!res.ok) {
    throw new HttpError(`Failed to accept offer: ${res.status}`, res.status);
  }

  const data = await res.json();
  return data.recipientState as RecipientState;
}

export async function declineOffer(offerId: string): Promise<RecipientState> {
  const res = await fetchWithTimeout(
    `${config.backendDomain}/api/offers/${offerId}/decline`,
    { method: "POST", credentials: "include" },
    TIMEOUT_ACTION,
  );

  if (!res.ok) {
    throw new HttpError(`Failed to decline offer: ${res.status}`, res.status);
  }

  const data = await res.json();
  return data.recipientState as RecipientState;
}
