import React from 'react';
import { useAuth } from '../components/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Clock, ShieldCheck, LogOut, MessageCircle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { motion } from 'motion/react';

import Logo from '../components/Logo';

const PendingApproval: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (profile?.approved) return <Navigate to="/" />;

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sititrel-bg p-4 selection:bg-sititrel-accent/30">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[480px] overflow-hidden rounded-[48px] bg-white p-12 text-center shadow-2xl shadow-sititrel-blue/5 border border-sititrel-accent/20"
      >
        <div className="mx-auto mb-10 flex h-24 w-auto items-center justify-center rounded-3xl bg-white p-4 shadow-xl border border-sititrel-accent/10">
          <Logo className="h-full w-auto" />
        </div>
        
        <h2 className="mb-4 text-3xl font-serif font-bold text-sititrel-blue tracking-tight">Análise em Andamento</h2>
        <div className="space-y-4 mb-10">
          <p className="text-sm text-sititrel-text/60 leading-relaxed font-medium">
            Sua solicitação de acesso está sendo revisada pela diretoria do <span className="text-sititrel-blue font-bold">SITITREL</span>. 
          </p>
          <div className="bg-sititrel-accent/10 border-l-4 border-sititrel-accent p-4 text-left">
            <p className="text-[11px] text-sititrel-blue/80 font-medium leading-relaxed italic">
              "Se você ainda não é um associado, nossa equipe entrará em contato para orientar sobre como se associar e liberar seu acesso completo ao sistema."
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-sititrel-accent/30 bg-sititrel-bg/30 p-6 text-left">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-sititrel-accent/30 p-2 text-sititrel-blue">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/50">Status do Perfil</p>
                <p className="text-sm font-bold text-sititrel-blue">Aguardando Validação Cadastral</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button
              className="flex items-center justify-center gap-3 rounded-2xl border border-sititrel-accent/30 bg-white px-6 py-4 text-xs font-bold uppercase tracking-widest text-sititrel-blue transition-all hover:bg-sititrel-bg active:scale-95"
            >
              <MessageCircle size={18} />
              Suporte Administrativo
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-3 rounded-2xl bg-sititrel-blue px-6 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-sititrel-blue/10 transition-all hover:bg-sititrel-green active:scale-95"
            >
              <LogOut size={18} />
              Sair da Conta
            </button>
          </div>
        </div>

        <p className="mt-12 text-[10px] uppercase tracking-[0.3em] text-sititrel-blue/30 font-bold max-w-[280px] mx-auto leading-relaxed">
          Sindicato dos Trabalhadores de Papel e Celulose
        </p>
      </motion.div>
    </div>
  );
};

export default PendingApproval;
