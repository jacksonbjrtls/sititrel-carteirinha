import React from 'react';
import { motion } from 'motion/react';
import { Ban, LogOut, MessageCircle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

import Logo from '../components/Logo';

const BlockedPage: React.FC = () => {
  const handleLogout = () => signOut(auth);

  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[480px] overflow-hidden rounded-[48px] bg-white p-12 text-center shadow-2xl shadow-red-900/5 border border-red-100"
      >
        <div className="mx-auto mb-10 flex h-24 w-auto items-center justify-center rounded-3xl bg-white p-4 shadow-xl border border-red-100">
          <Logo className="h-full w-auto" />
        </div>
        
        <h2 className="mb-4 text-3xl font-serif font-bold text-red-600 tracking-tight">Acesso Bloqueado</h2>
        <p className="mb-10 text-slate-600 leading-relaxed font-medium">
          Sua conta no <span className="text-sititrel-blue font-bold">SITITREL</span> foi suspensa pela diretoria administrativa. 
          Entre em contato para regularizar sua situação.
        </p>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-red-100 bg-red-50/30 p-6 text-left">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-red-100 p-2 text-red-600">
                <Ban size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-600/50">Status do Perfil</p>
                <p className="text-sm font-bold text-red-600">Suspenso Temporariamente</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <button
              className="flex items-center justify-center gap-3 rounded-2xl border border-red-100 bg-white px-6 py-4 text-xs font-bold uppercase tracking-widest text-red-600 transition-all hover:bg-red-50 active:scale-95"
            >
              <MessageCircle size={18} />
              Contatar Diretoria
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-3 rounded-2xl bg-red-600 px-6 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-red-600/10 transition-all hover:bg-red-700 active:scale-95"
            >
              <LogOut size={18} />
              Sair da Conta
            </button>
          </div>
        </div>

        <p className="mt-12 text-[10px] uppercase tracking-[0.3em] text-red-600/30 font-bold max-w-[280px] mx-auto leading-relaxed">
          Sindicato dos Trabalhadores de Papel e Celulose
        </p>
      </motion.div>
    </div>
  );
};

export default BlockedPage;
