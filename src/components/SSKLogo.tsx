import React, { useState } from "react";
import sskLogoImg from "../assets/images/ssk_official_logo_transparent.png";

interface SSKLogoProps {
  className?: string;
  size?: number;
  lightText?: boolean;
}

export default function SSKLogo({ className = "", size }: SSKLogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return null;
  }

  return (
    <img
      src={sskLogoImg}
      alt="SSK Tours & Travels Fleet Partner Logo"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`object-contain mx-auto ${className}`}
      style={size ? { width: size, height: "auto", maxWidth: "100%" } : undefined}
    />
  );
}

