declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
  };
};

const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

if (!rawApiBaseUrl) {
  throw new Error("Env EXPO_PUBLIC_API_URL não está definida.");
}

export const apiBaseUrl = rawApiBaseUrl;

export function publicApiUrl(path: string): string {
  const root = apiBaseUrl.replace(/\/api\/?$/, "");
  return `${root}${path.startsWith("/") ? path : `/${path}`}`;
}
