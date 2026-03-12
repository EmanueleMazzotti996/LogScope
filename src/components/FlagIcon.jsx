import React from 'react';

const FlagIcon = ({ code, className = "" }) => {
  const flags = {
    it: (
      <svg viewBox="0 0 640 480" className={className}>
        <rect width="213.3" height="480" fill="#009246"/>
        <rect x="213.3" width="213.3" height="480" fill="#fff"/>
        <rect x="426.6" width="213.3" height="480" fill="#ce2b37"/>
      </svg>
    ),
    en: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#012169" d="M0 0h640v480H0z"/>
        <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-74L320 299 78 480H0v-62l239-178L0 60V0h75z"/>
        <path fill="#C8102E" d="m424 281 216 159v40L369 281h55zM226 199 0 32V0h35l242 180-51 19zM0 450l219-162h54L0 480v-30zM640 31l-223 166-49-18L605 0h35v31z"/>
        <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z"/>
        <path fill="#C8102E" d="M281 0v480h80V0h-80zM0 200v80h640v-80H0z"/>
      </svg>
    ),
    es: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#c60b1e" d="M0 0h640v120H0z"/>
        <path fill="#ffc400" d="M0 120h640v240H0z"/>
        <path fill="#c60b1e" d="M0 360h640v120H0z"/>
        {/* Simplified coat of arms placeholder for professional icon feel */}
        <circle cx="160" cy="240" r="40" fill="#c60b1e" opacity="0.5" />
      </svg>
    ),
    fr: (
      <svg viewBox="0 0 640 480" className={className}>
        <rect width="213.3" height="480" fill="#002395"/>
        <rect x="213.3" width="213.3" height="480" fill="#fff"/>
        <rect x="426.6" width="213.3" height="480" fill="#ed2939"/>
      </svg>
    ),
    de: (
      <svg viewBox="0 0 640 480" className={className}>
        <rect width="640" height="160" fill="#000"/>
        <rect y="160" width="640" height="160" fill="#d00"/>
        <rect y="320" width="640" height="160" fill="#ffce00"/>
      </svg>
    ),
    pt: (
      <svg viewBox="0 0 640 480" className={className}>
        <rect width="256" height="480" fill="#046a38"/>
        <rect x="256" width="384" height="480" fill="#da291c"/>
        <circle cx="256" cy="240" r="60" fill="#ffcd00" opacity="0.8" />
      </svg>
    )
  };

  return flags[code] || flags.en;
};

export default FlagIcon;
