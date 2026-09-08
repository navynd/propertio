type AppleAuthSignInResponse = {
  authorization?: {
    id_token?: string;
  };
  user?: unknown;
};

type AppleAuth = {
  init: (config: {
    clientId: string;
    scope?: string;
    redirectURI: string;
    usePopup?: boolean;
    state?: string;
    nonce?: string;
  }) => void;
  signIn: () => Promise<AppleAuthSignInResponse>;
};

declare global {
  interface Window {
    AppleID?: {
      auth: AppleAuth;
    };
  }
}

let appleScriptPromise: Promise<void> | null = null;

const loadAppleScript = (): Promise<void> => {
  if (window.AppleID?.auth) {
    return Promise.resolve();
  }

  if (appleScriptPromise) {
    return appleScriptPromise;
  }

  appleScriptPromise = new Promise<void>((resolve, reject) => {
    const src =
      "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Apple SDK")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Apple SDK"));
    document.head.appendChild(script);
  });

  return appleScriptPromise;
};

const buildRedirectUri = () => {
  const envRedirect = import.meta.env.VITE_APPLE_REDIRECT_URI as
    | string
    | undefined;
  if (envRedirect && envRedirect.trim()) return envRedirect.trim();
  return `${window.location.origin}/socialcallback`;
};

export const getAppleSignInPayload = async (): Promise<{
  token: string;
  user?: unknown;
}> => {
  const clientId = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error("Apple client id is not configured");
  }

  await loadAppleScript();

  if (!window.AppleID?.auth) {
    throw new Error("Apple SDK is unavailable");
  }

  const redirectURI = buildRedirectUri();
  window.AppleID.auth.init({
    clientId,
    scope: "name email",
    redirectURI,
    usePopup: true,
  });

  const response = await window.AppleID.auth.signIn();
  const token = response.authorization?.id_token;
  if (!token) {
    throw new Error("Apple did not return an ID token");
  }

  return {
    token,
    user: response.user,
  };
};

