import React, { useState, useEffect } from "react";
import { 
  User, 
  Menu, 
  Phone, 
  Mail, 
  RefreshCw, 
  Edit3, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Lock, 
  FileText, 
  Eye, 
  Check, 
  Upload,
  X,
  Sun,
  Moon
} from "lucide-react";
import { DriverDetails, DriverDocumentRecord } from "../types";
import PullToRefresh from "./PullToRefresh";
import { DISPLAY_VERSION, APP_VERSION } from "../lib/version";

interface ProfileScreenProps {
  driver: DriverDetails | null;
  documentRecord?: DriverDocumentRecord | null;
  onRefresh: () => Promise<void>;
  syncState?: 'idle' | 'syncing' | 'synced' | 'failed';
  onOpenDrawer: () => void;
  onUpdateDriver?: (updatedFields: Partial<DriverDetails>) => Promise<void>;
  onOpenOnboarding?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function ProfileScreen({
  driver,
  documentRecord = null,
  onRefresh,
  syncState,
  onOpenDrawer,
  onUpdateDriver,
  onOpenOnboarding,
  isDarkMode = false,
  onToggleDarkMode
}: ProfileScreenProps) {
  const name = driver?.name || driver?.Driver_Name || driver?.Name || "Driver Partner";
  const driverId = driver?.id || "N/A";
  const mobile = driver?.phone || "N/A";
  const email = driver?.email || "N/A";
  const status = driver?.status || driver?.Status || "Active";
  const etm = driver?.etm || "N/A";
  const vehicleReg = driver?.vehicleRegistration || "N/A";
  const licenseNo = driver?.licenseNumber || "N/A";

  const [isEditing, setIsEditing] = useState(false);
  const [formName, setFormName] = useState(name);
  const [formMobile, setFormMobile] = useState(mobile === "N/A" ? "" : mobile);
  const [formEmail, setFormEmail] = useState(email === "N/A" ? "" : email);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  useEffect(() => {
    setFormName(name);
    setFormMobile(mobile === "N/A" ? "" : mobile);
    setFormEmail(email === "N/A" ? "" : email);
  }, [driver]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMobile.trim()) {
      setStatusFeedback({ message: "Mobile number is required.", type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setStatusFeedback(null);

    try {
      if (onUpdateDriver) {
        await onUpdateDriver({
          name: formName.trim(),
          phone: formMobile.trim(),
          email: formEmail.trim(),
        });
      }
      setIsSubmitting(false);
      setIsEditing(false);
      setStatusFeedback({ message: "Profile updated and synced with Google Sheet!", type: 'success' });
      setTimeout(() => setStatusFeedback(null), 4000);
    } catch (err: any) {
      setIsSubmitting(false);
      setStatusFeedback({ message: err?.message || "Failed to update profile.", type: 'error' });
    }
  };

  const handleEditLockedDocument = () => {
    setStatusFeedback({
      message: "Your documents have already been submitted successfully. To update any document, please contact the Admin.",
      type: "error"
    });
    setTimeout(() => setStatusFeedback(null), 6000);
  };

  const isLocked = documentRecord?.isLocked ?? true;

  const docItems = [
    {
      id: "profile_photo",
      title: "Profile Photo",
      url: documentRecord?.profilePhotoUrl || driver?.avatarUrl,
      subText: "Face Selfie Identification"
    },
    {
      id: "aadhaar_card",
      title: "Aadhaar Card",
      url: documentRecord?.aadhaarFrontUrl || documentRecord?.aadhaarBackUrl,
      subText: documentRecord?.aadhaarNumber ? `No: ${documentRecord.aadhaarNumber}` : "Government UIDAI Card"
    },
    {
      id: "pan_card",
      title: "PAN Card",
      url: documentRecord?.panCardUrl,
      subText: documentRecord?.panNumber ? `No: ${documentRecord.panNumber}` : "Permanent Account Number"
    },
    {
      id: "driving_license",
      title: "Driving License",
      url: documentRecord?.dlFrontUrl || documentRecord?.dlBackUrl,
      subText: documentRecord?.dlNumber ? `No: ${documentRecord.dlNumber}` : `No: ${licenseNo}`
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#F4F6F9] dark:bg-slate-950 text-[#333333] dark:text-slate-100 relative overflow-hidden transition-colors duration-200">
      {/* 1. Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs select-none relative shrink-0 transition-colors duration-200">
        <button
          onClick={onOpenDrawer}
          className="lg:hidden p-1 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 rounded-lg transition-all text-[#0A2540] dark:text-slate-100 cursor-pointer"
          title="Open Menu"
          id="btn-open-menu-profile"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-extrabold text-[#0A2540] dark:text-white mx-auto lg:mx-0">Driver Profile</h2>
        <button
          onClick={onRefresh}
          disabled={syncState === 'syncing'}
          className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 rounded-lg transition-all text-[#0A2540] dark:text-slate-100 cursor-pointer"
          title="Refresh Data"
          id="btn-refresh-profile"
        >
          <RefreshCw className={`w-5 h-5 ${syncState === 'syncing' ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
        </button>
      </div>

      <PullToRefresh onRefresh={onRefresh} syncState={syncState}>
        <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col gap-4 pb-20 max-w-4xl lg:max-w-5xl mx-auto w-full">
          
          {/* Status Feedback Banner */}
          {statusFeedback && (
            <div className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-xs border animate-fade-in ${
              statusFeedback.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`} id="banner-profile-feedback">
              {statusFeedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span className="flex-1">{statusFeedback.message}</span>
            </div>
          )}

          {/* Main Profile Header Card */}
          <div className="w-full bg-gradient-to-br from-[#08182D] to-[#0D47A1] dark:from-slate-900 dark:to-blue-950 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden border border-white/10">
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                {documentRecord?.profilePhotoUrl || driver?.avatarUrl ? (
                  <img src={documentRecord?.profilePhotoUrl || driver?.avatarUrl} alt={name} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  <User className="w-9 h-9 text-blue-200" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {status}
                  </span>
                  <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">
                    Driver Partner
                  </span>
                </div>
                <h3 className="text-xl font-black text-white truncate tracking-tight">{name}</h3>
                <p className="text-xs text-blue-200 font-medium font-mono mt-0.5">ID: {driverId}</p>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/15">
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
                <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">ETM ID</span>
                <span className="text-sm font-black text-white font-mono">{etm}</span>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
                <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">Vehicle Reg</span>
                <span className="text-sm font-black text-white font-mono truncate block">{vehicleReg}</span>
              </div>
            </div>
          </div>

          {/* App Preferences & Global Dark Mode Toggle Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-100 dark:border-slate-800 space-y-4 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">App Preferences</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-semibold">Customize app theme and interface</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/80 rounded-2xl border border-slate-100/80 dark:border-slate-700/80 flex items-center justify-between transition-colors duration-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-100 text-blue-700'
                }`}>
                  {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Dark Mode</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
                    {isDarkMode ? 'Dark theme is active' : 'Switch to dark theme'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleDarkMode}
                id="toggle-dark-mode"
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isDarkMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={isDarkMode}
                title="Toggle Dark Mode"
              >
                <span className="sr-only">Toggle dark mode</span>
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out flex items-center justify-center ${
                    isDarkMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                >
                  {isDarkMode ? (
                    <Moon className="w-3.5 h-3.5 text-blue-900" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Contact Details & Edit Form Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-100 dark:border-slate-800 space-y-4 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Contact Information</h4>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setFormName(name);
                    setFormMobile(mobile === "N/A" ? "" : mobile);
                    setFormEmail(email === "N/A" ? "" : email);
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95"
                  id="btn-edit-profile-trigger"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
            
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-3.5 pt-1" id="form-edit-profile">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Driver Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Driver full name"
                      id="input-profile-name"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Mobile Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={formMobile}
                      onChange={(e) => setFormMobile(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-extrabold font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="10-digit mobile number"
                      id="input-profile-mobile"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Email Address (Optional)</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@example.com"
                      id="input-profile-email"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-[#0D47A1] hover:bg-blue-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    id="btn-save-profile"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Syncing to Sheet...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Profile</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    id="btn-cancel-edit-profile"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/80">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">Mobile Number</p>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-mono">{mobile}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/80">
                  <div className="p-2.5 bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">Email Address</p>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{email || "Not Provided"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Driver Documents Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-100 dark:border-slate-800 space-y-4 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Driver Documents</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-semibold">Submitted verification records</p>
              </div>

              {isLocked ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/80 text-amber-800 dark:text-amber-300">
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Locked by Admin</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenOnboarding}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload / Update</span>
                </button>
              )}
            </div>

            {/* List of Documents */}
            <div className="grid grid-cols-1 gap-2.5">
              {docItems.map((doc) => {
                const hasFile = !!doc.url;

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-slate-50/80 dark:bg-slate-800/80 rounded-2xl border border-slate-100/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasFile ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                        <FileText className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">{doc.title}</p>
                          {hasFile ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[9px] font-black uppercase flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Uploaded
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-[9px] font-black uppercase">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 font-semibold truncate mt-0.5">{doc.subText}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {hasFile && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ title: doc.title, url: doc.url! })}
                          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      )}

                      {isLocked ? (
                        <button
                          type="button"
                          onClick={handleEditLockedDocument}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Locked"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onOpenOnboarding}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Document"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* App Settings, About & Version Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-100 dark:border-slate-800 space-y-3 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">About & App Settings</h4>
                <p className="text-[10px] text-slate-400 font-semibold">System information & version controls</p>
              </div>
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/80 text-[#0A2540] dark:text-blue-300 rounded-full text-xs font-black border border-blue-200/80 dark:border-blue-800">
                {DISPLAY_VERSION}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700 dark:text-slate-200">App Version (package.json)</span>
              <span className="font-mono font-black text-[#0A2540] dark:text-blue-300">{DISPLAY_VERSION}</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700 dark:text-slate-200">SSK Fleet App Build</span>
              <span className="font-mono text-slate-500 dark:text-slate-400">Release v{APP_VERSION}</span>
            </div>
          </div>

        </div>
      </PullToRefresh>

      {/* Lightbox Document Viewer */}
      {previewDoc && (
        <div
          onClick={() => setPreviewDoc(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-lg w-full max-h-[85vh] flex flex-col gap-3 shadow-2xl relative border border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">{previewDoc.title}</h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center p-2 min-h-[250px]">
              {previewDoc.url.startsWith("http") || previewDoc.url.startsWith("data:image") ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-w-full max-h-[60vh] object-contain rounded-xl"
                />
              ) : (
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  Open Document Link ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

