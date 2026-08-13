import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  FileText, 
  CreditCard, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Camera, 
  Loader2, 
  Lock, 
  Eye, 
  UploadCloud,
  Landmark,
  ShieldCheck,
  IdCard
} from "lucide-react";
import { DriverDocumentRecord } from "../types";

interface OnboardingScreenProps {
  initialPhone: string;
  initialEtm?: string;
  existingDocRecord?: DriverDocumentRecord | null;
  onComplete: (data: {
    name: string;
    phone: string;
    email: string;
    etmId: string;
    driverId?: string;
    aadhaarNo: string;
    panNo: string;
    dlNo: string;
    dob: string;
    emergencyContact: string;
    vehicleNo: string;
    vehicleModel: string;
    addressText: string;
    documents: {
      selfie: string;
      aadhaarPhoto: string;
      aadhaarBackPhoto: string;
      panPhoto: string;
      dlPhoto: string;
      dlBackPhoto: string;
      addressPhoto: string;
      bankPhoto: string;
      policePhoto: string;
    };
  }) => Promise<{ success: boolean; message: string }>;
  onBackToLogin: () => void;
  isSubmitting: boolean;
}

type OnboardingStep = "profile" | "aadhaar" | "pan" | "driving_licence" | "address_proof" | "bank_passbook";

