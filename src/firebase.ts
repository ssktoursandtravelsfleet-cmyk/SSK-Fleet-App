import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from "firebase/auth";
import { initializeFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const dbInstanceId = (firebaseConfig as any).firestoreDatabaseId;
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  dbInstanceId
);

// Validate Connection to Firestore per firebase-skill directives
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore operating in offline mode:", error.message);
    }
  }
}
testConnection();

export const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/spreadsheets.readonly");
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/drive.readonly");
provider.setCustomParameters({
  prompt: "select_account"
});

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (typeof window !== "undefined") {
        const token = sessionStorage.getItem("ssk_google_oauth_token") || localStorage.getItem("google_access_token");
        if (token && onAuthSuccess) {
          onAuthSuccess(user, token);
          return;
        }
      }
      if (onAuthSuccess) {
        onAuthSuccess(user, "");
      }
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Firebase Google Auth");
    }

    const token = credential.accessToken;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("ssk_google_oauth_token", token);
      sessionStorage.setItem("ssk_google_oauth_expires_at", String(Date.now() + 3540 * 1000));
      if (result.user?.email) {
        sessionStorage.setItem("ssk_google_oauth_user_email", result.user.email);
      }
      localStorage.setItem("google_access_token", token);
    }
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    console.error("[Firebase] Sign in error:", error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("ssk_google_oauth_token") || localStorage.getItem("google_access_token");
    if (token) return token;
  }
  return null;
};

export const logoutUser = async () => {
  await signOut(auth);
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("ssk_google_oauth_token");
    sessionStorage.removeItem("ssk_google_oauth_expires_at");
    sessionStorage.removeItem("ssk_google_oauth_user_email");
    localStorage.removeItem("google_access_token");
  }
};
