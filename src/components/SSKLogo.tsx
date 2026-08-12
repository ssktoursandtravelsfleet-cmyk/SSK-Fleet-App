import React from "react";
import sskMasterLogo from "../assets/images/ssk_master_logo.png";

interface SSKLogoProps {
  className?: string;
  size?: number;
}

export default function SSKLogo({
  className = "",
  size,
}: SSKLogoProps) {
  return (
    <img
      src={sskMasterLogo}
      alt="SSK Tours & Travels Fleet Partner Logo"
      className={`object-contain block ${className}`}
      style={{
        width: size ? `${size}px` : undefined,
        height: size ? `${size}px` : "auto",
        maxWidth: "100%",
        objectFit: "contain",
        display: "block",
        filter: "none",
        mixBlendMode: "normal",
        opacity: 1,
      }}
    />
  );
}
