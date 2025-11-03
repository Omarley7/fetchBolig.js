import "dotenv/config";
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

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
const loginResponse = await client.post("/api/authentication/login", {
  email: process.env.FINDBOLIG_EMAIL,
  password: process.env.FINDBOLIG_PASSWORD,
});

const offersData = await client.post("/api/search/offers", {
  search: null,
  filters: {},
  pageSize: 2147483647,
  page: 0,
  orderDirection: "desc",
  orderBy: "created",
});

offersData.data.results.forEach((offer) => {
  console.log(`Offer responsible: ${offer.responsibleUser}`);
});
