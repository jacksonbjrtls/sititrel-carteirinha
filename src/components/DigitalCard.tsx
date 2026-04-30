import React, { useState } from 'react';
import { UserProfile, Dependente } from '../types';
import { Shield, CreditCard, ChevronRight, RefreshCw, Users, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import Logo from './Logo';

interface DigitalCardProps {
  profile: UserProfile;
  dependents?: Dependente[];
  onDownload?: () => void;
  isDownload?: boolean;
}

const DigitalCard: React.FC<DigitalCardProps> = ({ profile, dependents = [], onDownload, isDownload = false }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardUrl = `${window.location.origin}/dashboard?user=${profile.id}`;

  const CardFrontContent = ({ isPrint = false }) => (
    <div 
      id={isPrint ? `card-front-print-${profile.id}` : `card-front-${profile.id}`}
      className={`relative overflow-hidden rounded-2xl transition-all border ${isPrint ? 'w-[1011px] h-[638px] shadow-none bg-white border-[#004b93]' : 'aspect-[1.586/1] w-full shadow-2xl border-[#004b93]/20'}`}
    >
      {/* Background Gradient */}
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundColor: '#004b93',
          backgroundImage: isPrint ? 'none' : 'linear-gradient(135deg, #004b93 0%, #00366b 100%)' 
        }}
      >
        <div className={`absolute -right-20 -bottom-20 rounded-full opacity-5 blur-3xl ${isPrint ? 'h-[600px] w-[600px]' : 'h-64 w-64'}`} style={{ backgroundColor: '#ffffff' }}></div>
        <div className={`absolute -left-10 top-0 rounded-full opacity-10 blur-2xl ${isPrint ? 'h-[300px] w-[300px]' : 'h-32 w-32'}`} style={{ backgroundColor: '#00a651' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full" 
             style={{ opacity: 0.03, backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: isPrint ? '48px 48px' : '24px 24px' }} />
      </div>

      <div className={`relative flex h-full flex-col ${isPrint ? 'p-16' : 'p-6 md:p-8'} text-white`}>
        <div className={`flex items-center justify-between ${isPrint ? 'mb-12' : 'mb-4 md:mb-6'}`}>
          <div className={`flex items-center ${isPrint ? 'gap-8' : 'gap-3 md:gap-4'}`}>
             <Logo 
               className={`${isPrint ? 'h-20' : 'h-6 md:h-8'} w-auto bg-white rounded-md p-1 md:rounded-lg`}
             />
             <span className={`${isPrint ? 'text-3xl' : 'text-[8px] md:text-[10px]'} font-black uppercase tracking-[0.4em] text-white/90`}>SITITREL Digital</span>
          </div>
          <div className={`${isPrint ? 'w-36 h-36 p-4' : 'w-10 h-10 md:w-16 md:h-16 p-1 md:p-2'} bg-white rounded-md md:rounded-2xl shadow-lg flex items-center justify-center overflow-hidden`}>
            <QRCodeCanvas 
              value={cardUrl} 
              size={isPrint ? 120 : 64} 
              level="H"
              fgColor="#004b93"
              className="w-full h-full"
            />
          </div>
        </div>

        <div className={`flex items-center ${isPrint ? 'gap-12' : 'gap-4 md:gap-6'}`}>
          <div className={`${isPrint ? 'w-48 h-48 rounded-[48px]' : 'w-20 h-20 md:w-28 md:h-28 rounded-xl md:rounded-2xl'} bg-white flex items-center justify-center font-bold shadow-2xl ring-4 ring-white/10 overflow-hidden shrink-0`}>
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.name}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className={`uppercase ${isPrint ? 'text-7xl' : 'text-2xl md:text-3xl'}`} style={{ color: '#004b93' }}>{profile.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex flex-col justify-center overflow-hidden">
            <h3 className={`${isPrint ? 'text-5xl' : 'text-sm md:text-xl'} font-black leading-tight break-words line-clamp-2`}>{profile.name.toUpperCase()}</h3>
            <p className={`${isPrint ? 'text-lg mt-2' : 'text-[10px] mt-1 md:mt-2'} opacity-80 uppercase tracking-widest font-black`} style={isPrint ? { color: '#00a651' } : {}}>MATRÍCULA: {profile.matricula || '---'}</p>
          </div>
        </div>

        {/* Company Area - User Requested Emphasis and Centered Positioning */}
        <div 
          className={`flex-1 flex flex-col justify-center items-center ${isPrint ? 'my-8 py-8' : 'my-4 md:my-6 py-4'} rounded-[32px] md:rounded-[40px] border`}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.05)'
          }}
        >
          <span className={`${isPrint ? 'text-sm mb-2' : 'text-[7px] md:text-[9px] mb-1.5'} font-black uppercase tracking-[0.4em] text-sititrel-green opacity-80`} style={isPrint ? { color: '#00a651' } : {}}>Empresa / Unidade</span>
          <p className={`${isPrint ? 'text-4xl' : 'text-sm md:text-3xl'} font-black text-white text-center leading-tight px-6 font-sans tracking-tighter`}>
            {profile.empresa?.toUpperCase() || 'ASSOCIADO INDIVIDUAL'}
          </p>
        </div>

        <div className={`mt-auto flex items-end justify-between ${isPrint ? 'pb-4' : ''}`}>
          <div className={`${isPrint ? 'space-y-6' : 'space-y-2 md:space-y-4'}`}>
            <div>
              <label className={`opacity-60 block ${isPrint ? 'text-xs mb-2' : 'text-[6px] md:text-[8px] mb-0.5 md:mb-1'} uppercase tracking-[0.2em] font-bold`}>CPF DO TITULAR</label>
              <span className={`font-black tracking-widest ${isPrint ? 'text-4xl' : 'text-xs md:text-base'}`}>{profile.cpf}</span>
            </div>
            <div className="flex items-center gap-2">
              <span 
                className={`rounded-full font-black uppercase tracking-widest border ${isPrint ? 'px-8 py-3 text-sm' : 'px-2 py-0.5 md:px-3 md:py-1 text-[6px] md:text-[8px]'}`}
                style={{
                  backgroundColor: profile.isSocio ? (isPrint ? '#00a651' : 'rgba(0, 166, 81, 0.2)') : (isPrint ? '#334155' : 'rgba(255, 255, 255, 0.1)'),
                  color: (profile.isSocio || !isPrint) ? '#ffffff' : '#ffffff',
                  borderColor: profile.isSocio ? (isPrint ? '#00813f' : 'rgba(0, 166, 81, 0.3)') : (isPrint ? '#1e293b' : 'rgba(255, 255, 255, 0.1)')
                }}
              >
                {profile.isSocio ? 'SÓCIO TITULAR ATIVO' : 'ASSOCIADO EM VALIDAÇÃO'}
              </span>
            </div>
          </div>
          
          <div className="text-right">
            <p className={`opacity-60 font-bold uppercase tracking-widest ${isPrint ? 'text-xs mb-1' : 'text-[6px] md:text-[8px]'}`}>Validade</p>
            <p className={`font-black ${isPrint ? 'text-2xl' : 'text-[8px] md:text-[10px]'}`} style={isPrint ? { color: '#ffffff' } : {}}>DEZ/2026</p>
          </div>
        </div>
      </div>
    </div>
  );

  const CardBackContent = ({ isPrint = false, depsToShow = dependents, pageNum = 1, totalPages = 1 }) => (
    <div 
      id={isPrint ? `card-back-print-${profile.id}-${pageNum}` : `card-back-${profile.id}`}
      className={`relative overflow-hidden rounded-2xl transition-all border bg-white ${isPrint ? 'w-[1011px] h-[638px] shadow-none border-[#004b93]' : 'aspect-[1.586/1] w-full shadow-2xl border-[#004b93]/20'}`}
      style={!isPrint ? { backfaceVisibility: 'hidden' } : {}}
    >
      {/* Background Decor */}
      <div className={`absolute top-0 left-0 w-full`} style={{ backgroundColor: '#004b93', height: isPrint ? '48px' : '32px' }}></div>
      <div className={`absolute bottom-0 left-0 w-full`} style={{ backgroundColor: '#004b93', height: isPrint ? '48px' : '32px' }}></div>
      <div className="absolute inset-0" 
           style={{ opacity: 0.02, backgroundImage: 'radial-gradient(circle at 10px 10px, black 1px, transparent 0)', backgroundSize: '20px 20px' }} />

      {/* Content */}
      <div className={`relative flex h-full flex-col ${isPrint ? 'p-12 pt-16' : 'p-4 md:p-6 pt-8 md:pt-10'}`} style={{ color: '#004b93' }}>
         <div className={`flex items-center justify-between border-b border-[#004b93] ${isPrint ? 'mb-6 pb-4 border-b-2' : 'mb-3 md:mb-4 pb-2'}`} style={{ borderBottomColor: 'rgba(0, 75, 147, 0.2)' }}>
           <div className="flex items-center gap-2">
             <Users className={isPrint ? 'w-8 h-8' : 'w-3.5 h-3.5 md:w-4 md:h-4'} />
             <h4 className={`${isPrint ? 'text-xl' : 'text-[8px] md:text-[10px]'} font-bold uppercase tracking-[0.2em]`}>Dependentes Registrados</h4>
           </div>
           {totalPages > 1 && (
             <span className={`${isPrint ? 'text-lg' : 'text-[7px] md:text-[9px]'} font-bold opacity-40`}>
                VERSO {pageNum} / {totalPages}
             </span>
           )}
         </div>

         <div className={`flex-1 overflow-y-auto pr-1 ${isPrint ? 'space-y-4' : 'space-y-1.5 md:space-y-2'}`}>
           {depsToShow.length > 0 ? (
             depsToShow.map((dep, idx) => (
               <div key={idx} className={`flex justify-between items-center rounded-lg border border-[#004b93] ${isPrint ? 'p-5' : 'p-1.5 md:p-2'}`} style={{ backgroundColor: 'rgba(0, 75, 147, 0.03)', borderColor: 'rgba(0, 75, 147, 0.1)' }}>
                 <span className={`${isPrint ? 'text-xl' : 'text-[8px] md:text-[9px]'} font-bold uppercase tracking-tight break-words max-w-[75%]`}>{dep.name}</span>
                 <span className={`${isPrint ? 'text-base' : 'text-[7px] md:text-[8px]'} opacity-60 uppercase font-medium whitespace-nowrap`}>{dep.parentesco}</span>
               </div>
             ))
           ) : (
             <p className={`${isPrint ? 'text-lg' : 'text-[8px] md:text-[9px]'} text-center mt-10 opacity-40 italic`}>Nenhum dependente cadastrado.</p>
           )}
         </div>

         <div className={`mt-auto flex justify-between items-end ${isPrint ? 'pt-8' : 'pt-2 md:pt-3'}`}>
           <div className="flex flex-col gap-1">
              <p className={`opacity-60 uppercase font-bold ${isPrint ? 'text-xs' : 'text-[6px] md:text-[7px]'}`}>Assinado Digitalmente por</p>
              <p className={`font-bold uppercase ${isPrint ? 'text-sm' : 'text-[7px] md:text-[8px]'}`}>SITITREL - GESTÃO DIGITAL</p>
           </div>
           <div className={`flex items-center justify-center ${isPrint ? 'h-24 w-24' : 'h-8 w-8 md:h-10 md:w-10'}`} style={{ opacity: 0.2 }}>
             <Shield size={isPrint ? 80 : 32} />
           </div>
         </div>
      </div>
    </div>
  );

  if (isDownload) {
    const CHUNK_SIZE = 4;
    const depChunks = [];
    
    if (dependents.length === 0) {
      depChunks.push([]);
    } else {
      for (let i = 0; i < dependents.length; i += CHUNK_SIZE) {
        depChunks.push(dependents.slice(i, i + CHUNK_SIZE));
      }
    }

    return (
      <div 
        id={`printable-card-container-${profile.id}`}
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '1100px',
          zIndex: -9999,
          opacity: 1,
          visibility: 'visible',
          pointerEvents: 'none',
          backgroundColor: '#ffffff'
        }}
      >
        <div 
          id={`printable-card-inner-${profile.id}`}
          style={{ padding: '60px 40px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '60px', alignItems: 'center' }}
        >
          <div style={{ display: 'block', backgroundColor: '#ffffff' }}>
            <CardFrontContent isPrint={true} />
          </div>
          {depChunks.map((chunk, index) => (
            <div key={index} style={{ display: 'block', backgroundColor: '#ffffff' }}>
              <CardBackContent 
                isPrint={true} 
                depsToShow={chunk} 
                pageNum={index + 1} 
                totalPages={depChunks.length} 
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg md:max-w-2xl group selection:bg-transparent">
      {/* Container for interactive view */}
      <div 
        className="relative cursor-pointer"
        style={{ perspective: '2000px' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 80, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative aspect-[1.586/1] w-full"
        >
          <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }} className="absolute inset-0">
            <CardFrontContent isPrint={false} />
          </div>
          <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className="absolute inset-0">
             <CardBackContent isPrint={false} />
          </div>
        </motion.div>
        
        {/* Flip Hint Icon */}
        <div className="absolute -bottom-4 right-0 bg-white shadow-lg rounded-full p-2 text-sititrel-blue animate-bounce">
          <RefreshCw size={14} />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-6">
         <div className="flex gap-2">
           <div className={`h-1.5 transition-all rounded-full ${!isFlipped ? 'w-10 bg-sititrel-blue' : 'w-1.5 bg-sititrel-accent'}`}></div>
           <div className={`h-1.5 transition-all rounded-full ${isFlipped ? 'w-10 bg-sititrel-blue' : 'w-1.5 bg-sititrel-accent'}`}></div>
         </div>
      </div>

      <p className="text-center mt-4 text-[10px] font-bold text-sititrel-blue/40 uppercase tracking-widest">
        {isFlipped ? 'Verso da Carteira' : 'Frente da Carteira'}
      </p>
    </div>
  );
};

export default DigitalCard;
