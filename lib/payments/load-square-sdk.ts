"use client";

type SquareEnvironment = "sandbox" | "production";

let loadPromise: Promise<void> | null = null;
let loadedEnvironment: SquareEnvironment | null = null;

export function loadSquareWebSdk(environment: SquareEnvironment): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Square SDK can only load in the browser"));
  }

  if (window.Square && loadedEnvironment === environment) {
    return Promise.resolve();
  }

  if (loadPromise && loadedEnvironment === environment) {
    return loadPromise;
  }

  loadedEnvironment = environment;
  const scriptUrl =
    environment === "production"
      ? "https://web.squarecdn.com/v1/square.js"
      : "https://sandbox.web.squarecdn.com/v1/square.js";

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-mds-square="${environment}"]`);
    if (existing) {
      if (window.Square) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Square payment script failed to load")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.dataset.mdsSquare = environment;
    script.onload = () => {
      if (!window.Square) {
        reject(new Error("Square SDK failed to initialize"));
        return;
      }
      resolve();
    };
    script.onerror = () => reject(new Error("Square payment script failed to load"));
    document.head.appendChild(script);
  });

  return loadPromise;
}
