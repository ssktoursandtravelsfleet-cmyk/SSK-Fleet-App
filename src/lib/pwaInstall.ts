/**
 * PWA Native Installation Manager for Mobile Devices
 * 
 * Complies with native browser PWA install flow:
 * - Captures and preserves `beforeinstallprompt` event.
 * - Restricts automated native installation prompts strictly to mobile phones.
 * - Suppresses prompts on desktop/laptops and when the app is already in standalone mode.
 * - Prevents repetitive prompting across page reloads using session and cooldown controls.
 * - Gracefully handles unsupported browsers (e.g., iOS Safari) with zero errors.
 */

// Global deferred prompt holder
let deferredInstallPrompt: any = null;
let isInitialized = false;

const SESSION_PROMPT_KEY = "ssk_pwa_prompt_shown_session";
const DISMISS_COOLDOWN_KEY = "ssk_pwa_prompt_last_dismissed";
const APP_INSTALLED_KEY = "ssk_pwa_app_installed";
const COOLDOWN_HOURS = 24; // Wait 24h before prompting again if dismissed

type PwaStateListener = (state: {
  isInstallable: boolean;
  isStandalone: boolean;
  isMobile: boolean;
}) => void;

const listeners = new Set<PwaStateListener>();

function notifyListeners() {
  const state = {
    isInstallable: !!deferredInstallPrompt,
    isStandalone: isStandaloneApp(),
    isMobile: isMobilePhone()
  };
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (err) {
      console.warn("[PWA INSTALL] Listener notification error:", err);
    }
  });
}

/**
 * Robust check if the current client is a mobile phone (Android / iOS / mobile device)
 * Excludes desktop / laptop browsers.
 */
export function isMobilePhone(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  // 1. Modern Client Hints API (Chromium / Edge / Opera on Android/Mobile)
  const navAny = navigator as any;
  if (navAny.userAgentData && typeof navAny.userAgentData.mobile === "boolean") {
    return navAny.userAgentData.mobile;
  }

  // 2. Comprehensive Mobile User-Agent Inspection
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
  const mobileUaRegex = /android|iphone|ipod|windows phone|iemobile|mobile|blackberry|bb10|opera mini|silk|webos/i;
  const isMobileUA = mobileUaRegex.test(ua);

  // 3. Check for iPads / Tablets
  const isIPad = /ipad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // 4. Guard against desktop computers with touchscreens
  const isDesktopPlatform = /Win32|Win64|MacIntel|Linux x86_64/i.test(navigator.platform || "");
  if (isDesktopPlatform && !isMobileUA && !isIPad) {
    return false;
  }

  return isMobileUA || isIPad;
}

/**
 * Check if running on iOS (iPhone / iPad / iPod)
 */
export function isIOS(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/i.test(ua) || isIPad;
}

/**
 * Check if the application is currently running in Standalone / Installed PWA mode
 */
export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;

  try {
    // 1. Standard CSS display-mode media queries
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isFullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
    const isMinimalUI = window.matchMedia("(display-mode: minimal-ui)").matches;

    // 2. iOS Safari standalone property
    const isIOSStandalone = !!(window.navigator as any).standalone;

    // 3. Android TWA / app referrer
    const isAndroidTWA = typeof document !== "undefined" && document.referrer.includes("android-app://");

    // 4. Stored installation flag
    const isMarkedInstalled = localStorage.getItem(APP_INSTALLED_KEY) === "true";

    return isStandalone || isFullscreen || isMinimalUI || isIOSStandalone || isAndroidTWA || isMarkedInstalled;
  } catch (err) {
    console.warn("[PWA INSTALL] Error evaluating standalone mode:", err);
    return false;
  }
}

/**
 * Check if install prompt is in cooldown or already shown in this session
 */
export function shouldPromptInstall(): boolean {
  if (!isMobilePhone()) {
    console.log("[PWA INSTALL] Device is desktop/laptop. Suppressing native install prompt.");
    return false;
  }

  if (isStandaloneApp()) {
    console.log("[PWA INSTALL] App is already running in standalone/installed mode.");
    return false;
  }

  // Check current session
  try {
    const sessionShown = sessionStorage.getItem(SESSION_PROMPT_KEY);
    if (sessionShown === "true") {
      console.log("[PWA INSTALL] Install prompt already presented in this session.");
      return false;
    }
  } catch (e) {
    // ignore sessionStorage errors
  }

  // Check cooldown if previously dismissed
  try {
    const lastDismissedStr = localStorage.getItem(DISMISS_COOLDOWN_KEY);
    if (lastDismissedStr) {
      const lastDismissed = parseInt(lastDismissedStr, 10);
      const hoursSince = (Date.now() - lastDismissed) / (1000 * 60 * 60);
      if (hoursSince < COOLDOWN_HOURS) {
        console.log(`[PWA INSTALL] Install prompt in cooldown (${hoursSince.toFixed(1)}h / ${COOLDOWN_HOURS}h).`);
        return false;
      }
    }
  } catch (e) {
    // ignore localStorage errors
  }

  return true;
}

