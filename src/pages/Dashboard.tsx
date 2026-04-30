import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import DigitalCard from '../components/DigitalCard';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Dependente, Noticia } from '../types';
import { Users, Plus, Edit2, ShieldAlert, Download, Clock, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

import Logo from '../components/Logo';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

const Dashboard: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const qDeps = query(collection(db, 'profiles', profile.id, 'dependentes'));
    const unsubDeps = onSnapshot(qDeps, (snapshot) => {
      const deps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dependente));
      setDependentes(deps);
      setLoading(false);
    });

    const qNews = query(collection(db, 'noticias'), orderBy('createdAt', 'desc'), limit(5));
    const unsubNews = onSnapshot(qNews, (snapshot) => {
      setNoticias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Noticia)));
    });

    return () => {
      unsubDeps();
      unsubNews();
    };
  }, [profile]);

  const downloadPDF = async (format: 'pdf' | 'image' = 'pdf') => {
    try {
      console.log('Iniciando geração de arquivo...', format);
      setIsGeneratingPDF(true);
      
      // Delay to ensure the hidden card is mounted and rendered fully
      await new Promise(resolve => setTimeout(resolve, 3000));

      const innerId = `printable-card-inner-${profile?.id}`;
      const innerContainer = document.getElementById(innerId);
      
      if (!innerContainer) {
        throw new Error(`Container de impressão não localizado (ID: ${innerId}). Tente novamente.`);
      }

      const cardParts = Array.from(innerContainer.children) as HTMLElement[];

      if (cardParts.length === 0) {
        throw new Error("O conteúdo da carteirinha está vazio.");
      }

      if (format === 'image') {
        const dataUrl = await toPng(innerContainer, {
          backgroundColor: "#ffffff",
          cacheBust: true,
          pixelRatio: 2
        });
        const link = document.createElement('a');
        link.download = `carteirinha-${profile?.id}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4"
        });

        for (let i = 0; i < cardParts.length; i++) {
          const part = cardParts[i];
          const dataUrl = await toPng(part, {
            backgroundColor: "#ffffff",
            cacheBust: true,
            pixelRatio: 2
          });

          if (i > 0) pdf.addPage("a4", "landscape");

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
        }
        
        pdf.save(`carteirinha-sititrel-${profile?.name.replace(/\s+/g, '_').toUpperCase()}.pdf`);
      }

    } catch (error: any) {
      console.error('Erro no download:', error);
      alert(`Falha ao gerar arquivo: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = () => downloadPDF('pdf');
  const handleDownloadImage = () => downloadPDF('image');

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="mb-8 rounded-[40px] bg-white p-12 shadow-2xl">
          <Logo className="h-32 w-auto" />
        </div>
        <h2 className="text-3xl font-serif font-bold text-sititrel-blue mb-4">Bem-vindo ao SITITREL Digital</h2>
        <p className="max-w-md text-sititrel-text/60 font-medium mb-10 leading-relaxed">
          Você acessou como administrador, mas ainda não possui um perfil de associado vinculado ao seu e-mail.
        </p>
        <button 
          onClick={() => navigate('/profile')}
          className="rounded-2xl bg-sititrel-blue px-10 py-5 text-sm font-bold text-white shadow-2xl shadow-sititrel-blue/20 transition-all hover:bg-sititrel-blue-dark active:scale-95"
        >
          Completar Meu Perfil
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero Section - Total Prominence */}
      <section className="relative overflow-hidden bg-white py-12 px-4 md:py-20">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
              <h2 className="text-4xl font-serif font-black text-sititrel-blue mb-3 md:text-6xl tracking-tight">Minha Identidade</h2>
              <p className="text-sititrel-text/60 font-bold uppercase tracking-[0.3em] text-[10px]">Toque para ver o verso e dependentes</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 20 }}
              className="relative w-full max-w-lg md:max-w-3xl group"
            >
              {/* Outer Glow */}
              <div className="absolute -inset-4 rounded-[48px] bg-gradient-to-br from-sititrel-blue/20 to-sititrel-green/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              
              <DigitalCard profile={profile} dependents={dependentes} onDownload={handleDownloadPDF} />
              
              {/* Only mount hidden printable card during generation */}
              <div className="fixed top-0 left-[-9999px] pointer-events-none -z-50 block w-[1200px] h-auto overflow-visible">
                {isGeneratingPDF && (
                  <DigitalCard profile={profile} dependents={dependentes} isDownload={true} />
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-14 flex flex-wrap items-center justify-center gap-4"
            >
               {isAdmin && (
                 <button 
                  onClick={() => navigate('/admin')}
                  className="w-full md:w-auto mb-4 md:mb-0 flex items-center justify-center gap-3 rounded-2xl bg-amber-500 px-10 py-5 text-sm font-black text-white shadow-xl shadow-amber-500/30 transition-all hover:bg-amber-600 active:scale-95 border-2 border-amber-400"
                 >
                   <Shield size={20} />
                   PAINEL DE CONTROLE
                 </button>
               )}
               <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                 <button 
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="flex-1 flex items-center justify-center gap-3 rounded-2xl bg-sititrel-blue px-10 py-5 text-sm font-bold text-white shadow-2xl shadow-sititrel-blue/20 transition-all hover:bg-sititrel-blue-dark active:scale-95 disabled:opacity-50"
                 >
                   {isGeneratingPDF ? (
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                     <Download size={20} />
                   )}
                   Baixar PDF
                 </button>
                 <button 
                  onClick={handleDownloadImage}
                  disabled={isGeneratingPDF}
                  className="flex-1 flex items-center justify-center gap-3 rounded-2xl bg-white border-2 border-sititrel-blue/20 px-10 py-5 text-sm font-bold text-sititrel-blue shadow-xl transition-all hover:bg-sititrel-bg/50 active:scale-95 disabled:opacity-50"
                 >
                   <Download size={20} />
                   Baixar Imagem (PNG)
                 </button>
               </div>
               <button 
                onClick={() => navigate('/profile')}
                className="w-full md:w-auto rounded-2xl border border-sititrel-accent bg-white px-10 py-5 text-sm font-bold text-sititrel-blue transition-all hover:bg-sititrel-bg/50 shadow-sm"
               >
                 Acessar Perfil
               </button>
            </motion.div>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute -left-20 top-0 h-96 w-96 rounded-full bg-sititrel-blue/5 blur-[120px]"></div>
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-sititrel-green/5 blur-[120px]"></div>
      </section>

      {/* Informativos & Dependentes */}
      <div className="grid gap-12 lg:grid-cols-12 max-w-6xl mx-auto px-4 pb-20">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-serif font-bold text-sititrel-blue flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-sititrel-accent flex items-center justify-center text-sititrel-blue">
                <Users size={20} />
              </div>
              Dependentes
            </h3>
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 rounded-xl border border-sititrel-accent bg-white px-5 py-2.5 text-sm font-bold text-sititrel-blue shadow-sm transition-all hover:bg-sititrel-accent"
            >
               <Plus size={18} />
               Gerenciar
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {loading ? (
              [1, 2].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm"></div>)
            ) : dependentes.length > 0 ? (
              dependentes.map((dep) => (
                <motion.div
                  key={dep.id}
                  whileHover={{ y: -4 }}
                  className="group relative overflow-hidden rounded-2xl border border-sititrel-accent bg-white p-6 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sititrel-bg text-sititrel-blue font-bold text-lg">
                      {dep.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sititrel-text text-lg">{dep.name}</h4>
                      <p className="text-[10px] font-bold text-sititrel-blue/60 uppercase tracking-[0.2em]">{dep.parentesco}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-sititrel-accent bg-white/50 p-16 text-center">
                 <div className="mb-6 rounded-full bg-white p-6 text-sititrel-accent shadow-sm">
                   <Users size={40} />
                 </div>
                 <h4 className="text-xl font-bold text-sititrel-blue">Ainda sem dependentes</h4>
                 <p className="mt-2 max-w-sm text-sm text-sititrel-text/60 leading-relaxed font-medium font-sans">
                   Cadastre seus familiares para que eles também possam usufruir dos benefícios do sindicato diretamente do seu perfil.
                 </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="rounded-[40px] border border-sititrel-accent bg-white p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <ShieldAlert size={80} />
            </div>
            <h3 className="text-xl font-serif font-bold text-sititrel-blue mb-6 flex items-center gap-2">
              Últimas Notícias
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
            </h3>
            <div className="space-y-6">
               {noticias.map((news) => (
                 <div key={news.id} className="group cursor-pointer">
                    <div className="flex items-center gap-2 text-[8px] font-bold text-sititrel-blue/40 uppercase tracking-widest mb-1">
                      <Clock size={10} />
                      {news.createdAt?.toDate ? news.createdAt.toDate().toLocaleDateString() : 'Hoje'}
                    </div>
                    <h4 className="text-sm font-bold text-sititrel-text group-hover:text-sititrel-blue transition-colors">
                      {news.title}
                    </h4>
                    <p className="text-xs text-sititrel-text/50 mt-1 leading-relaxed line-clamp-2 font-medium">
                      {news.content}
                    </p>
                 </div>
               ))}
               {noticias.length === 0 && (
                 <p className="text-xs text-sititrel-text/40 italic">Nenhuma notícia disponível no momento.</p>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
