import React from 'react';

interface SititrelLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

const SititrelLogo: React.FC<SititrelLogoProps> = ({ className, style }) => {
  return (
    <svg 
      viewBox="0 0 400 450" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className} 
      style={style}
    >
      {/* Gear (simplified 18 teeth) */}
      <path 
        d="M200 40 L215 10 L245 15 L255 45 L285 55 L305 85 L325 115 L335 145 L335 175 C335 250 275 310 200 310 C125 310 65 250 65 175 L65 145 L75 115 L95 85 L115 55 L145 45 L155 30 L185 10 L200 40Z" 
        fill="#00a651" 
      />
      {/* Gear Teeth (simple circles as teeth placeholders) */}
      {[...Array(18)].map((_, i) => {
        const angle = (i * 20) * (Math.PI / 180);
        const x = 200 + 140 * Math.cos(angle);
        const y = 175 + 140 * Math.sin(angle);
        return <circle key={i} cx={x} cy={y} r="15" fill="#00a651" />;
      })}
      
      {/* Inner White Circle */}
      <circle cx="200" cy="175" r="110" fill="white" />
      
      {/* Shield */}
      <path 
        d="M200 80 Q260 80 260 140 Q260 250 200 270 Q140 250 140 140 Q140 80 200 80Z" 
        fill="#004b93" 
        stroke="white" 
        strokeWidth="4"
      />
      
      {/* STL Letters */}
      <text x="200" y="195" textAnchor="middle" fill="white" fontSize="90" fontWeight="bold" fontFamily="serif">STL</text>
      
      {/* Bottom Text */}
      <text x="200" y="370" textAnchor="middle" fill="#231f20" fontSize="56" fontWeight="900" fontFamily="sans-serif">SITITREL</text>
      <text x="200" y="415" textAnchor="middle" fill="#231f20" fontSize="32" fontWeight="900" fontFamily="sans-serif">TRÊS LAGOAS - MS</text>
    </svg>
  );
};

export default SititrelLogo;
