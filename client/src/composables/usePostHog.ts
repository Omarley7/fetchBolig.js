import posthog from "posthog-js";

export function usePostHog() {
  posthog.init(import.meta.env.VITE_POSTHOG_API_KEY ?? "", {
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
