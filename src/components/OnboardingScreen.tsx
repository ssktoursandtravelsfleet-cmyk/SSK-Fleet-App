import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  FileText, 
  UploadCloud, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  CreditCard, 
  Camera, 
  Loader2, 
  Lock, 
  ShieldCheck, 
  PhoneCall, 
  Car, 
  Eye, 
  Image as ImageIcon 
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
  }) => Promise<void>;
  onBackToLogin: () => void;
  isSubmitting: boolean;
}

type OnboardingStep = "personal" | "identity" | "dl_vehicle" | "bank_police";

export default function OnboardingScreen({
  initialPhone,
  initialEtm = "",
  existingDocRecord = null,
  onComplete,
  onBackToLogin,
  isSubmitting
}: OnboardingScreenProps) {
  const isLocked = existingDocRecord?.isLocked === true;

  const [currentStep, setCurrentStep] = useState<OnboardingStep>("personal");
  const [error, setError] = useState("");
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Personal Info State
  const [name, setName] = useState(existingDocRecord?.driverName || "");
  const [phone, setPhone] = useState(existingDocRecord?.mobileNumber || initialPhone || "");
  const [etmId, setEtmId] = useState(existingDocRecord?.etmId || initialEtm || "");
  const [email, setEmail] = useState("");
  const [selfie, setSelfie] = useState<string | null>(existingDocRecord?.profilePhotoUrl || null);

  // Identity State (Aadhaar, PAN, DOB)
  const [aadhaarNo, setAadhaarNo] = useState(existingDocRecord?.aadhaarNumber || "");
  const [aadhaarPhoto, setAadhaarPhoto] = useState<string | null>(existingDocRecord?.aadhaarFrontUrl || null);
  const [aadhaarBackPhoto, setAadhaarBackPhoto] = useState<string | null>(existingDocRecord?.aadhaarBackUrl || null);
  const [panNo, setPanNo] = useState(existingDocRecord?.panNumber || "");
  const [panPhoto, setPanPhoto] = useState<string | null>(existingDocRecord?.panCardUrl || null);
  const [dob, setDob] = useState(existingDocRecord?.dob || "");

  // DL & Vehicle State
  const [dlNo, setDlNo] = useState(existingDocRecord?.dlNumber || "");
  const [dlPhoto, setDlPhoto] = useState<string | null>(existingDocRecord?.dlFrontUrl || null);
  const [dlBackPhoto, setDlBackPhoto] = useState<string | null>(existingDocRecord?.dlBackUrl || null);
  const [emergencyContact, setEmergencyContact] = useState(existingDocRecord?.emergencyContact || "");
  const [vehicleNo, setVehicleNo] = useState(existingDocRecord?.vehicleNumber || "");
  const [vehicleModel, setVehicleModel] = useState(existingDocRecord?.vehicleModel || "");

  // Address, Bank & Police Verification
  const [addressText, setAddressText] = useState(existingDocRecord?.address || "");
  const [addressPhoto, setAddressPhoto] = useState<string | null>(existingDocRecord?.bankPassbookUrl || null);
  const [bankPhoto, setBankPhoto] = useState<string | null>(existingDocRecord?.bankPassbookUrl || null);
  const [policePhoto, setPolicePhoto] = useState<string | null>(existingDocRecord?.policeVerificationUrl || null);

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
      if (file.size > 5 * 1024 * 1024) {
        setError("File size should be less than 5MB");
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (
    e: React.DragEvent,
    setter: (val: string | null) => void
  ) => {
    e.preventDefault();
    if (isLocked) {
      setError("Your documents have already been submitted successfully. To update any document, please contact the Admin.");
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size should be less than 5MB");
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

  const triggerCameraEmulation = (setter: (val: string | null) => void) => {
    if (isLocked) {
      setError("Your documents have already been submitted successfully. To update any document, please contact the Admin.");
      return;
    }
    const mockAvatars = [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80"
    ];
    const chosen = mockAvatars[Math.floor(Math.random() * mockAvatars.length)];
    setter(chosen);
    setError("");
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

  const validateAndNext = () => {
    setError("");
    if (currentStep === "personal") {
      if (!name.trim()) {
        setError("Full Name is required");
        return;
      }
      if (!phone || phone.length < 10) {
        setError("Please enter a valid 10-digit phone number");
        return;
      }
      if (!selfie) {
        setError("Please upload or capture a profile photo");
        return;
      }
      setCurrentStep("identity");
    } else if (currentStep === "identity") {
      const plainAadhaar = aadhaarNo.replace(/\s/g, "");
      if (plainAadhaar.length !== 12) {
        setError("Aadhaar Number must be exactly 12 digits");
        return;
      }
      if (!aadhaarPhoto) {
        setError("Please upload Aadhaar Front Copy");
        return;
      }
      if (!panNo.trim() || panNo.trim().length < 10) {
        setError("Please enter a valid 10-character PAN Card number");
        return;
      }
      setCurrentStep("dl_vehicle");
    } else if (currentStep === "dl_vehicle") {
      if (dlNo.trim().length < 6) {
        setError("Please enter a valid Driving License number");
        return;
      }
      if (!dlPhoto) {
        setError("Please upload Driving License Front Photo");
        return;
      }
      setCurrentStep("bank_police");
    }
  };

  const handleSubmitForm = async () => {
    if (isLocked) {
      setError("Your documents have already been submitted successfully. To update any document, please contact the Admin.");
      return;
    }
    setError("");
    if (!addressText.trim()) {
      setError("Please write full residential address");
      return;
    }

    await onComplete({
      name,
      phone,
      email,
      etmId,
      aadhaarNo: aadhaarNo.replace(/\s/g, ""),
      panNo: panNo.toUpperCase().trim(),
      dlNo: dlNo.toUpperCase().trim(),
      dob,
      emergencyContact,
      vehicleNo: vehicleNo.toUpperCase().trim(),
      vehicleModel,
      addressText,
      documents: {
        selfie: selfie || "",
        aadhaarPhoto: aadhaarPhoto || "",
        aadhaarBackPhoto: aadhaarBackPhoto || "",
        panPhoto: panPhoto || "",
        dlPhoto: dlPhoto || "",
        dlBackPhoto: dlBackPhoto || "",
        addressPhoto: addressPhoto || "",
        bankPhoto: bankPhoto || "",
        policePhoto: policePhoto || ""
      }
    });
  };

  const stepsList = [
    { id: "personal", label: "Profile", icon: User },
    { id: "identity", label: "Identity", icon: CreditCard },
    { id: "dl_vehicle", label: "DL & Vehicle", icon: FileText },
    { id: "bank_police", label: "Address & Bank", icon: MapPin }
  ];

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
                Document Locked
              </p>
              <p className="text-[10px] text-amber-200/90 font-semibold leading-tight">
                Your documents have already been submitted successfully. To update any document, please contact the Admin.
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
          onClick={() => {
            if (currentStep === "bank_police") setCurrentStep("dl_vehicle");
            else if (currentStep === "dl_vehicle") setCurrentStep("identity");
            else if (currentStep === "identity") setCurrentStep("personal");
            else onBackToLogin();
          }}
          disabled={isSubmitting}
          className="p-1.5 rounded-full hover:bg-slate-800 text-amber-200 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center flex-1 pr-6">
          <h2 className="text-sm font-black tracking-widest text-[#D5A144] uppercase font-sans">
            SSK Driver Onboarding
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            Step {stepsList.findIndex(s => s.id === currentStep) + 1} of 4: {stepsList.find(s => s.id === currentStep)?.label}
          </p>
        </div>
      </div>

      {/* Step Tracker */}
      <div className="px-5 py-3.5 bg-[#0A1A2E] border-b border-slate-800/80 flex justify-between items-center shrink-0">
        {stepsList.map((st, sIdx) => {
          const StepIcon = st.icon;
          const isCompleted = stepsList.findIndex(s => s.id === currentStep) > sIdx;
          const isActive = currentStep === st.id;

          return (
            <React.Fragment key={st.id}>
              <div
                onClick={() => setCurrentStep(st.id as OnboardingStep)}
                className="flex flex-col items-center relative cursor-pointer"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#00C853] text-white shadow-sm"
                      : isActive
                      ? "bg-[#D5A144] text-[#08182D] font-bold ring-4 ring-[#D5A144]/25 shadow-lg"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {isCompleted ? <Check className="w-4.5 h-4.5 stroke-[3]" /> : <StepIcon className="w-4 h-4" />}
                </div>
              </div>
              {sIdx < stepsList.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-500 ${
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

      {/* Error Banner */}
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
      </AnimatePresence>

      {/* Main Content Form */}
      <div className="flex-1 p-5 overflow-y-auto">
        <AnimatePresence mode="wait">
          {currentStep === "personal" && (
            <motion.div
              key="personal"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-[#0C1E35] p-4 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-1">
                  Driver Personal Details
                </h3>
                <p className="text-slate-400 text-[10px] font-medium leading-relaxed mb-4">
                  Enter official driver information as registered with fleet administration.
                </p>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Driver Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={name}
                      onChange={(e) => !isLocked && setName(e.target.value)}
                      readOnly={isLocked}
                      className={`w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:outline-none focus:border-amber-400 ${isLocked ? "opacity-80 cursor-not-allowed" : ""}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => !isLocked && setPhone(e.target.value.replace(/\D/g, ""))}
                      readOnly={isLocked || !!initialPhone}
                      className="w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-2.5 px-3.5 text-xs font-semibold opacity-80 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      ETM ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ETM-8820"
                      value={etmId}
                      onChange={(e) => !isLocked && setEtmId(e.target.value.toUpperCase())}
                      readOnly={isLocked}
                      className={`w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-2.5 px-3.5 text-xs font-bold uppercase ${isLocked ? "opacity-80 cursor-not-allowed" : ""}`}
                    />
                  </div>
                </div>
              </div>

              {/* Profile Photo Upload */}
              <div className="bg-[#0C1E35] p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                    Driver Profile Photo *
                  </h3>
                  {isLocked && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>

                {selfie ? (
                  <div className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-amber-400/40 shadow-lg group">
                    <img src={selfie} alt="Profile Photo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: selfie, title: "Driver Profile Photo" })}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity"
                    >
                      <Eye className="w-4 h-4" /> View
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-700 rounded-2xl p-5 flex flex-col items-center justify-center bg-[#08182D]/40">
                    <Camera className="w-8 h-8 text-amber-300/80 mb-2" />
                    <span className="text-xs font-bold text-slate-200">Upload Driver Photo</span>
                    <label className="mt-3 bg-[#D5A144] text-[#08182D] text-[11px] font-black uppercase px-4 py-2 rounded-xl cursor-pointer">
                      Browse
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setSelfie)} disabled={isLocked} />
                    </label>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === "identity" && (
            <motion.div
              key="identity"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-[#0C1E35] p-4 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-1">
                  Aadhaar & PAN Details
                </h3>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Aadhaar Card Number *
                    </label>
                    <input
                      type="tel"
                      maxLength={14}
                      value={aadhaarNo}
                      onChange={handleAadhaarChange}
                      readOnly={isLocked}
                      placeholder="0000 0000 0000"
                      className={`w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-2.5 px-3.5 text-xs font-bold tracking-widest ${isLocked ? "opacity-80 cursor-not-allowed" : ""}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      PAN Card Number *
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={panNo}
                      onChange={(e) => !isLocked && setPanNo(e.target.value.toUpperCase())}
                      readOnly={isLocked}
                      placeholder="ABCDE1234F"
                      className={`w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-2.5 px-3.5 text-xs font-bold uppercase tracking-wider ${isLocked ? "opacity-80 cursor-not-allowed" : ""}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => !isLocked && setDob(e.target.value)}
                      readOnly={isLocked}
                      className={`w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-2.5 px-3.5 text-xs font-semibold ${isLocked ? "opacity-80 cursor-not-allowed" : ""}`}
                    />
                  </div>
                </div>
              </div>

              {/* Document Images */}
              <div className="grid grid-cols-2 gap-3">
                {/* Aadhaar Front */}
                <div className="bg-[#0C1E35] p-3 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-amber-300 uppercase mb-2">Aadhaar Front *</p>
                  {aadhaarPhoto ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 group">
                      <img src={aadhaarPhoto} alt="Aadhaar Front" className="w-full h-full object-cover" />
                      <button onClick={() => setPreviewImage({ url: aadhaarPhoto, title: "Aadhaar Front" })} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-[10px] text-slate-400 cursor-pointer">
                      <span>Upload Front</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setAadhaarPhoto)} disabled={isLocked} />
                    </label>
                  )}
                </div>

                {/* Aadhaar Back */}
                <div className="bg-[#0C1E35] p-3 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-amber-300 uppercase mb-2">Aadhaar Back</p>
                  {aadhaarBackPhoto ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 group">
                      <img src={aadhaarBackPhoto} alt="Aadhaar Back" className="w-full h-full object-cover" />
                      <button onClick={() => setPreviewImage({ url: aadhaarBackPhoto, title: "Aadhaar Back" })} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-[10px] text-slate-400 cursor-pointer">
                      <span>Upload Back</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setAadhaarBackPhoto)} disabled={isLocked} />
                    </label>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === "dl_vehicle" && (
            <motion.div
              key="dl_vehicle"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-[#0C1E35] p-4 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-1">
                  Driving License & Vehicle
                </h3>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Driving License Number *
                    </label>
                    <input
                      type="text"
                      value={dlNo}
                      onChange={(e) => !isLocked && setDlNo(e.target.value.toUpperCase())}
                      readOnly={isLocked}
                      placeholder="e.g. MH0220210084512"
                      className={`w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-2.5 px-3.5 text-xs font-bold uppercase ${isLocked ? "opacity-80 cursor-not-allowed" : ""}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      value={vehicleNo}
                      onChange={(e) => !isLocked && setVehicleNo(e.target.value.toUpperCase())}
                      readOnly={isLocked}
                      placeholder="e.g. MH02EZ9910"
                      className={`w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-2.5 px-3.5 text-xs font-bold uppercase ${isLocked ? "opacity-80 cursor-not-allowed" : ""}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Vehicle Model
                    </label>
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => !isLocked && setVehicleModel(e.target.value)}
                      readOnly={isLocked}
                      placeholder="e.g. WagonR CNG / Tata Tigor EV"
                      className={`w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-2.5 px-3.5 text-xs font-semibold ${isLocked ? "opacity-80 cursor-not-allowed" : ""}`}
                    />
                  </div>
                </div>
              </div>

              {/* DL Images */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0C1E35] p-3 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-amber-300 uppercase mb-2">DL Front *</p>
                  {dlPhoto ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 group">
                      <img src={dlPhoto} alt="DL Front" className="w-full h-full object-cover" />
                      <button onClick={() => setPreviewImage({ url: dlPhoto, title: "DL Front" })} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-[10px] text-slate-400 cursor-pointer">
                      <span>Upload Front</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setDlPhoto)} disabled={isLocked} />
                    </label>
                  )}
                </div>

                <div className="bg-[#0C1E35] p-3 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-amber-300 uppercase mb-2">DL Back</p>
                  {dlBackPhoto ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 group">
                      <img src={dlBackPhoto} alt="DL Back" className="w-full h-full object-cover" />
                      <button onClick={() => setPreviewImage({ url: dlBackPhoto, title: "DL Back" })} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-[10px] text-slate-400 cursor-pointer">
                      <span>Upload Back</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setDlBackPhoto)} disabled={isLocked} />
                    </label>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === "bank_police" && (
            <motion.div
              key="bank_police"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-[#0C1E35] p-4 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-1">
                  Address & Bank Documents
                </h3>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Full Residential Address *
                    </label>
                    <textarea
                      rows={2}
                      value={addressText}
                      onChange={(e) => !isLocked && setAddressText(e.target.value)}
                      readOnly={isLocked}
                      placeholder="House No, Street, Landmark, City, Pincode"
                      className={`w-full bg-[#08182D] border border-slate-700/60 rounded-xl py-2 px-3 text-xs font-semibold ${isLocked ? "opacity-80 cursor-not-allowed" : ""}`}
                    />
                  </div>
                </div>
              </div>

              {/* Bank & Police Uploads */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0C1E35] p-3 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-amber-300 uppercase mb-2">Bank Passbook / Cheque</p>
                  {bankPhoto ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 group">
                      <img src={bankPhoto} alt="Bank Document" className="w-full h-full object-cover" />
                      <button onClick={() => setPreviewImage({ url: bankPhoto, title: "Bank Document" })} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-[10px] text-slate-400 cursor-pointer">
                      <span>Upload Bank</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setBankPhoto)} disabled={isLocked} />
                    </label>
                  )}
                </div>

                <div className="bg-[#0C1E35] p-3 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-bold text-amber-300 uppercase mb-2">Police Verification</p>
                  {policePhoto ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 group">
                      <img src={policePhoto} alt="Police Verification" className="w-full h-full object-cover" />
                      <button onClick={() => setPreviewImage({ url: policePhoto, title: "Police Verification" })} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-[10px] text-slate-400 cursor-pointer">
                      <span>Upload Police Doc</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setPolicePhoto)} disabled={isLocked} />
                    </label>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-[#0A1A2E] border-t border-slate-800 flex items-center justify-between sticky bottom-0 z-40 gap-3">
        {currentStep !== "personal" && (
          <button
            type="button"
            onClick={() => {
              if (currentStep === "bank_police") setCurrentStep("dl_vehicle");
              else if (currentStep === "dl_vehicle") setCurrentStep("identity");
              else if (currentStep === "identity") setCurrentStep("personal");
            }}
            disabled={isSubmitting}
            className="flex-1 bg-slate-800 border border-slate-700 text-amber-300 rounded-xl py-3 text-xs font-extrabold uppercase"
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
            onClick={currentStep === "bank_police" ? handleSubmitForm : validateAndNext}
            disabled={isSubmitting}
            className="flex-2 bg-gradient-to-r from-amber-400 to-[#D5A144] text-[#08182D] rounded-xl py-3 text-xs font-black uppercase flex items-center justify-center gap-1.5 shadow-md"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving to Sheet & Drive...</span>
              </>
            ) : currentStep === "bank_police" ? (
              <>
                <CheckCircle className="w-4.5 h-4.5" />
                <span>Submit & Lock Documents</span>
              </>
            ) : (
              <>
                <span>Next Step</span>
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
            <div className="max-w-md w-full bg-[#0C1E35] border border-slate-700 rounded-2xl overflow-hidden p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-amber-300 uppercase">{previewImage.title}</h4>
                <button onClick={() => setPreviewImage(null)} className="text-xs font-bold text-slate-400">Close ✕</button>
              </div>
              <img src={previewImage.url} alt={previewImage.title} className="w-full h-auto max-h-[70vh] object-contain rounded-xl" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
