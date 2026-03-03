import posthog from "posthog-js";

export function usePostHog() {
  posthog.init("phc_uP9Aln4z9j5qxmcqfDV0xpXXErlkzg86VwL4dJN4Sna", {
    api_host: "https://eu.i.posthog.com",
    defaults: "2026-01-30",
    person_profiles: 'always',
  });

  return { posthog };
}
