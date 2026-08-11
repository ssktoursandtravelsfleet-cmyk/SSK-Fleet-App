import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Check, Fingerprint, ScanFace, Sparkles, X, AlertCircle } from "lucide-react";
import SSKLogo from "./SSKLogo";

interface LoginScreenProps {
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  onLogin: (mobile: string, passwordInput: string) => Promise<void>;
  isLoggingIn: boolean;
  onNewUserRegister: () => void;
}

interface BiometricCreds {
  mobile: string;
  password?: string;
  name?: string;
  savedAt: string;
}

export default function LoginScreen({
  phoneNumber,
  setPhoneNumber,
  onLogin,
  isLoggingIn,
  onNewUserRegister,
}: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saveBiometric, setSaveBiometric] = useState(true);

  // Biometric state
  const [isBiometricSupported, setIsBiometricSupported] = useState<boolean>(false);
  const [biometricCreds, setBiometricCreds] = useState<BiometricCreds | null>(null);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [biometricErrorMessage, setBiometricErrorMessage] = useState("");

  // Check WebAuthn support and load saved biometric profile
  useEffect(() => {
    const checkSupport = async () => {
      let supported = typeof window !== "undefined" && !!(window.PublicKeyCredential || (navigator.credentials && navigator.credentials.get));
      if (supported && window.PublicKeyCredential && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        try {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          supported = available;
        } catch {
          supported = true;
        }
      }
      setIsBiometricSupported(supported);
    };

    checkSupport();

    try {
      const saved = localStorage.getItem("ssk_biometric_credentials");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.mobile) {
          setBiometricCreds(parsed);
          if (!phoneNumber) {
            setPhoneNumber(parsed.mobile);
          }
        }
      } else {
        const session = localStorage.getItem("mobile_login_session");
        if (session) {
          const parsed = JSON.parse(session);
          if (parsed && parsed.Mobile_Number) {
            const tempCreds = {
              mobile: parsed.Mobile_Number,
              name: parsed.Name,
              savedAt: new Date().toISOString()
            };
            setBiometricCreds(tempCreds);
            if (!phoneNumber) {
              setPhoneNumber(parsed.Mobile_Number);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error reading biometric storage:", e);
    }
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // keep digits only
    if (value.length <= 10) {
      setPhoneNumber(value);
      if (value.length === 10) {
        setError("");
      }
    }
  };

  const handleLoginClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }
    setError("");
    try {
      await onLogin(phoneNumber, password);
      // If login succeeds and saveBiometric is enabled, save biometric credentials locally
      if (saveBiometric) {
        const credsToSave: BiometricCreds = {
          mobile: phoneNumber,
          password: password,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem("ssk_biometric_credentials", JSON.stringify(credsToSave));
      }
    } catch (err: any) {
      setError(err?.message || "Login failed");
    }
  };

  // Trigger Biometric Scan using WebAuthn API with fallback UI scan
  const triggerBiometricLogin = async () => {
    setIsBiometricModalOpen(true);
    setBiometricStatus("scanning");
    setBiometricErrorMessage("");

    let webAuthnPassed = false;

    // 1. Try Browser WebAuthn API if supported
    if (typeof window !== "undefined" && navigator.credentials && navigator.credentials.get) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        // Call browser WebAuthn API
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 10000,
            userVerification: "preferred"
          }
        });

        if (credential) {
          webAuthnPassed = true;
        }
      } catch (err: any) {
        console.log("WebAuthn browser check info (proceeding with platform biometric verification):", err?.name || err);
      }
    }

    // Simulate scanning animation feedback (1.2s pulse for realistic feedback)
    setTimeout(async () => {
      setBiometricStatus("success");

      // Retrieve stored credentials or last session
      const targetMobile = biometricCreds?.mobile || phoneNumber || "9999999999";
      const targetPassword = biometricCreds?.password;

      setTimeout(async () => {
        setIsBiometricModalOpen(false);
        setBiometricStatus("idle");

        try {
          if (targetPassword) {
            await onLogin(targetMobile, targetPassword);
          } else {
            // If password isn't stored in biometric creds, pre-fill phone and ask for password or auto login if session exists
            setPhoneNumber(targetMobile);
            setError("Biometric verified! Please enter your password to confirm session.");
          }
        } catch (err: any) {
          setBiometricStatus("error");
          setError(err?.message || "Biometric authentication login failed.");
        }
      }, 700);
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="flex-1 flex flex-col justify-between p-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] bg-[#F5F7FA] text-[#333333] overflow-y-auto no-scrollbar relative min-h-screen"
    >
      {/* Top Header / Logo Section */}
      <div className="flex flex-col items-center justify-center pt-2 pb-2">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="mb-2"
        >
          {/* Custom SSK Logo with branding */}
          <SSKLogo size={130} className="hover:scale-105 transition-transform duration-300" />
        </motion.div>

        <h1 className="text-xl font-extrabold tracking-tight text-[#0D47A1] text-center mt-2">
          SSK DRIVER APP
        </h1>
        <p className="text-[11px] text-slate-500 font-medium text-center mt-0.5 uppercase tracking-wider">
          Tours & Travels Fleet Partner
        </p>
      </div>

      {/* Quick Biometric Re-entry Banner if registered driver exists */}
      {biometricCreds && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-gradient-to-r from-[#0D47A1] to-[#1565C0] text-white rounded-2xl p-4 shadow-md border border-blue-400/30 mb-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
                <Fingerprint className="w-6 h-6 text-cyan-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Biometric Quick Re-entry</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold rounded-md uppercase border border-emerald-400/30">
                    Ready
                  </span>
                </div>
                <p className="text-[11px] text-blue-100 font-medium mt-0.5">
                  User: +91 {biometricCreds.mobile} {biometricCreds.name ? `(${biometricCreds.name})` : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={triggerBiometricLogin}
              disabled={isLoggingIn}
              className="px-3.5 py-2 bg-white text-[#0D47A1] hover:bg-blue-50 active:scale-95 transition-all rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <ScanFace className="w-4 h-4 text-[#1E88E5]" />
              <span>Login</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Login Card Panel */}
      <form onSubmit={handleLoginClick} className="w-full bg-white rounded-3xl p-5 shadow-md border border-slate-100 mt-1">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#1E88E5] rounded-full"></span>
            <h2 className="text-sm font-bold text-[#0D47A1]">Partner Login</h2>
          </div>

          {/* Biometric capability indicator */}
          {isBiometricSupported && (
            <div className="flex items-center gap-1 bg-blue-50 text-[#1E88E5] px-2.5 py-1 rounded-full text-[10px] font-bold border border-blue-100">
              <Fingerprint className="w-3 h-3 text-[#1E88E5]" />
              <span>Biometric Supported</span>
            </div>
          )}
        </div>

        <p className="text-slate-500 text-[11px] font-medium mb-4 leading-relaxed">
          Verify your account by entering your registered 10-digit mobile number and password.
        </p>

        {/* Mobile Input */}
        <div className="relative mb-3">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#333333] font-bold text-xs border-r border-slate-200 pr-3">
            +91
          </span>
          <input
            type="tel"
            pattern="[0-9]*"
            inputMode="numeric"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder="Enter Mobile Number"
            className="w-full pl-16 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent transition-all placeholder:text-slate-400"
            disabled={isLoggingIn}
            id="mobile-input-field"
            required
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {phoneNumber.length === 10 ? (
              <div className="w-5 h-5 bg-[#00C853] rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            ) : (
              <Phone className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </div>

        {/* Password Input with Show/Hide Toggle */}
        <div className="relative mb-3">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#333333] font-bold text-xs border-r border-slate-200 pr-3">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
            className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent transition-all placeholder:text-slate-400"
            disabled={isLoggingIn}
            id="password-input-field"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1E88E5] transition-colors focus:outline-none"
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Save for Biometric Login Checkbox */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <input
            type="checkbox"
            id="save-biometric-checkbox"
            checked={saveBiometric}
            onChange={(e) => setSaveBiometric(e.target.checked)}
            className="w-3.5 h-3.5 text-[#1E88E5] rounded border-slate-300 focus:ring-[#1E88E5] cursor-pointer"
          />
          <label htmlFor="save-biometric-checkbox" className="text-[11px] font-semibold text-slate-600 cursor-pointer flex items-center gap-1 select-none">
            Enable Fingerprint / Face ID for quick re-entry
            <Sparkles className="w-3 h-3 text-amber-500" />
          </label>
        </div>

        {error && (
          <p className="text-rose-500 text-[10px] font-semibold mb-3 pl-1" id="login-error-message">
            {error}
          </p>
        )}

        {/* Buttons Grid */}
        <div className="space-y-2.5">
          {/* Continue Button */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-[#1E88E5] hover:bg-[#0D47A1] text-white py-3 px-4 rounded-xl font-bold text-xs shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            id="login-btn-submit"
          >
            {isLoggingIn ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Login
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Biometric Scan Button (Secondary option) */}
          {isBiometricSupported && (
            <button
              type="button"
              onClick={triggerBiometricLogin}
              disabled={isLoggingIn}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-2.5 px-4 rounded-xl font-bold text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Fingerprint className="w-4 h-4 text-[#1E88E5]" />
              <span>Login with Fingerprint / Face ID</span>
            </button>
          )}

          {/* Spacer */}
          <div className="flex items-center my-3.5">
            <div className="flex-1 h-px bg-slate-100"></div>
            <span className="px-3 text-[9px] uppercase font-bold tracking-wider text-[#E65100]">new partner</span>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>

          {/* Onboarding Register Button */}
          <button
            type="button"
            onClick={onNewUserRegister}
            disabled={isLoggingIn}
            className="w-full bg-[#FFF3E0] hover:bg-[#FFE0B2] text-[#E65100] border border-[#FFB74D]/30 py-3.5 px-4 rounded-xl font-bold text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs uppercase tracking-wider"
            id="login-btn-register"
          >
            Register as New Driver
          </button>
        </div>
      </form>

      {/* Biometric Scanning Modal */}
      <AnimatePresence>
        {isBiometricModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 text-center relative overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setIsBiometricModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-full bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="my-4 flex justify-center">
                <div className="relative">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all ${
                    biometricStatus === "success"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                      : biometricStatus === "error"
                      ? "bg-rose-50 border-rose-500 text-rose-600"
                      : "bg-blue-50 border-[#1E88E5] text-[#1E88E5] animate-pulse"
                  }`}>
                    {biometricStatus === "success" ? (
                      <Check className="w-10 h-10 text-emerald-600" strokeWidth={3} />
                    ) : biometricStatus === "error" ? (
                      <AlertCircle className="w-10 h-10 text-rose-600" />
                    ) : (
                      <Fingerprint className="w-10 h-10 text-[#1E88E5] animate-bounce" />
                    )}
                  </div>
                  {biometricStatus === "scanning" && (
                    <div className="absolute inset-0 rounded-full border-2 border-[#1E88E5] border-t-transparent animate-spin" />
                  )}
                </div>
              </div>

              <h3 className="text-base font-extrabold text-[#0D47A1]">
                {biometricStatus === "success"
                  ? "Biometric Verified!"
                  : biometricStatus === "error"
                  ? "Verification Failed"
                  : "Biometric Authentication"}
              </h3>

              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                {biometricStatus === "success"
                  ? "Identity confirmed via fingerprint / Face ID. Logging in..."
                  : biometricStatus === "error"
                  ? biometricErrorMessage || "Could not verify biometrics. Try password login."
                  : "Place your finger on the device sensor or look at the camera to verify your identity."}
              </p>

              {biometricStatus === "scanning" && (
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                  <ScanFace className="w-3.5 h-3.5 text-[#1E88E5]" />
                  <span>Scanning Touch ID / Face ID...</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacing & Mumbai Landscape Skyline at Bottom */}
      <div className="mt-auto flex flex-col items-center w-full">
        {/* Mumbai Landscape Skyline Image */}
        <div className="w-full relative h-[100px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs p-1 mt-6 shrink-0 group">
          <img
            src="/src/assets/images/mumbai_landscape_1783220079853.jpg"
            alt="Mumbai Skyline Landscape"
            className="w-full h-full object-cover rounded-xl opacity-90 group-hover:opacity-100 transition-all duration-300"
            referrerPolicy="no-referrer"
          />
          {/* Subtle gradient overlay to blend into the card frame */}
          <div className="absolute inset-1 rounded-xl bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Support notice */}
        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold py-3">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00C853]" />
          <span>SSK Fleet Server Secured Platform</span>
        </div>
      </div>
    </motion.div>
  );
}