export default function OnboardingScreen({
  initialPhone,
  initialEtm = "",
  existingDocRecord = null,
  onComplete,
  onBackToLogin,
  isSubmitting
}: OnboardingScreenProps) {
  const isLocked = existingDocRecord?.isLocked === true;

  const [currentStep, setCurrentStep] = useState<OnboardingStep>("profile");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // AUTOMATIC DRIVER IDENTIFICATION & STEP 1
  const [driverName, setDriverName] = useState(existingDocRecord?.driverName || "Driver");
  const [mobileNumber, setMobileNumber] = useState(initialPhone || existingDocRecord?.mobileNumber || "");
  const [etmId, setEtmId] = useState(initialEtm || existingDocRecord?.etmId || "");
  const [driverId, setDriverId] = useState(existingDocRecord?.etmId ? `DR-${existingDocRecord.etmId}` : `DR-${initialEtm || "AUTO"}`);
  const [selfie, setSelfie] = useState<string | null>(existingDocRecord?.profilePhotoUrl || null);

  // STEP 2 — AADHAAR CARD
  const [aadhaarNo, setAadhaarNo] = useState(existingDocRecord?.aadhaarNumber || "");
  const [aadhaarPhoto, setAadhaarPhoto] = useState<string | null>(existingDocRecord?.aadhaarFrontUrl || null);
  const [aadhaarBackPhoto, setAadhaarBackPhoto] = useState<string | null>(existingDocRecord?.aadhaarBackUrl || null);

  // STEP 3 — PAN CARD
  const [panNo, setPanNo] = useState(existingDocRecord?.panNumber || "");
  const [panPhoto, setPanPhoto] = useState<string | null>(existingDocRecord?.panCardUrl || null);

  // STEP 4 — DRIVING LICENCE
  const [dlNo, setDlNo] = useState(existingDocRecord?.dlNumber || "");
  const [dlPhoto, setDlPhoto] = useState<string | null>(existingDocRecord?.dlFrontUrl || null);
  const [dlBackPhoto, setDlBackPhoto] = useState<string | null>(existingDocRecord?.dlBackUrl || null);

  // STEP 5 — ADDRESS PROOF
  const [addressText, setAddressText] = useState(existingDocRecord?.address || "");
  const [addressPhoto, setAddressPhoto] = useState<string | null>(existingDocRecord?.addressPhotoUrl || null);

  // STEP 6 — BANK PASSBOOK
  const [bankPhoto, setBankPhoto] = useState<string | null>(existingDocRecord?.bankPassbookUrl || null);

  const stepsList: { id: OnboardingStep; stepNumber: number; title: string; label: string; icon: any }[] = [
    { id: "profile", stepNumber: 1, title: "STEP 1 — PROFILE PHOTO", label: "Profile", icon: User },
    { id: "aadhaar", stepNumber: 2, title: "STEP 2 — AADHAAR CARD", label: "Aadhaar", icon: CreditCard },
    { id: "pan", stepNumber: 3, title: "STEP 3 — PAN CARD", label: "PAN", icon: IdCard },
    { id: "driving_licence", stepNumber: 4, title: "STEP 4 — DRIVING LICENCE", label: "Licence", icon: FileText },
    { id: "address_proof", stepNumber: 5, title: "STEP 5 — ADDRESS PROOF", label: "Address", icon: MapPin },
    { id: "bank_passbook", stepNumber: 6, title: "STEP 6 — BANK PASSBOOK", label: "Bank", icon: Landmark }
  ];

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void
  ) => {
    if (isLocked) {
      setError("Your documents have already been submitted successfully. To update any document, please contact the Admin.");
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setError("File size should be less than 8MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
        setError("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 12) {
      let formatted = value;
      if (value.length > 8) {
        formatted = `${value.slice(0, 4)} ${value.slice(4, 8)} ${value.slice(8)}`;
      } else if (value.length > 4) {
        formatted = `${value.slice(0, 4)} ${value.slice(4)}`;
      }
      setAadhaarNo(formatted);
    }
  };

  const checkStepValidation = (step: OnboardingStep): string | null => {
    if (step === "profile") {
      const cleanMob = mobileNumber.replace(/\D/g, "");
      if (!cleanMob || cleanMob.length < 10) return "Valid 10-digit Mobile Number is required.";
      if (!etmId.trim()) return "ETM ID is required (e.g. 102 or SSK102).";
      if (!selfie) return "Profile photo is required. Please upload or capture a profile photo.";
    } else if (step === "aadhaar") {
      const plainAadhaar = aadhaarNo.replace(/\s/g, "");
      if (!plainAadhaar || plainAadhaar.length !== 12) return "Aadhaar Card Number is required (12 digits).";
      if (!aadhaarPhoto) return "Aadhaar Front Photo is required.";
      if (!aadhaarBackPhoto) return "Aadhaar Back Photo is required.";
    } else if (step === "pan") {
      if (!panNo.trim() || panNo.trim().length < 10) return "PAN Card Number is required (10 characters).";
      if (!panPhoto) return "PAN Card Photo is required.";
    } else if (step === "driving_licence") {
      if (!dlNo.trim() || dlNo.trim().length < 6) return "Driving Licence Number is required.";
      if (!dlPhoto) return "Driving Licence Front Photo is required.";
      if (!dlBackPhoto) return "Driving Licence Back Photo is required.";
    } else if (step === "address_proof") {
      if (!addressText.trim()) return "Address Proof text/address field is required.";
      if (!addressPhoto) return "Address Proof Photo is required.";
    } else if (step === "bank_passbook") {
      if (!bankPhoto) return "Bank Passbook Photo is required.";
    }
    return null;
  };

  const validateAndNext = () => {
    setError("");
    setSuccessMessage("");

    const currentErr = checkStepValidation(currentStep);
    if (currentErr) {
      setError(currentErr);
      return;
    }

    if (currentStep === "profile") setCurrentStep("aadhaar");
    else if (currentStep === "aadhaar") setCurrentStep("pan");
    else if (currentStep === "pan") setCurrentStep("driving_licence");
    else if (currentStep === "driving_licence") setCurrentStep("address_proof");
    else if (currentStep === "address_proof") setCurrentStep("bank_passbook");
  };

  const handlePrevious = () => {
    setError("");
    setSuccessMessage("");
    if (currentStep === "bank_passbook") setCurrentStep("address_proof");
    else if (currentStep === "address_proof") setCurrentStep("driving_licence");
    else if (currentStep === "driving_licence") setCurrentStep("pan");
    else if (currentStep === "pan") setCurrentStep("aadhaar");
    else if (currentStep === "aadhaar") setCurrentStep("profile");
    else onBackToLogin();
  };

  const handleStepClick = (targetStep: OnboardingStep) => {
    setError("");
    setSuccessMessage("");
    const stepsSequence: OnboardingStep[] = ["profile", "aadhaar", "pan", "driving_licence", "address_proof", "bank_passbook"];
    const targetIdx = stepsSequence.indexOf(targetStep);
    const currentIdx = stepsSequence.indexOf(currentStep);

    if (targetIdx <= currentIdx) {
      setCurrentStep(targetStep);
      return;
    }

    // Check all preceding steps before jumping forward
    for (let i = 0; i < targetIdx; i++) {
      const stepValErr = checkStepValidation(stepsSequence[i]);
      if (stepValErr) {
        setError(stepValErr);
        setCurrentStep(stepsSequence[i]);
        return;
      }
    }

    setCurrentStep(targetStep);
  };

  const handleSubmitForm = async () => {
    if (isLocked) {
      setError("Your documents have already been submitted successfully. To update any document, please contact the Admin.");
      return;
    }
    setError("");
    setSuccessMessage("");

    // Validate all 6 steps
    const stepsSequence: OnboardingStep[] = ["profile", "aadhaar", "pan", "driving_licence", "address_proof", "bank_passbook"];
    for (const step of stepsSequence) {
      const stepErr = checkStepValidation(step);
      if (stepErr) {
        setError(stepErr);
        setCurrentStep(step);
        return;
      }
    }

    const response = await onComplete({
      name: driverName.trim() || "Driver",
      phone: mobileNumber.replace(/\D/g, "").slice(-10),
      email: "",
      etmId: etmId.trim().toUpperCase(),
      driverId: driverId,
      aadhaarNo: aadhaarNo.replace(/\s/g, ""),
      panNo: panNo.toUpperCase().trim(),
      dlNo: dlNo.toUpperCase().trim(),
      dob: "",
      emergencyContact: "",
      vehicleNo: "",
      vehicleModel: "",
      addressText: addressText.trim(),
      documents: {
        selfie: selfie || "",
        aadhaarPhoto: aadhaarPhoto || "",
        aadhaarBackPhoto: aadhaarBackPhoto || "",
        panPhoto: panPhoto || "",
        dlPhoto: dlPhoto || "",
        dlBackPhoto: dlBackPhoto || "",
        addressPhoto: addressPhoto || "",
        bankPhoto: bankPhoto || "",
        policePhoto: ""
      }
    });

    if (response.success) {
      setSuccessMessage(response.message || "Documents submitted successfully. Verification status: Pending.");
    } else {
      setError(response.message || "Documents could not be saved. Please try again.");
    }
  };

  const activeStepObj = stepsList.find(s => s.id === currentStep);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="flex-1 flex flex-col bg-[#08182D] text-white overflow-y-auto no-scrollbar relative select-none"
    >
      {/* Locked Header Banner if already submitted */}
      {isLocked && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 p-3.5 px-4 flex items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Documents Locked
              </p>
              <p className="text-[10px] text-amber-200/90 font-semibold leading-tight">
                Your documents have already been submitted successfully. Verification status: Pending.
              </p>
            </div>
          </div>
          <span className="bg-amber-400 text-[#08182D] text-[9px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 shadow-sm">
            Read Only
          </span>
        </div>
      )}

      {/* Header Bar */}
      <div className="px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 border-b border-slate-800 flex items-center justify-between bg-[#0C1E35] sticky top-0 z-40 shrink-0">
        <button
          onClick={handlePrevious}
          disabled={isSubmitting}
          className="p-1.5 rounded-full hover:bg-slate-800 text-amber-200 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center flex-1 pr-6 flex items-center justify-center gap-2">
          <img
            src="/ssk_logo.png"
            alt="SSK Logo"
            className="w-7 h-7 object-contain shrink-0 drop-shadow-sm"
            referrerPolicy="no-referrer"
          />
          <div>
            <h2 className="text-sm font-black tracking-widest text-[#D5A144] uppercase font-sans">
              Driver Onboarding
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              {activeStepObj?.title} ({activeStepObj?.stepNumber} of 6)
            </p>
          </div>
        </div>
      </div>

      {/* Step Tracker (1 to 6) */}
      <div className="px-3 py-3 bg-[#0A1A2E] border-b border-slate-800/80 flex justify-between items-center shrink-0 overflow-x-auto no-scrollbar gap-1">
        {stepsList.map((st, sIdx) => {
          const isCompleted = stepsList.findIndex(s => s.id === currentStep) > sIdx;
          const isActive = currentStep === st.id;

          return (
            <React.Fragment key={st.id}>
              <div
                onClick={() => handleStepClick(st.id)}
                className="flex flex-col items-center relative cursor-pointer shrink-0"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold ${
                    isCompleted
                      ? "bg-[#00C853] text-white shadow-sm"
                      : isActive
                      ? "bg-[#D5A144] text-[#08182D] font-black ring-4 ring-[#D5A144]/25 shadow-lg"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : st.stepNumber}
                </div>
                <span className={`text-[8.5px] font-bold mt-1 tracking-tight ${isActive ? "text-amber-300" : "text-slate-500"}`}>
                  {st.label}
                </span>
              </div>
              {sIdx < stepsList.length - 1 && (
                <div
                  className={`flex-1 h-0.5 min-w-[8px] mx-0.5 rounded-full transition-all duration-500 ${
                    stepsList.findIndex(s => s.id === currentStep) > sIdx
                      ? "bg-[#00C853]"
                      : "bg-slate-800"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Notifications / Errors */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-3 p-3 bg-rose-950/90 border border-rose-800 text-rose-200 rounded-xl flex items-start gap-2.5 shadow-md shrink-0"
          >
            <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
            <span className="text-[11px] font-bold leading-tight">{error}</span>
          </motion.div>
        )}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-3 p-3 bg-emerald-950/90 border border-emerald-800 text-emerald-200 rounded-xl flex items-start gap-2.5 shadow-md shrink-0"
          >
            <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-[11px] font-bold leading-tight">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Form */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto">
        {/* AUTOMATIC DRIVER INFORMATION CARD */}
        <div className="mb-4 bg-[#0C1E35] p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <h4 className="text-[11px] font-black text-amber-300 uppercase tracking-widest">
                Driver Registration Details
              </h4>
            </div>
            <span className="text-[9px] bg-amber-400/10 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-400/20">
              Verified User
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="bg-[#08182D] p-2.5 rounded-xl border border-slate-800">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Driver ID</p>
              <p className="font-extrabold text-amber-200 truncate">{driverId}</p>
            </div>
            <div className="bg-[#08182D] p-2.5 rounded-xl border border-slate-800">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ETM ID</p>
              <p className="font-extrabold text-amber-200 truncate">{etmId || "N/A"}</p>
            </div>
            <div className="bg-[#08182D] p-2.5 rounded-xl border border-slate-800">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Driver Name</p>
              <p className="font-extrabold text-slate-200 truncate">{driverName || "Driver"}</p>
            </div>
            <div className="bg-[#08182D] p-2.5 rounded-xl border border-slate-800">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Mobile Number</p>
              <p className="font-extrabold text-slate-200 truncate">{mobileNumber}</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1 — PROFILE PHOTO */}
          {currentStep === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-[#0C1E35] p-5 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-widest mb-1 flex items-center justify-between">
                  <span>STEP 1 — PROFILE PHOTO *</span>
                  {isLocked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                </h3>
                <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-5">
                  Upload a clear, front-facing profile photo of the driver for identification.
                </p>

                {selfie ? (
                  <div className="space-y-3">
                    <div className="relative w-44 h-44 mx-auto rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-xl group">
                      <img src={selfie} alt="Profile Photo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: selfie, title: "Profile Photo" })}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1.5 transition-opacity"
                      >
                        <Eye className="w-4 h-4" /> Preview Photo
                      </button>
                    </div>
                    {!isLocked && (
                      <div className="text-center">
                        <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider underline cursor-pointer">
                          Change Profile Photo
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setSelfie)} />
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center bg-[#08182D]/60 hover:border-amber-400/50 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400 mb-3">
                      <Camera className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 mb-1">Upload Profile Photo</span>
                    <span className="text-[10px] text-slate-400 text-center mb-4 max-w-xs">JPG, PNG or WEBP up to 8MB. Ensure full face is clearly visible.</span>
                    <label className="bg-gradient-to-r from-amber-400 to-[#D5A144] text-[#08182D] text-xs font-black uppercase px-5 py-2.5 rounded-xl cursor-pointer shadow-md hover:brightness-110 transition-all flex items-center gap-2">
                      <UploadCloud className="w-4 h-4" />
                      <span>Browse Photo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setSelfie)} disabled={isLocked} />
                    </label>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2 — AADHAAR CARD */}
          {currentStep === "aadhaar" && (
            <motion.div
              key="aadhaar"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-[#0C1E35] p-5 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-widest mb-1">
                  STEP 2 — AADHAAR CARD
                </h3>
                <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-4">
                  Provide your 12-digit Aadhaar Card Number and upload both Front and Back photos.
                </p>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Aadhaar Number *
                  </label>
                  <input
                    type="tel"
                    maxLength={14}
                    value={aadhaarNo}
                    onChange={handleAadhaarChange}
                    readOnly={isLocked}
                    placeholder="0000 0000 0000"
                    className={`w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-3 px-3.5 text-xs font-bold tracking-widest focus:outline-none focus:border-amber-400 ${isLocked ? "opacity-80 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>

              {/* Aadhaar Photos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0C1E35] p-3.5 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-amber-300 uppercase mb-2">Aadhaar Front Photo *</p>
                  {aadhaarPhoto ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 group">
                      <img src={aadhaarPhoto} alt="Aadhaar Front" className="w-full h-full object-cover" />
                      <button onClick={() => setPreviewImage({ url: aadhaarPhoto, title: "Aadhaar Front" })} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold gap-1">
                        <Eye className="w-4 h-4" /> Preview
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-[10px] text-slate-400 cursor-pointer hover:border-amber-400/50">
                      <UploadCloud className="w-5 h-5 text-amber-400 mb-1" />
                      <span className="font-bold">Upload Front</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setAadhaarPhoto)} disabled={isLocked} />
                    </label>
                  )}
                </div>

                <div className="bg-[#0C1E35] p-3.5 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-amber-300 uppercase mb-2">Aadhaar Back Photo *</p>
                  {aadhaarBackPhoto ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 group">
                      <img src={aadhaarBackPhoto} alt="Aadhaar Back" className="w-full h-full object-cover" />
                      <button onClick={() => setPreviewImage({ url: aadhaarBackPhoto, title: "Aadhaar Back" })} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold gap-1">
                        <Eye className="w-4 h-4" /> Preview
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-[10px] text-slate-400 cursor-pointer hover:border-amber-400/50">
                      <UploadCloud className="w-5 h-5 text-amber-400 mb-1" />
                      <span className="font-bold">Upload Back</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setAadhaarBackPhoto)} disabled={isLocked} />
                    </label>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3 — PAN CARD */}
          {currentStep === "pan" && (
            <motion.div
              key="pan"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-[#0C1E35] p-5 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-widest mb-1">
                  STEP 3 — PAN CARD
                </h3>
                <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-4">
                  Enter your 10-character PAN Card Number and upload a clear photo of the PAN Card.
                </p>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    PAN Number *
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={panNo}
                    onChange={(e) => !isLocked && setPanNo(e.target.value.toUpperCase())}
                    readOnly={isLocked}
                    placeholder="ABCDE1234F"
                    className={`w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-3 px-3.5 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-amber-400 ${isLocked ? "opacity-80 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>

              {/* PAN Photo */}
              <div className="bg-[#0C1E35] p-4 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-bold text-amber-300 uppercase mb-2">PAN Card Photo *</p>
                {panPhoto ? (
                  <div className="relative aspect-video max-w-sm mx-auto rounded-xl overflow-hidden border border-slate-700 group">
                    <img src={panPhoto} alt="PAN Card" className="w-full h-full object-cover" />
                    <button onClick={() => setPreviewImage({ url: panPhoto, title: "PAN Card Photo" })} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold gap-1">
                      <Eye className="w-4 h-4" /> Preview Photo
                    </button>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-[10px] text-slate-400 cursor-pointer hover:border-amber-400/50">
                    <UploadCloud className="w-6 h-6 text-amber-400 mb-1.5" />
                    <span className="font-bold text-xs text-slate-200">Upload PAN Card Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setPanPhoto)} disabled={isLocked} />
                  </label>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 4 — DRIVING LICENCE */}
          {currentStep === "driving_licence" && (
            <motion.div
              key="driving_licence"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-[#0C1E35] p-5 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-widest mb-1">
                  STEP 4 — DRIVING LICENCE
                </h3>
                <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-4">
                  Enter your Driving Licence Number and upload Front and Back photos of the licence.
                </p>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Driving Licence Number *
                  </label>
                  <input
                    type="text"
                    value={dlNo}
                    onChange={(e) => !isLocked && setDlNo(e.target.value.toUpperCase())}
                    readOnly={isLocked}
                    placeholder="e.g. MH0220210084512"
                    className={`w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-3 px-3.5 text-xs font-bold uppercase focus:outline-none focus:border-amber-400 ${isLocked ? "opacity-80 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>

              {/* DL Photos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0C1E35] p-3.5 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-amber-300 uppercase mb-2">DL Front Photo *</p>
                  {dlPhoto ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 group">
                      <img src={dlPhoto} alt="DL Front" className="w-full h-full object-cover" />
                      <button onClick={() => setPreviewImage({ url: dlPhoto, title: "Driving Licence Front" })} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold gap-1">
                        <Eye className="w-4 h-4" /> Preview
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-[10px] text-slate-400 cursor-pointer hover:border-amber-400/50">
                      <UploadCloud className="w-5 h-5 text-amber-400 mb-1" />
                      <span className="font-bold">Upload Front</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setDlPhoto)} disabled={isLocked} />
                    </label>
                  )}
                </div>

                <div className="bg-[#0C1E35] p-3.5 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-amber-300 uppercase mb-2">DL Back Photo *</p>
                  {dlBackPhoto ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 group">
                      <img src={dlBackPhoto} alt="DL Back" className="w-full h-full object-cover" />
                      <button onClick={() => setPreviewImage({ url: dlBackPhoto, title: "Driving Licence Back" })} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold gap-1">
                        <Eye className="w-4 h-4" /> Preview
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-[10px] text-slate-400 cursor-pointer hover:border-amber-400/50">
                      <UploadCloud className="w-5 h-5 text-amber-400 mb-1" />
                      <span className="font-bold">Upload Back</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setDlBackPhoto)} disabled={isLocked} />
                    </label>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5 — ADDRESS PROOF */}
          {currentStep === "address_proof" && (
            <motion.div
              key="address_proof"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-[#0C1E35] p-5 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-widest mb-1">
                  STEP 5 — ADDRESS PROOF
                </h3>
                <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-4">
                  Enter full residential address details and upload an Address Proof document photo (Utility bill / Rent agreement / Voter ID / Address proof copy).
                </p>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Address Proof Text / Full Address *
                  </label>
                  <textarea
                    rows={3}
                    value={addressText}
                    onChange={(e) => !isLocked && setAddressText(e.target.value)}
                    readOnly={isLocked}
                    placeholder="House No., Street, Landmark, City, State, Pincode"
                    className={`w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-2.5 px-3.5 text-xs font-medium focus:outline-none focus:border-amber-400 ${isLocked ? "opacity-80 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>

              {/* Address Photo */}
              <div className="bg-[#0C1E35] p-4 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-bold text-amber-300 uppercase mb-2">Address Proof Photo *</p>
                {addressPhoto ? (
                  <div className="relative aspect-video max-w-sm mx-auto rounded-xl overflow-hidden border border-slate-700 group">
                    <img src={addressPhoto} alt="Address Proof" className="w-full h-full object-cover" />
                    <button onClick={() => setPreviewImage({ url: addressPhoto, title: "Address Proof Photo" })} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold gap-1">
                      <Eye className="w-4 h-4" /> Preview Photo
                    </button>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-[10px] text-slate-400 cursor-pointer hover:border-amber-400/50">
                    <UploadCloud className="w-6 h-6 text-amber-400 mb-1.5" />
                    <span className="font-bold text-xs text-slate-200">Upload Address Proof Document Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setAddressPhoto)} disabled={isLocked} />
                  </label>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 6 — BANK PASSBOOK */}
          {currentStep === "bank_passbook" && (
            <motion.div
              key="bank_passbook"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-[#0C1E35] p-5 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-widest mb-1">
                  STEP 6 — BANK PASSBOOK
                </h3>
                <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-4">
                  Upload a clear photo or copy of your Bank Passbook or cancelled cheque displaying account details for driver payouts.
                </p>

                {/* Bank Passbook Photo */}
                {bankPhoto ? (
                  <div className="space-y-3">
                    <div className="relative aspect-video max-w-sm mx-auto rounded-xl overflow-hidden border-2 border-amber-400/50 shadow-xl group">
                      <img src={bankPhoto} alt="Bank Passbook" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: bankPhoto, title: "Bank Passbook Photo" })}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1.5 transition-opacity"
                      >
                        <Eye className="w-4 h-4" /> Preview Passbook
                      </button>
                    </div>
                    {!isLocked && (
                      <div className="text-center">
                        <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider underline cursor-pointer">
                          Change Bank Passbook Photo
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setBankPhoto)} />
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center bg-[#08182D]/60 hover:border-amber-400/50 transition-colors cursor-pointer">
                    <div className="w-14 h-14 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400 mb-3">
                      <Landmark className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 mb-1">Upload Bank Passbook Photo *</span>
                    <span className="text-[10px] text-slate-400 text-center mb-4 max-w-xs">Clear image of passbook front page with Account Number & IFSC Code visible.</span>
                    <span className="bg-gradient-to-r from-amber-400 to-[#D5A144] text-[#08182D] text-xs font-black uppercase px-5 py-2.5 rounded-xl cursor-pointer shadow-md hover:brightness-110 transition-all flex items-center gap-2">
                      <UploadCloud className="w-4 h-4" />
                      <span>Browse Passbook Photo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setBankPhoto)} disabled={isLocked} />
                    </span>
                  </label>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-[#0A1A2E] border-t border-slate-800 flex items-center justify-between sticky bottom-0 z-40 gap-3">
        {currentStep !== "profile" && (
          <button
            type="button"
            onClick={handlePrevious}
            disabled={isSubmitting}
            className="flex-1 bg-slate-800 border border-slate-700 text-amber-300 rounded-xl py-3 text-xs font-extrabold uppercase hover:bg-slate-700 transition-colors"
          >
            Previous
          </button>
        )}

        {isLocked ? (
          <div className="flex-1 bg-slate-800/80 border border-amber-500/30 text-amber-300 rounded-xl py-3 text-xs font-extrabold uppercase flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Documents Submitted & Locked</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={currentStep === "bank_passbook" ? handleSubmitForm : validateAndNext}
            disabled={isSubmitting}
            className="flex-2 bg-gradient-to-r from-amber-400 to-[#D5A144] text-[#08182D] rounded-xl py-3 text-xs font-black uppercase flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Documents...</span>
              </>
            ) : currentStep === "bank_passbook" ? (
              <>
                <CheckCircle className="w-4.5 h-4.5" />
                <span>SUBMIT DOCUMENTS</span>
              </>
            ) : (
              <>
                <span>NEXT</span>
                <ArrowRight className="w-4.5 h-4.5" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4"
          >
            <div className="max-w-md w-full bg-[#0C1E35] border border-slate-700 rounded-2xl overflow-hidden p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-amber-300 uppercase">{previewImage.title}</h4>
                <button onClick={() => setPreviewImage(null)} className="text-xs font-bold text-slate-400 hover:text-white">Close ✕</button>
              </div>
              <img src={previewImage.url} alt={previewImage.title} className="w-full h-auto max-h-[70vh] object-contain rounded-xl" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
