import { auth, provider } from "../firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

export const REQUIRED_GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly"
];

const SCOPES_STRING = REQUIRED_GOOGLE_SCOPES.join(" ");

const SESSION_TOKEN_KEY = "ssk_google_oauth_token";
const SESSION_EXPIRY_KEY = "ssk_google_oauth_expires_at";
const SESSION_USER_KEY = "ssk_google_oauth_user_email";

// In-memory authentication state (fast, safe, no permanent storage leak)
let memoryAccessToken: string | null = null;
let memoryTokenExpiresAt: number | null = null;
let memoryUserEmail: string | null = null;
let memoryUserName: string | null = null;
let memoryUserPhoto: string | null = null;

// Auth state change listeners
type AuthListener = (state: GoogleAuthState) => void;
const authListeners = new Set<AuthListener>();

export interface GoogleAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  expiresAt: number | null;
  isExpired: boolean;
}

/**
 * Initialize state from sessionStorage (preserves state on page refresh without using persistent localStorage)
 */
function initFromSessionStorage() {
  if (typeof window === "undefined" || !window.sessionStorage) return;

  try {
    const storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const storedExpiry = sessionStorage.getItem(SESSION_EXPIRY_KEY);
    const storedEmail = sessionStorage.getItem(SESSION_USER_KEY);

    if (storedToken && storedExpiry) {
      const expTime = parseInt(storedExpiry, 10);
      if (!isNaN(expTime) && expTime > Date.now()) {
        memoryAccessToken = storedToken;
        memoryTokenExpiresAt = expTime;
        memoryUserEmail = storedEmail || null;
      } else {
        // Expired in session, clear
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        sessionStorage.removeItem(SESSION_EXPIRY_KEY);
        sessionStorage.removeItem(SESSION_USER_KEY);
      }
    }
  } catch (e) {
    console.warn("[GoogleAuth] Failed to load from sessionStorage:", e);
  }
}

initFromSessionStorage();

/**
 * Save active token into memory and sessionStorage
 */
export function setGoogleOAuthSession(
  token: string,
  expiresInSeconds: number = 3599,
  email?: string | null,
  name?: string | null,
  photo?: string | null
) {
  memoryAccessToken = token;
  const expiresAt = Date.now() + (expiresInSeconds - 60) * 1000; // 60-second safety margin
  memoryTokenExpiresAt = expiresAt;

  if (email) memoryUserEmail = email;
  if (name) memoryUserName = name;
  if (photo) memoryUserPhoto = photo;

  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      sessionStorage.setItem(SESSION_EXPIRY_KEY, String(expiresAt));
      if (email) sessionStorage.setItem(SESSION_USER_KEY, email);
    }
  } catch (e) {
    console.warn("[GoogleAuth] Could not write to sessionStorage:", e);
  }

  notifyListeners();
}

/**
 * Clear OAuth session on sign-out
 */
export function clearGoogleOAuthSession() {
  memoryAccessToken = null;
  memoryTokenExpiresAt = null;
  memoryUserEmail = null;
  memoryUserName = null;
  memoryUserPhoto = null;

  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_EXPIRY_KEY);
      sessionStorage.removeItem(SESSION_USER_KEY);
    }
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem("google_access_token");
      localStorage.removeItem("access_token");
    }
  } catch (e) {
    console.warn("[GoogleAuth] Could not clear storage:", e);
  }

  notifyListeners();
}

/**
 * Returns current snapshot of Google Auth State
 */
export function getGoogleAuthState(): GoogleAuthState {
  const isExpired = !memoryTokenExpiresAt || Date.now() >= memoryTokenExpiresAt;
  const isAuthenticated = !!memoryAccessToken && !isExpired;

  return {
    isAuthenticated,
    accessToken: isAuthenticated ? memoryAccessToken : null,
    userEmail: memoryUserEmail || auth?.currentUser?.email || null,
    userName: memoryUserName || auth?.currentUser?.displayName || null,
    userPhoto: memoryUserPhoto || auth?.currentUser?.photoURL || null,
    expiresAt: memoryTokenExpiresAt,
    isExpired
  };
}

/**
 * Register listener for auth state changes
 */
export function onGoogleAuthStateChange(listener: AuthListener): () => void {
  authListeners.add(listener);
  listener(getGoogleAuthState());
  return () => {
    authListeners.delete(listener);
  };
}

function notifyListeners() {
  const state = getGoogleAuthState();
  authListeners.forEach((fn) => {
    try {
      fn(state);
    } catch (e) {
      console.error("[GoogleAuth] Listener error:", e);
    }
  });
}

/**
 * Check if a valid, unexpired token exists
 */
export function hasValidGoogleAccessToken(): boolean {
  if (!memoryAccessToken) return false;
  if (!memoryTokenExpiresAt) return false;
  return Date.now() < memoryTokenExpiresAt;
}

/**
 * Request Google Sign-In with full Google Sheets & Drive scopes.
 * Tries Firebase GoogleAuthProvider popup first, and Google Identity Services (GIS) token client fallback.
 */
