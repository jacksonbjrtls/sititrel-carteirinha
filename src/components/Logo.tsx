import React, { useState } from 'react';
import SititrelLogo from './SititrelLogo';

interface LogoWrapperProps {
  className?: string;
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoWrapperProps> = ({ className, style }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return <SititrelLogo className={className} style={style} />;
  }

  return (
    <div className={`relative ${className}`} style={style}>
      <img
        src="/logo-sititrel.png"
        alt="SITITREL Logo"
        className="w-full h-full object-contain"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <SititrelLogo className="w-1/2 h-1/2 opacity-20 animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default Logo;
