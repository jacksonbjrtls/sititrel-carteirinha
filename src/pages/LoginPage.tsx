import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, ChevronRight, CheckCircle2, AlertCircle, Camera, Upload, Trash2, Mail, Lock, User, Phone, MapPin, Building2, UserPlus, LogIn, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Empresa } from '../types';
import { compressImage } from '../lib/imageUtils';

import Logo from '../components/Logo';

const LoginPage: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  
  const [loginData, setLoginData] = useState({
    emailOrCpf: '',
    password: '',
  });

  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const [registerData, setRegisterData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    empresa: '',
    matricula: '',
    password: '',
    confirmPassword: '',
    isSocio: true,
    photoURL: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const q = query(collection(db, 'empresas'), where('active', '==', true));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Empresa));
        
        if (list.length > 0) {
          setEmpresas(list);
          setRegisterData(prev => ({ ...prev, empresa: list[0].name }));
        } else {
          // Fallback if no companies in DB
          const defaultList = [
            { id: 'suzano', name: 'Suzano', active: true },
            { id: 'eldorado', name: 'Eldorado', active: true },
            { id: 'itapo', name: 'Itaipu', active: true },
            { id: 'outros', name: 'Outros', active: true }
          ];
          setEmpresas(defaultList);
          setRegisterData(prev => ({ ...prev, empresa: defaultList[0].name }));
        }
      } catch (e) {
        console.error("Error fetching empresas:", e);
        // Fallback on error
        const defaultList = [
          { id: 'suzano', name: 'Suzano', active: true },
          { id: 'eldorado', name: 'Eldorado', active: true },
          { id: 'outros', name: 'Outros', active: true }
        ];
        setEmpresas(defaultList);
        setRegisterData(prev => ({ ...prev, empresa: defaultList[0].name }));
      }
    };
    fetchEmpresas();
  }, []);

  useEffect(() => {
    if (user && !loading) {
      if (user.email === 'jacksonbjr@gmail.com') {
        navigate('/admin');
        return;
      }
      
      if (profile) {
        if (profile.blocked) {
          navigate('/blocked');
          return;
        }
        if (profile.approved) {
          navigate('/');
        } else {
          navigate('/pending');
        }
      } else if (!loading) {
        // AUTO-CREATE SKELETON PROFILE if it doesn't exist
        // This ensures the admin can see the user even if they don't complete registration
        const createSkeleton = async () => {
          try {
            const profileRef = doc(db, 'profiles', user.uid);
            const snap = await getDoc(profileRef);
            if (!snap.exists()) {
              await setDoc(profileRef, {
                name: user.displayName || 'Usuário Novo',
                email: user.email,
                role: 'member',
                approved: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                empresa: 'Pendente',
                cpf: 'Pendente'
              });
            }
          } catch (e) {
            console.error("Error creating skeleton profile:", e);
          }
        };
        createSkeleton();

        // User exists but no profile - Welcome them and ask for data
        setAuthMode('register');
        setError("Bem-vindo! Agora complete seu cadastro (CPF, Empresa e Foto) para que a diretoria possa liberar seu acesso.");
        setRegisterData(prev => ({ 
          ...prev, 
          email: user.email || '', 
          name: user.displayName || prev.name 
        }));
      }
    }
  }, [user, profile, loading, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError("Erro ao autenticar com Google: " + err.message);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setSubmitting(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError("Este e-mail não foi encontrado em nossa base.");
      } else {
        setError("Erro ao enviar e-mail de recuperação: " + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let email = loginData.emailOrCpf;

      // If looks like CPF (only numbers and some length), try to find the email
      const isCpf = /^[0-9.-]+$/.test(loginData.emailOrCpf) && loginData.emailOrCpf.length >= 11;
      
      if (isCpf) {
        const cleanCpf = loginData.emailOrCpf.replace(/\D/g, '');
        const q = query(collection(db, 'profiles'), where('cpf', '==', cleanCpf));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          throw new Error("CPF não encontrado no sistema. Por favor, cadastre-se.");
        }
        
        email = snap.docs[0].data().email;
      }

      await signInWithEmailAndPassword(auth, email, loginData.password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("E-mail/CPF ou senha incorretos.");
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only check password if user is NOT already logged in
    if (!user && registerData.password !== registerData.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (registerData.cpf.replace(/\D/g, '').length < 11) {
      setError("CPF inválido.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Check if CPF already exists
      const cleanCpf = registerData.cpf.replace(/\D/g, '');
      const q = query(collection(db, 'profiles'), where('cpf', '==', cleanCpf));
      const snap = await getDocs(q);
      
      let importedDocId = null;
      if (!snap.empty) {
        const existingProfile = snap.docs[0].data();
        // If it's already linked to an auth account (has an email and not specifically marked as imported/claimable)
        if (!existingProfile.isImported) {
          throw new Error("Este CPF já está cadastrado no sistema.");
        }
        importedDocId = snap.docs[0].id;
      }

      let currentUid = user?.uid;

      if (!user) {
        // 2. Create User only if not logged in
        const userCredential = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password);
        const newUser = userCredential.user;
        await updateProfile(newUser, { displayName: registerData.name });
        currentUid = newUser.uid;
      }

      if (!currentUid) throw new Error("Erro ao identificar usuário para criação de perfil.");

      // 3. Create or Merge Profile
      // If we found an imported doc, we should probably delete it or use its data.
      // But simpler is to just create the new profile at currentUid and delete the old one if it existed with a different ID
      
      const profileData = {
        cpf: cleanCpf,
        name: registerData.name,
        email: registerData.email || user?.email,
        telefone: registerData.phone,
        empresa: registerData.empresa,
        matricula: registerData.matricula,
        photoURL: registerData.photoURL,
        role: 'member',
        approved: false, // Always false for new registrations/activations
        isSocio: registerData.isSocio,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'profiles', currentUid), profileData);

      // Clean up the imported temporary document if it was different
      if (importedDocId && importedDocId !== currentUid) {
        // Optional: you could try to delete the old document here, but for safety in rules 
        // we might just leave it or let a cloud function handle it.
        // For now, let's just make sure the new one is the one used.
      }

      navigate('/pending');
    } catch (err: any) {
      console.error("Registration error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Este e-mail já está em uso. Se você já tem uma conta, tente fazer login.");
      } else if (err.code === 'auth/invalid-email') {
        setError("O e-mail informado é inválido.");
      } else if (err.code === 'auth/weak-password') {
        setError("A senha deve ter pelo menos 6 caracteres.");
      } else {
        setError(err.message || "Ocorreu um erro ao realizar o cadastro.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setRegisterData({ ...registerData, photoURL: base64 });
    } catch (err) {
      console.error(err);
      setError("Erro ao processar imagem.");
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-sititrel-bg">
      <div className="h-12 w-12 border-4 border-sititrel-blue border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-sititrel-bg p-4 selection:bg-sititrel-accent/30 overflow-y-auto py-10">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[480px] overflow-hidden rounded-[48px] bg-white shadow-2xl shadow-sititrel-blue/5 border border-sititrel-accent/20"
      >
        <div className="bg-sititrel-blue p-10 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sititrel-green/20 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-sititrel-bg/10 rounded-full blur-2xl -ml-12 -mb-12" />
          
          <div className="relative z-10">
            <div className="mx-auto mb-6 flex h-44 w-full max-w-[320px] items-center justify-center rounded-[40px] bg-white p-6 shadow-2xl">
              <Logo className="h-full w-full" />
            </div>
            <p className="mt-4 text-sititrel-accent font-bold text-xs uppercase tracking-[0.4em] opacity-90">Carteirinha Digital</p>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="flex gap-2 p-1 bg-sititrel-bg rounded-2xl mb-8">
            <button 
              onClick={() => { setAuthMode('login'); setError(null); }}
              className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-white text-sititrel-blue shadow-sm' : 'text-sititrel-blue/40 hover:text-sititrel-blue/60'}`}
            >
              Login
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setError(null); }}
              className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${authMode === 'register' ? 'bg-white text-sititrel-blue shadow-sm' : 'text-sititrel-blue/40 hover:text-sititrel-blue/60'}`}
            >
              Cadastro
            </button>
          </div>

          <AnimatePresence mode="wait">
            {authMode === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1 mb-8">
                  <h3 className="text-lg font-serif font-bold text-sititrel-blue">Acesse sua Conta</h3>
                  <p className="text-xs text-sititrel-text/50 font-medium">Use seu E-mail ou CPF cadastrado.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-blue/30" size={18} />
                      <input
                        required
                        type="text"
                        placeholder="E-mail ou CPF"
                        value={loginData.emailOrCpf}
                        onChange={(e) => setLoginData({...loginData, emailOrCpf: e.target.value})}
                        className="w-full rounded-2xl border border-sititrel-accent/30 bg-sititrel-bg/30 pl-12 pr-5 py-4 text-sm font-medium text-sititrel-blue focus:border-sititrel-blue outline-none transition-all"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-blue/30" size={18} />
                      <input
                        required
                        type="password"
                        placeholder="Sua senha"
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                        className="w-full rounded-2xl border border-sititrel-accent/30 bg-sititrel-bg/30 pl-12 pr-5 py-4 text-sm font-medium text-sititrel-blue focus:border-sititrel-blue outline-none transition-all"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 p-4 text-[10px] font-bold uppercase tracking-wider text-red-600 flex items-center gap-3">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => { setAuthMode('forgot'); setError(null); setResetSent(false); }}
                      className="text-[10px] font-bold text-sititrel-blue/60 hover:text-sititrel-blue transition-all uppercase tracking-wider"
                    >
                      Esqueci minha senha
                    </button>
                  </div>

                  <button
                    disabled={submitting}
                    type="submit"
                    className="w-full py-4.5 bg-sititrel-blue text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-sititrel-blue/10 hover:bg-sititrel-blue/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Entrando...' : (
                      <>
                        <LogIn size={18} />
                        Entrar Agora
                      </>
                    )}
                  </button>
                </form>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-sititrel-accent/20"></span></div>
                  <div className="relative flex justify-center text-[9px] font-bold uppercase tracking-[0.2em]"><span className="bg-white px-4 text-sititrel-blue/30">Ou use sua conta Google</span></div>
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  className="w-full py-4 rounded-2xl border border-sititrel-accent/30 bg-white text-sititrel-blue text-xs font-bold flex items-center justify-center gap-3 hover:bg-sititrel-bg transition-all"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5" alt="Google" />
                  Continuar com Google
                </button>
              </motion.div>
            ) : authMode === 'register' ? (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1 mb-6">
                  <h3 className="text-lg font-serif font-bold text-sititrel-blue">Novo Cadastro</h3>
                  <p className="text-xs text-sititrel-text/50 font-medium">Preencha os dados para solicitar acesso.</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="flex flex-col items-center gap-3 mb-6">
                    <div className="h-20 w-20 rounded-full bg-sititrel-bg border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-sititrel-blue/20 relative group">
                      {registerData.photoURL ? (
                        <img src={registerData.photoURL} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <Camera size={28} />
                      )}
                    </div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue px-4 py-1.5 bg-sititrel-bg rounded-lg cursor-pointer hover:bg-sititrel-accent transition-all">
                      Carregar Foto
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-blue/30" size={17} />
                      <input
                        required
                        type="text"
                        placeholder="Nome Completo"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                        className="w-full rounded-2xl border border-sititrel-accent/30 bg-sititrel-bg/30 pl-11 pr-5 py-3.5 text-sm font-medium text-sititrel-blue focus:border-sititrel-blue outline-none transition-all"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        required
                        type="text"
                        placeholder="CPF (apenas números)"
                        value={registerData.cpf}
                        onChange={(e) => setRegisterData({...registerData, cpf: e.target.value})}
                        className="w-full rounded-2xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-5 py-3.5 text-sm font-medium text-sititrel-blue focus:border-sititrel-blue outline-none transition-all"
                      />
                      <input
                        required
                        type="tel"
                        placeholder="Telefone / WhatsApp"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({...registerData, phone: e.target.value})}
                        className="w-full rounded-2xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-5 py-3.5 text-sm font-medium text-sititrel-blue focus:border-sititrel-blue outline-none transition-all"
                      />
                    </div>

                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-blue/30" size={17} />
                      <input
                        required
                        type="email"
                        placeholder="Seu melhor e-mail"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                        className="w-full rounded-2xl border border-sititrel-accent/30 bg-sititrel-bg/30 pl-11 pr-5 py-3.5 text-sm font-medium text-sititrel-blue focus:border-sititrel-blue outline-none transition-all"
                      />
                    </div>

                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-blue/30" size={17} />
                      <select
                        required
                        value={registerData.empresa}
                        onChange={(e) => setRegisterData({...registerData, empresa: e.target.value})}
                        className="w-full rounded-2xl border border-sititrel-accent/30 bg-sititrel-bg/30 pl-11 pr-5 py-3.5 text-sm font-medium text-sititrel-blue focus:border-sititrel-blue outline-none appearance-none"
                      >
                        <option value="">Selecione sua empresa</option>
                        {empresas.map(e => (
                          <option key={e.id} value={e.name}>{e.name}</option>
                        ))}
                      </select>
                    </div>

                    {!user && (
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          required
                          type="password"
                          placeholder="Nova Senha"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                          className="w-full rounded-2xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-5 py-3.5 text-sm font-medium text-sititrel-blue focus:border-sititrel-blue outline-none transition-all"
                        />
                        <input
                          required
                          type="password"
                          placeholder="Confirmar Senha"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                          className="w-full rounded-2xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-5 py-3.5 text-sm font-medium text-sititrel-blue focus:border-sititrel-blue outline-none transition-all"
                        />
                      </div>
                    )}

                    <label className="flex items-center gap-3 p-4 bg-sititrel-bg/20 rounded-2xl border border-sititrel-accent/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={registerData.isSocio}
                        onChange={(e) => setRegisterData({...registerData, isSocio: e.target.checked})}
                        className="h-5 w-5 rounded-lg border-sititrel-accent text-sititrel-blue focus:ring-sititrel-blue/20"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-sititrel-blue uppercase tracking-tight">Sócio do Sindicato</span>
                        <span className="text-[10px] text-sititrel-text/50 font-medium italic">Marque se você já é associado ativo.</span>
                      </div>
                    </label>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 p-4 text-[10px] font-bold uppercase tracking-wider text-red-600 flex items-center gap-3 border border-red-100">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  <button
                    disabled={submitting}
                    type="submit"
                    className="w-full py-4.5 bg-sititrel-blue text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-sititrel-blue/10 hover:bg-sititrel-green active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Enviando...' : (
                      <>
                        <UserPlus size={18} />
                        Cadastrar Agora
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1 mb-6">
                  <h3 className="text-lg font-serif font-bold text-sititrel-blue">Recuperar Senha</h3>
                  <p className="text-xs text-sititrel-text/50 font-medium">Enviaremos um link para seu e-mail.</p>
                </div>

                {resetSent ? (
                  <div className="space-y-6">
                    <div className="rounded-2xl bg-emerald-50 p-6 text-center border border-emerald-100">
                      <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4" />
                      <p className="text-sm font-bold text-emerald-800 mb-2">E-mail Enviado!</p>
                      <p className="text-xs text-emerald-600/80 font-medium">Verifique sua caixa de entrada e spam para redefinir sua senha.</p>
                    </div>
                    <button
                      onClick={() => setAuthMode('login')}
                      className="w-full py-4 bg-sititrel-blue text-white rounded-2xl font-bold text-xs uppercase tracking-widest"
                    >
                      Voltar para o Login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordReset} className="space-y-5">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-blue/30" size={18} />
                      <input
                        required
                        type="email"
                        placeholder="Digite seu e-mail cadastrado"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full rounded-2xl border border-sititrel-accent/30 bg-sititrel-bg/30 pl-12 pr-5 py-4 text-sm font-medium text-sititrel-blue focus:border-sititrel-blue outline-none transition-all"
                      />
                    </div>

                    {error && (
                      <div className="rounded-xl bg-red-50 p-4 text-[10px] font-bold uppercase tracking-wider text-red-600 flex items-center gap-3">
                        <AlertCircle size={16} />
                        {error}
                      </div>
                    )}

                    <button
                      disabled={submitting}
                      type="submit"
                      className="w-full py-4.5 bg-sititrel-blue text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-sititrel-blue/10 hover:bg-sititrel-blue/90 transition-all"
                    >
                      {submitting ? 'Enviando...' : 'Enviar Link de Recuperação'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-sititrel-blue/50 hover:text-sititrel-blue transition-all"
                    >
                      <ArrowLeft size={16} /> Voltar
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;

