import posthog from "posthog-js";

const USER_ID_KEY = "fetchbolig_uid";

export function getOrCreateUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function usePostHog() {
  posthog.init("phc_hYEZSA6EvqCS9wjHxs1cydKoyj7znWPhESMvRPQWkda", {
    api_host: "https://eu.i.posthog.com",
    defaults: "2026-01-30",
    person_profiles: "always",
    loaded: function (ph) {
      if (import.meta.env.DEV) {
        ph.opt_out_capturing();
        ph.set_config({ disable_session_recording: true });
      }
    },
  });

  return { posthog };
}

export function identify(properties?: { email?: string; name?: string }) {
  posthog.identify(properties?.email ?? getOrCreateUserId(), properties);
}