/**
 * Trigger the native browser PWA install prompt.
 * Only executes if:
 * 1. Client is on a mobile device
 * 2. App is NOT already running standalone
 * 3. `beforeinstallprompt` event has been captured
 * 4. Install prompt has not been suppressed by session/cooldown rules
 */
export async function triggerNativePwaInstallPrompt(): Promise<boolean> {
  if (!isMobilePhone()) {
    console.log("[PWA INSTALL] Denied: Desktop/Laptop client.");
    return false;
  }

  if (isStandaloneApp()) {
    console.log("[PWA INSTALL] Denied: App already installed / running in standalone mode.");
    return false;
  }

  if (!deferredInstallPrompt) {
    console.log("[PWA INSTALL] No deferred install prompt available from browser.");
    return false;
  }

  try {
    console.log("[PWA INSTALL] Launching native browser PWA Install prompt...");

    // Record session display so it doesn't repeat on reload
    try {
      sessionStorage.setItem(SESSION_PROMPT_KEY, "true");
    } catch (e) {}

    // Show native browser install prompt dialog
    const promptEvent = deferredInstallPrompt;
    await promptEvent.prompt();

    // Wait for the user's choice
    const choiceResult = await promptEvent.userChoice;
    console.log("[PWA INSTALL] Native install outcome:", choiceResult?.outcome);

    if (choiceResult?.outcome === "accepted") {
      try {
        localStorage.setItem(APP_INSTALLED_KEY, "true");
      } catch (e) {}
      deferredInstallPrompt = null;
      notifyListeners();
      return true;
    } else {
      // User dismissed prompt -> Set cooldown timestamp
      try {
        localStorage.setItem(DISMISS_COOLDOWN_KEY, Date.now().toString());
      } catch (e) {}
      deferredInstallPrompt = null;
      notifyListeners();
      return false;
    }
  } catch (err) {
    console.warn("[PWA INSTALL] Error calling native prompt():", err);
    deferredInstallPrompt = null;
    notifyListeners();
    return false;
  }
}

/**
 * Initialize PWA Install Event listeners.
 * Safe to call multiple times (idempotent).
 */
export function initPwaInstallManager(onAutoPromptReady?: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  if (isInitialized) {
    return () => {};
  }
  isInitialized = true;

  console.log("[PWA INSTALL] Initializing PWA Install Manager (Mobile Only check:", isMobilePhone(), ")");

  const handleBeforeInstallPrompt = (e: Event) => {
    console.log("[PWA INSTALL] Received beforeinstallprompt event from browser.");

    // Check if desktop
    if (!isMobilePhone()) {
      console.log("[PWA INSTALL] Desktop device detected. Suppressing auto-install prompt.");
      return;
    }

    // Check if already installed
    if (isStandaloneApp()) {
      console.log("[PWA INSTALL] App already installed. Suppressing prompt.");
      return;
    }

    // Prevent default mini-infobar from appearing immediately
    e.preventDefault();

    // Stash the event so it can be triggered at the right moment
    deferredInstallPrompt = e;
    notifyListeners();

    if (onAutoPromptReady && shouldPromptInstall()) {
      onAutoPromptReady();
    }
  };

  const handleAppInstalled = () => {
    console.log("[PWA INSTALL] Application was successfully installed as PWA.");
    deferredInstallPrompt = null;
    try {
      localStorage.setItem(APP_INSTALLED_KEY, "true");
      sessionStorage.setItem(SESSION_PROMPT_KEY, "true");
    } catch (e) {}
    notifyListeners();
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);

  return () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.removeEventListener("appinstalled", handleAppInstalled);
  };
}

/**
 * React hook or helper to subscribe to PWA installability state
 */
export function subscribePwaState(listener: PwaStateListener): () => void {
  listeners.add(listener);
  // Initial fire
  listener({
    isInstallable: !!deferredInstallPrompt,
    isStandalone: isStandaloneApp(),
    isMobile: isMobilePhone()
  });
  return () => {
    listeners.delete(listener);
  };
}
