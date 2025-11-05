import "dotenv/config";
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import type { ApiMessageThreadsPage } from "./features/messageThreads/api.types.js";
import { apiThreadToDomain } from "./features/messageThreads/domain.js";
import { upsertThreads } from "./features/messageThreads/repository.js";
import type { ApiOffersPage } from "./features/offers/api.types.js";
import { apiOfferToDomain } from "./features/offers/domain.js";
import { upsertOffers } from "./features/offers/repository.js";
const jar = new CookieJar();
const client = wrapper(
  axios.create({
    baseURL: "https://findbolig.nu",
    jar,
    withCredentials: true,
    headers: { Accept: "application/json" },
  })
);

await client.get("/"); // Initial GET — sets __Secure-SID cookie
process.stdout.write("\nAuthenticating...");
const loginResponse = await client.post("/api/authentication/login", {
  email: process.env.FINDBOLIG_EMAIL!,
  password: process.env.FINDBOLIG_PASSWORD!,
});

if (loginResponse.status !== 200) {
  console.error("Login failed, response status:", loginResponse.status);
  process.exit(1);
} else {
  process.stdout.write(" OK\n");
}

const offersData = await client.post<ApiOffersPage>("/api/search/offers", {
  search: null,
  filters: {},
  pageSize: 2147483647,
  page: 0,
  orderDirection: "desc",
  orderBy: "created",
});

const offers = apiOfferToDomain(offersData.data.results);
await upsertOffers(offers);

const messageThreadData = await client.post<ApiMessageThreadsPage>(
  "/api/communications/threads",
  {
    page: 0,
    pageSize: 100,
    orderDirection: "DESC",
  }
);

const messageThreads = apiThreadToDomain(messageThreadData.data.results);
await upsertThreads(messageThreads);

console.log("Database all updated 🌼");
