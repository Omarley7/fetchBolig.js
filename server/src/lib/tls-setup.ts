/**
 * findbolig.nu serves an incomplete certificate chain (missing the
 * RapidSSL TLS RSA CA G1 intermediate). This module adds the missing
 * intermediate to the global fetch dispatcher so TLS verification
 * succeeds without disabling it entirely.
 *
 * Must be imported before any fetch() calls.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { rootCertificates } from "node:tls";
import { fileURLToPath } from "node:url";
import { Agent, setGlobalDispatcher } from "undici";

const __dirname = dirname(fileURLToPath(import.meta.url));
const extraCert = readFileSync(
  join(__dirname, "../../certs/rapidssl-tls-rsa-ca-g1.pem"),
  "utf8",
);

setGlobalDispatcher(
  new Agent({ connect: { ca: [...rootCertificates, extraCert] } }),
);
