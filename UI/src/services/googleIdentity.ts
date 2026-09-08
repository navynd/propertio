type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  ux_mode?: "popup" | "redirect";
};

type GooglePromptMomentNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
};

type GoogleAccounts = {
  id: {
    initialize: (config: GoogleIdConfiguration) => void;
    renderButton: (
      parent: HTMLElement,
      options: Record<string, unknown>
    ) => void;
    prompt: (
      listener?: (notification: GooglePromptMomentNotification) => void
    ) => void;
  };
};

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts;
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

const loadGoogleScript = (): Promise<void> => {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google SDK")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google SDK"));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
};

export const getGoogleIdToken = async (): Promise<string> => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error("Google client id is not configured");
  }

  await loadGoogleScript();

  if (!window.google?.accounts?.id) {
    throw new Error("Google SDK is unavailable");
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const cleanupNodes: HTMLElement[] = [];
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanupNodes.forEach((node) => node.remove());
      reject(new Error("Google sign-in timed out"));
    }, 60000);

    const resolveSafe = (token: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      cleanupNodes.forEach((node) => node.remove());
      resolve(token);
    };

    const rejectSafe = (message: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      cleanupNodes.forEach((node) => node.remove());
      reject(new Error(message));
    };

    window.google?.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      ux_mode: "popup",
      callback: (response) => {
        if (response.credential) {
          resolveSafe(response.credential);
          return;
        }
        rejectSafe("Google did not return a credential");
      },
    });

    const hiddenContainer = document.createElement("div");
    hiddenContainer.style.position = "fixed";
    hiddenContainer.style.left = "-10000px";
    hiddenContainer.style.top = "-10000px";
    hiddenContainer.style.width = "1px";
    hiddenContainer.style.height = "1px";
    hiddenContainer.style.opacity = "0";
    document.body.appendChild(hiddenContainer);
    cleanupNodes.push(hiddenContainer);

    window.google?.accounts.id.renderButton(hiddenContainer, {
      theme: "outline",
      size: "large",
      type: "standard",
    });

    const buttonElement = hiddenContainer.querySelector<HTMLElement>(
      'div[role="button"], button'
    );
    if (buttonElement) {
      buttonElement.click();
    } else {
      rejectSafe("Unable to start Google sign-in popup");
      return;
    }
  });
};

