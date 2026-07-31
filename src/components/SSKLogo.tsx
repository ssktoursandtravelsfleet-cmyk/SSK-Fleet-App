import React from "react";

interface SSKLogoProps {
  className?: string;
  size?: number;
}

export default function SSKLogo({ className = "", size = 200 }: SSKLogoProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        {/* Background Navy Blue Circle */}
        <circle cx="250" cy="250" r="230" fill="#08182D" />
        
        {/* Golden Border Outer */}
        <circle cx="250" cy="250" r="230" stroke="#D5A144" strokeWidth="8" />
        
        {/* Golden Border Inner Thin */}
        <circle cx="250" cy="250" r="222" stroke="#D5A144" strokeWidth="2" strokeDasharray="5 5" opacity="0.4" />

        {/* --- Top Stars --- */}
        {/* Left Star (Small) */}
        <path
          d="M195 140 L198 148 L206 149 L200 155 L202 163 L195 159 L188 163 L190 155 L184 149 L192 148 Z"
          fill="#D5A144"
        />
        {/* Center Star (Large) */}
        <path
          d="M250 102 L256 120 L275 122 L261 135 L265 154 L250 144 L235 154 L239 135 L225 122 L244 120 Z"
          fill="#D5A144"
        />
        {/* Right Star (Small) */}
        <path
          d="M305 140 L308 148 L316 149 L310 155 L312 163 L305 159 L298 163 L300 155 L294 149 L302 148 Z"
          fill="#D5A144"
        />

        {/* --- Car Outline (White) --- */}
        {/* Roof and windshield outline */}
        <path
          d="M195 190 Q250 162 305 190 Q345 210 355 220"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* Side mirrors */}
        <path d="M156 193 Q170 190 178 194" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M344 193 Q330 190 322 194" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
        
        {/* Hood, grill, headlights */}
        <path
          d="M152 258 Q150 215 178 214 L322 214 Q350 215 348 258"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Headlight Left */}
        <path
          d="M162 216 Q185 218 200 232 Q180 234 162 228 Z"
          fill="#FFFFFF"
          opacity="0.9"
        />
        {/* Headlight Right */}
        <path
          d="M338 216 Q315 218 300 232 Q320 234 338 228 Z"
          fill="#FFFFFF"
          opacity="0.9"
        />

        {/* Grille lines */}
        <path d="M210 230 Q250 233 290 230" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M214 236 Q250 239 286 236" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M222 242 Q250 245 278 242" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <path d="M230 248 Q250 250 270 248" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />

        {/* Lower bumper bounds */}
        <path d="M152 258 Q250 260 348 258" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

        {/* --- SSK Letters --- */}
        {/* "SS" in Gold */}
        <text
          x="130"
          y="350"
          fill="url(#goldGradient)"
          fontSize="115"
          fontWeight="800"
          letterSpacing="-4"
          fontFamily="Poppins, sans-serif"
        >
          SS
        </text>
        {/* "K" in White */}
        <text
          x="270"
          y="350"
          fill="#FFFFFF"
          fontSize="115"
          fontWeight="800"
          letterSpacing="-4"
          fontFamily="Poppins, sans-serif"
        >
          K
        </text>

        {/* --- TOURS & TRAVELS --- */}
        <text
          x="250"
          y="382"
          fill="#FFFFFF"
          fontSize="24"
          fontWeight="700"
          textAnchor="middle"
          letterSpacing="4"
          fontFamily="Poppins, sans-serif"
        >
          TOURS & TRAVELS
        </text>

        {/* --- FLEET PARTNER --- */}
        {/* Left line */}
        <line x1="100" y1="412" x2="165" y2="412" stroke="#D5A144" strokeWidth="2.5" strokeLinecap="round" />
        <text
          x="250"
          y="418"
          fill="#D5A144"
          fontSize="19"
          fontWeight="600"
          textAnchor="middle"
          letterSpacing="3"
          fontFamily="Poppins, sans-serif"
        >
          FLEET PARTNER
        </text>
        {/* Right line */}
        <line x1="335" y1="412" x2="400" y2="412" stroke="#D5A144" strokeWidth="2.5" strokeLinecap="round" />

        {/* --- OLA • UBER • RAPIDO --- */}
        <text
          x="250"
          y="450"
          fill="#FFFFFF"
          fontSize="18"
          fontWeight="500"
          textAnchor="middle"
          letterSpacing="2"
          fontFamily="Poppins, sans-serif"
          opacity="0.9"
        >
          OLA • UBER • RAPIDO
        </text>

        {/* Defs for gradients */}
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF0B3" />
            <stop offset="50%" stopColor="#D5A144" />
            <stop offset="100%" stopColor="#A2792C" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
