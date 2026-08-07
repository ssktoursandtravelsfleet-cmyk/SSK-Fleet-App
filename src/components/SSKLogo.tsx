import React from "react";
import sskLogoImg from "../assets/images/ssk_official_logo_1786120708450.jpg";

interface SSKLogoProps {
  className?: string;
  size?: number;
  lightText?: boolean;
}

export default function SSKLogo({ className = "", size, lightText }: SSKLogoProps) {
  return (
    <img
      src={sskLogoImg}
      alt="SSK Tours & Travels Fleet Partner Logo"
      referrerPolicy="no-referrer"
      className={`object-contain ${className}`}
      style={size ? { width: size, height: "auto" } : undefined}
    />
  );
}