export async function requestGoogleOAuthSignIn(
  options: { prompt?: "select_account" | "consent" | "" } = { prompt: "select_account" }
): Promise<{ accessToken: string; user?: User | null; email?: string | null }> {
  console.log("[GoogleAuth] Requesting Google Sign-In with scopes:", REQUIRED_GOOGLE_SCOPES);

  // Method 1: Firebase Auth GoogleAuthProvider signInWithPopup
  try {
    REQUIRED_GOOGLE_SCOPES.forEach((scope) => {
      provider.addScope(scope);
    });

    if (options.prompt) {
      provider.setCustomParameters({
        prompt: options.prompt,
        access_type: "online"
      });
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (credential?.accessToken) {
      const token = credential.accessToken;
      const user = result.user;
      setGoogleOAuthSession(
        token,
        3600,
        user.email,
        user.displayName,
        user.photoURL
      );
      console.log("[GoogleAuth] Firebase Google Sign-In Succeeded for:", user.email);
      return { accessToken: token, user, email: user.email };
    }
  } catch (fbErr: any) {
    console.warn("[GoogleAuth] Firebase Popup attempt warning:", fbErr?.code || fbErr?.message);
    
    // If user cancelled, don't fallback, re-throw clean error
    if (fbErr?.code === "auth/popup-closed-by-user" || fbErr?.code === "auth/cancelled-popup-request") {
      throw new Error("Google Sign-In was cancelled by user.");
    }
  }

  // Method 2: Google Identity Services (GIS) Token Client
  if (typeof window !== "undefined" && (window as any).google?.accounts?.oauth2) {
    console.log("[GoogleAuth] Attempting Google Identity Services (GIS) Token Client...");
    const clientId = (firebaseConfig as any).oAuthClientId;

    if (clientId) {
      return new Promise((resolve, reject) => {
        try {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES_STRING,
            prompt: options.prompt || "",
            callback: (resp: any) => {
              if (resp.error) {
                console.error("[GoogleAuth] GIS Error response:", resp);
                reject(new Error(`Google OAuth error: ${resp.error_description || resp.error}`));
                return;
              }
              if (resp.access_token) {
                const expiresIn = parseInt(resp.expires_in, 10) || 3600;
                setGoogleOAuthSession(
                  resp.access_token,
                  expiresIn,
                  auth.currentUser?.email || null,
                  auth.currentUser?.displayName || null,
                  auth.currentUser?.photoURL || null
                );
                console.log("[GoogleAuth] GIS Token acquisition succeeded!");
                resolve({
                  accessToken: resp.access_token,
                  user: auth.currentUser,
                  email: auth.currentUser?.email
                });
              } else {
                reject(new Error("No access token returned from Google Identity Services."));
              }
            }
          });

          client.requestAccessToken();
        } catch (gisErr: any) {
          console.error("[GoogleAuth] GIS Client initialization failed:", gisErr);
          reject(gisErr);
        }
      });
    }
  }

  // If we reach here and have an active memory token, return it
  if (hasValidGoogleAccessToken()) {
    return {
      accessToken: memoryAccessToken!,
      user: auth.currentUser,
      email: memoryUserEmail || auth.currentUser?.email
    };
  }

  throw new Error("Google Sign-In failed to acquire OAuth access token with Google Sheets permissions.");
}

/**
 * Returns a valid access token or null if authentication is required.
 */
export async function getValidAccessToken(): Promise<string | null> {
  if (hasValidGoogleAccessToken()) {
    return memoryAccessToken;
  }

  // If token is missing or expired, attempt silent token recovery if Firebase user is logged in
  if (auth.currentUser) {
    try {
      console.log("[GoogleAuth] Attempting silent token recovery for authenticated user:", auth.currentUser.email);
      const res = await requestGoogleOAuthSignIn({ prompt: "" });
      if (res?.accessToken) {
        return res.accessToken;
      }
    } catch (silentErr) {
      console.log("[GoogleAuth] Silent token recovery not available; interactive login required.");
    }
  }

  return null;
}

/**
 * Executes a Google Sheets API operation with automatic 401 retry and token refresh.
 */
export async function executeWithGoogleAuthRetry<T>(
  apiFn: (token: string) => Promise<T>,
  providedToken?: string | null
): Promise<T> {
  let token = providedToken || (await getValidAccessToken());

  if (!token) {
    console.log("[GoogleAuth] No active OAuth token available. Prompting Google Sign-In...");
    const authResult = await requestGoogleOAuthSignIn();
    token = authResult.accessToken;
  }

  if (!token) {
    throw new Error("Google OAuth access token missing. Please sign in with Google to perform sheet updates.");
  }

  try {
    return await apiFn(token);
  } catch (firstErr: any) {
    const errMsg = firstErr?.message || String(firstErr);
    const isAuthError =
      errMsg.includes("401") ||
      errMsg.includes("UNAUTHENTICATED") ||
      errMsg.includes("invalid_token") ||
      errMsg.includes("token expired") ||
      errMsg.includes("Invalid Credentials");

    if (isAuthError) {
      console.warn("[GoogleAuth] Access token was rejected with 401/expired. Refreshing token and retrying once...");
      clearGoogleOAuthSession();

      const refreshResult = await requestGoogleOAuthSignIn({ prompt: "select_account" });
      const freshToken = refreshResult.accessToken;

      if (!freshToken) {
        throw new Error("Failed to re-authenticate with Google. Please sign in again.");
      }

      console.log("[GoogleAuth] Retrying API request with fresh OAuth token...");
      return await apiFn(freshToken);
    }

    // Classify known Google Sheets API errors
    if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")) {
      throw new Error("Permission Denied: The signed-in Google account does not have Edit permissions for this spreadsheet. Please grant Editor access to the spreadsheet.");
    }

    throw firstErr;
  }
}

// Sync with Firebase Auth state changes
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      memoryUserEmail = user.email;
      memoryUserName = user.displayName;
      memoryUserPhoto = user.photoURL;
      notifyListeners();
    } else if (!memoryAccessToken) {
      clearGoogleOAuthSession();
    }
  });
}
