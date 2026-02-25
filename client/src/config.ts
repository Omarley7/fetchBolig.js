interface Config {
  backendDomain: string;
  useMockData: boolean;
  imageBaseUrl: string;
}

const config: Config = {
  backendDomain:
    import.meta.env.VITE_BACKEND_DOMAIN ?? "https://fetchbolig-888219336642.europe-west1.run.app",
  useMockData: import.meta.env.VITE_USE_MOCK_DATA === "true",
  imageBaseUrl: import.meta.env.VITE_IMAGE_BASE_URL ?? "https://findbolig.nu",
};

export default config;
