import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp, collection, addDoc, deleteDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { Dependente, Empresa } from '../types';
import { User, Shield, Briefcase, Users, Save, Trash2, Plus, AlertCircle, CheckCircle2, MapPin, Phone, Camera, Upload, Lock, Search, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { compressImage } from '../lib/imageUtils';

import Logo from '../components/Logo';

const ProfilePage: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [formData, setFormData] = useState<any>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showDepModal, setShowDepModal] = useState(false);
  const [newDep, setNewDep] = useState({ name: '', parentesco: 'Filho(a)', dataNascimento: '', cpf: '' });
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const validateCPF = (cpf: string) => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;

    return true;
  };

  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: `${data.logradouro}${data.bairro ? `, ${data.bairro}` : ''}`,
          cidade: data.localidade,
          uf: data.uf,
          cep: cleanCep.replace(/(\d{5})(\d{3})/, '$1-$2')
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsSearchingCep(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };


  useEffect(() => {
    const fetchEmpresas = async () => {
      const q = query(collection(db, 'empresas'), where('active', '==', true));
      const snap = await getDocs(q);
      setEmpresas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Empresa)));
    };
    fetchEmpresas();
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        empresa: profile.empresa || '',
        matricula: profile.matricula || '',
        pis: profile.pis || '',
        ctps: profile.ctps || '',
        nomePai: profile.nomePai || '',
        nomeMae: profile.nomeMae || '',
        estadoCivil: profile.estadoCivil || 'Solteiro',
        telefone: profile.telefone || '',
        cep: profile.cep || '',
        cidade: profile.cidade || '',
        uf: profile.uf || '',
        endereco: profile.endereco || '',
        numero: profile.numero || '',
        photoURL: profile.photoURL || '',
        cpf: profile.cpf || '',
      });

      const unsubscribe = onSnapshot(collection(db, 'profiles', profile.id, 'dependentes'), (snap) => {
        setDependentes(snap.docs.map(d => ({id: d.id, ...d.data()} as Dependente)));
      });

      return () => unsubscribe();
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setMessage(null);

    if (isAdmin && formData.cpf && !validateCPF(formData.cpf)) {
      setMessage({ type: 'error', text: 'O CPF informado é inválido.' });
      setIsSaving(false);
      return;
    }

    try {
      const profileRef = doc(db, 'profiles', profile.id);
      
      // Allow users to update more fields (except role, approved, and matricula)
      const dataToUpdate = isAdmin ? {
        ...formData,
        cpf: formData.cpf // Use the cpf from state if allowed
      } : {
        name: formData.name,
        photoURL: formData.photoURL,
        telefone: formData.telefone,
        cep: formData.cep,
        cidade: formData.cidade,
        uf: formData.uf,
        endereco: formData.endereco,
        numero: formData.numero,
        empresa: formData.empresa,
        pis: formData.pis,
        ctps: formData.ctps,
        nomePai: formData.nomePai,
        nomeMae: formData.nomeMae,
        estadoCivil: formData.estadoCivil,
      };

      await updateDoc(profileRef, {
        ...dataToUpdate,
        updatedAt: serverTimestamp(),
      });
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao atualizar perfil.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDependente = async () => {
    if (!profile || !newDep.name) return;
    setModalError(null);

    // Validar CPF se informado
    if (newDep.cpf) {
      const cleanCpf = newDep.cpf.replace(/\D/g, '');
      
      if (!validateCPF(cleanCpf)) {
        setModalError('O CPF informado é inválido.');
        return;
      }

      const isDuplicate = dependentes.some(dep => dep.cpf && dep.cpf.replace(/\D/g, '') === cleanCpf);
      
      if (isDuplicate) {
        setModalError('Este CPF já está cadastrado para outro dependente.');
        return;
      }
    }

    try {
      await addDoc(collection(db, 'profiles', profile.id, 'dependentes'), newDep);
      setShowDepModal(false);
      setNewDep({ name: '', parentesco: 'Filho(a)', dataNascimento: '', cpf: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'dependentes');
    }
  };

  const handleDeleteDependente = async (depId: string) => {
    if (!profile) return;
    if (!confirm("Tem certeza que deseja excluir este dependente?")) return;
    try {
      await deleteDoc(doc(db, 'profiles', profile.id, 'dependentes', depId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'dependentes');
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>, isCamera: boolean = false) => {
    if (!isEditing) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImage(file);
      setFormData({ ...formData, photoURL: base64 });
    } catch (err) {
      console.error('Error processing image:', err);
      alert('Erro ao processar imagem. Tente uma foto menor.');
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setFormData({
        name: profile.name,
        empresa: profile.empresa || '',
        matricula: profile.matricula || '',
        pis: profile.pis || '',
        ctps: profile.ctps || '',
        nomePai: profile.nomePai || '',
        nomeMae: profile.nomeMae || '',
        estadoCivil: profile.estadoCivil || 'Solteiro',
        telefone: profile.telefone || '',
        cep: profile.cep || '',
        cidade: profile.cidade || '',
        uf: profile.uf || '',
        endereco: profile.endereco || '',
        numero: profile.numero || '',
        photoURL: profile.photoURL || '',
        cpf: profile.cpf || '',
      });
    }
    setIsEditing(false);
    setMessage(null);
  };

  if (!profile || !formData) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Profile Info Form */}
      <section className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-sititrel-accent">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-10">
          <div className="relative group">
            <div className="h-24 w-24 rounded-full bg-sititrel-accent text-sititrel-blue flex items-center justify-center text-3xl font-bold shadow-2xl overflow-hidden border-4 border-white transition-transform group-hover:scale-105">
              {formData.photoURL ? (
                <img src={formData.photoURL} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                profile.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col gap-2 mt-4 md:mt-0 md:absolute md:left-full md:top-0 md:ml-4">
              <label className={`flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-sititrel-accent/30 text-[10px] font-bold uppercase tracking-widest text-sititrel-blue ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-sititrel-accent'} transition-all whitespace-nowrap shadow-sm`}>
                <Upload size={14} />
                Galeria
                {isEditing && <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(e)} />}
              </label>
              <label className={`flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-sititrel-accent/30 text-[10px] font-bold uppercase tracking-widest text-sititrel-blue ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-sititrel-accent'} transition-all whitespace-nowrap shadow-sm`}>
                <Camera size={14} />
                Câmera
                {isEditing && <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handlePhotoChange(e, true)} />}
              </label>
              {formData.photoURL && isEditing && (
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, photoURL: ''})}
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-100 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-100 transition-all whitespace-nowrap shadow-sm"
                >
                  <Trash2 size={14} />
                  Remover
                </button>
              )}
            </div>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-serif font-bold text-sititrel-blue">Dados Cadastrais</h2>
            <p className="text-sm text-sititrel-text/60 font-medium font-sans">Atualize sua foto e informações de contato.</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-8">
          {/* Basic Info (Always editable) */}
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2 bg-sititrel-bg/20 p-6 rounded-3xl border border-sititrel-accent/20">
             <div className="flex flex-col gap-1.5 md:col-span-2">
               <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-sititrel-blue mb-2">Localização e Contato</h4>
             </div>
             
             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">CEP</label>
               <div className="relative">
                 <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-accent" />
                 <input
                   disabled={!isEditing}
                   type="text"
                   value={formData.cep}
                   onChange={(e) => {
                     const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                     setFormData({...formData, cep: value});
                     if (value.length === 8) handleCepSearch(value);
                   }}
                   placeholder="00000-000"
                   className={`w-full rounded-xl border border-sititrel-accent/30 ${!isEditing ? 'bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'bg-white'} pl-12 pr-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none transition-all shadow-sm`}
                 />
                 {isSearchingCep && (
                   <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-sititrel-blue animate-spin" />
                 )}
               </div>
             </div>

             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Telefone</label>
               <div className="relative">
                 <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-accent" />
                 <input
                   disabled={!isEditing}
                   type="text"
                   value={formData.telefone}
                   onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                   placeholder="(00) 00000-0000"
                   className={`w-full rounded-xl border border-sititrel-accent/30 ${!isEditing ? 'bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'bg-white'} pl-12 pr-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none transition-all shadow-sm`}
                 />
               </div>
             </div>

             <div className="flex flex-col gap-1.5 md:col-span-1">
               <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Logradouro / Bairro</label>
               <div className="relative">
                 <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-accent" />
                 <input
                   disabled={!isEditing}
                   type="text"
                   value={formData.endereco}
                   onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                   placeholder="Rua, Bairro"
                   className={`w-full rounded-xl border border-sititrel-accent/30 ${!isEditing ? 'bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'bg-white'} pl-12 pr-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none transition-all shadow-sm`}
                 />
               </div>
             </div>

             <div className="flex flex-col gap-1.5 md:col-span-1">
               <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Número</label>
               <input
                 disabled={!isEditing}
                 type="text"
                 value={formData.numero}
                 onChange={(e) => setFormData({...formData, numero: e.target.value})}
                 placeholder="S/N"
                 className={`w-full rounded-xl border border-sititrel-accent/30 ${!isEditing ? 'bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'bg-white'} px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none transition-all shadow-sm`}
               />
             </div>

             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Cidade</label>
               <input
                 disabled={!isEditing}
                 type="text"
                 value={formData.cidade}
                 onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                 className={`w-full rounded-xl border border-sititrel-accent/30 ${!isEditing ? 'bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'bg-white'} px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none transition-all shadow-sm`}
               />
             </div>

             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">UF</label>
               <input
                 disabled={!isEditing}
                 type="text"
                 value={formData.uf}
                 onChange={(e) => setFormData({...formData, uf: e.target.value.toUpperCase().slice(0, 2)})}
                 className={`w-full rounded-xl border border-sititrel-accent/30 ${!isEditing ? 'bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'bg-white'} px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none transition-all shadow-sm`}
               />
             </div>
             <div className="flex flex-col gap-1.5 md:col-span-2 hidden">
               <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Link da Foto de Perfil</label>
               <div className="relative">
                 <Camera size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-accent" />
                 <input
                   type="text"
                   value={formData.photoURL}
                   onChange={(e) => setFormData({...formData, photoURL: e.target.value})}
                   placeholder="URL da imagem"
                   className="w-full rounded-xl border border-sititrel-accent/30 bg-white pl-12 pr-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none transition-all shadow-sm"
                 />
               </div>
             </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-sititrel-accent/20"></span></div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-[0.3em]"><span className="bg-white px-4 text-sititrel-blue/30">Dados de Rigor Administrativo</span></div>
          </div>

          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Nome Completo</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-accent" />
                <input
                  required
                  disabled={!isEditing}
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full rounded-xl border border-sititrel-accent/30 pl-12 pr-4 py-3 text-sm font-medium outline-none transition-all ${!isEditing ? 'bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'bg-sititrel-bg/30 focus:border-sititrel-blue'}`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">CPF (Identificador)</label>
              <div className="relative">
                <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-accent" />
                <input
                  disabled={!isAdmin || !isEditing}
                  type="text"
                  value={isAdmin ? formData.cpf : profile.cpf}
                  onChange={(e) => isAdmin && setFormData({...formData, cpf: e.target.value})}
                  className={`w-full rounded-xl border border-sititrel-accent/30 pl-12 pr-4 py-3 text-sm font-medium outline-none transition-all ${(!isAdmin || !isEditing) ? 'bg-sititrel-bg/50 text-sititrel-blue/50 cursor-not-allowed' : 'bg-sititrel-bg/30 focus:border-sititrel-blue'}`}
                />
                {(!isAdmin || !isEditing) && <Lock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-sititrel-blue/20" />}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Empresa</label>
              <div className="relative">
                <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-accent" />
                <select
                  disabled={!isEditing}
                  value={formData.empresa}
                  onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                  className={`w-full rounded-xl border border-sititrel-accent/30 pl-12 pr-4 py-3 text-sm font-medium outline-none appearance-none transition-all ${!isEditing ? 'bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'bg-sititrel-bg/30 focus:border-sititrel-blue cursor-pointer'}`}
                >
                  <option value="">Selecione uma empresa</option>
                  {empresas.map(e => (
                    <option key={e.id} value={e.name}>{e.name}</option>
                  ))}
                  {empresas.length === 0 && (
                    <>
                      <option value="Suzano">Suzano</option>
                      <option value="Eldorado">Eldorado</option>
                      <option value="Sylvamo">Sylvamo</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Matrícula</label>
              <div className="relative">
                {(!isAdmin || !isEditing) && <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-blue/20" />}
                <input
                  disabled={!isAdmin || !isEditing}
                  type="text"
                  value={formData.matricula}
                  onChange={(e) => setFormData({...formData, matricula: e.target.value})}
                  className={`w-full rounded-xl border border-sititrel-accent/30 ${(!isAdmin || !isEditing) ? 'pl-11 pr-4 bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'px-4 bg-sititrel-bg/30 focus:border-sititrel-blue'} py-3 text-sm font-medium outline-none transition-all`}
                  placeholder="Ex: 00.000-X"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">PIS / PASEP</label>
              <input
                disabled={!isEditing}
                type="text"
                value={formData.pis}
                onChange={(e) => setFormData({...formData, pis: e.target.value})}
                className={`w-full rounded-xl border border-sititrel-accent/30 px-4 py-3 text-sm font-medium outline-none transition-all ${!isEditing ? 'bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'bg-sititrel-bg/30 focus:border-sititrel-blue'}`}
                placeholder="123.00000.00-0"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">CTPS</label>
              <input
                disabled={!isEditing}
                type="text"
                value={formData.ctps}
                onChange={(e) => setFormData({...formData, ctps: e.target.value})}
                className={`w-full rounded-xl border border-sititrel-accent/30 px-4 py-3 text-sm font-medium outline-none transition-all ${!isEditing ? 'bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'bg-sititrel-bg/30 focus:border-sititrel-blue'}`}
                placeholder="Número e Série"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Nome do Pai</label>
              <input
                disabled={!isEditing}
                type="text"
                value={formData.nomePai}
                onChange={(e) => setFormData({...formData, nomePai: e.target.value})}
                className={`w-full rounded-xl border border-sititrel-accent/30 px-4 py-3 text-sm font-medium outline-none transition-all ${!isEditing ? 'bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'bg-sititrel-bg/30 focus:border-sititrel-blue'}`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Nome da Mãe</label>
              <input
                disabled={!isEditing}
                type="text"
                value={formData.nomeMae}
                onChange={(e) => setFormData({...formData, nomeMae: e.target.value})}
                className={`w-full rounded-xl border border-sititrel-accent/30 px-4 py-3 text-sm font-medium outline-none transition-all ${!isEditing ? 'bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'bg-sititrel-bg/30 focus:border-sititrel-blue'}`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Estado Civil</label>
              <select
                disabled={!isEditing}
                value={formData.estadoCivil}
                onChange={(e) => setFormData({...formData, estadoCivil: e.target.value as any})}
                className={`w-full rounded-xl border border-sititrel-accent/30 px-4 py-3 text-sm font-medium outline-none appearance-none transition-all ${!isEditing ? 'bg-sititrel-bg/10 cursor-not-allowed opacity-70' : 'bg-sititrel-bg/30 focus:border-sititrel-blue cursor-pointer'}`}
              >
                <option value="Solteiro">Solteiro(a)</option>
                <option value="Casado">Casado(a)</option>
                <option value="Divorciado">Divorciado(a)</option>
                <option value="Viúvo">Viúvo(a)</option>
                <option value="União Estável">União Estável</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-sititrel-accent/50 flex flex-col md:flex-row items-center justify-between gap-6">
            {message ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-2 text-sm font-bold uppercase tracking-widest ${
                  message.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {message.text}
              </motion.div>
            ) : <div />}

            <div className="flex items-center gap-4">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex w-full md:w-auto items-center justify-center gap-3 rounded-xl bg-sititrel-accent px-12 py-4 text-xs font-bold uppercase tracking-widest text-sititrel-blue shadow-lg transition-all hover:bg-sititrel-accent/50 active:scale-95"
                >
                  <Plus size={18} />
                  Atualizar Dados
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex w-full md:w-auto items-center justify-center gap-3 rounded-xl bg-sititrel-bg px-8 py-4 text-xs font-bold uppercase tracking-widest text-sititrel-blue border border-sititrel-accent/50 transition-all hover:bg-sititrel-accent active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={isSaving}
                    type="submit"
                    className="flex w-full md:w-auto items-center justify-center gap-3 rounded-xl bg-sititrel-blue px-12 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-sititrel-blue/10 transition-all hover:bg-sititrel-green active:scale-95 disabled:opacity-50"
                  >
                    <Save size={18} />
                    {isSaving ? 'Gravando...' : 'Salvar Alterações'}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </section>

      {/* Dependentes section */}
      <div className="grid gap-8 md:grid-cols-2">
         <section className="bg-white rounded-[32px] p-8 shadow-sm border border-sititrel-accent">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-serif font-bold text-sititrel-blue">Dependentes</h3>
               <button 
                 onClick={() => setShowDepModal(true)}
                 className="text-[11px] font-bold uppercase tracking-widest text-sititrel-blue underline decoration-sititrel-accent underline-offset-4 hover:text-sititrel-green"
               >
                 + Adicionar
               </button>
            </div>

            <div className={`space-y-3 ${dependentes.length > 4 ? 'max-h-[380px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
              {dependentes.map((dep) => (
                <div key={dep.id} className="flex items-center justify-between p-3 rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/20 hover:bg-sititrel-bg/40 transition-all">
                  <div className="flex items-center gap-3">
                     <div className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-sititrel-blue font-bold shadow-sm text-xs">
                        {dep.name.charAt(0)}
                     </div>
                     <div>
                       <h4 className="text-xs font-bold text-sititrel-text">{dep.name}</h4>
                       <p className="text-[8px] font-bold text-sititrel-blue/60 uppercase tracking-widest leading-none">
                          {dep.parentesco} • {formatDate(dep.dataNascimento)}
                        </p>
                        {dep.cpf && (
                          <p className="text-[8px] font-bold text-sititrel-blue/40 uppercase tracking-widest mt-0.5">
                            CPF: {dep.cpf}
                          </p>
                        )}
                     </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteDependente(dep.id)}
                    className="h-7 w-7 rounded-full flex items-center justify-center text-red-300 hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {dependentes.length === 0 && (
                <div className="py-10 text-center text-sititrel-text/40 text-[11px] font-bold uppercase tracking-widest italic">
                   Nenhum dependente vinculado.
                </div>
              )}
            </div>
         </section>

         {/* Admin Verification Card */}
         <section className="bg-sititrel-blue rounded-[32px] p-8 text-white shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
               <div className="bg-white rounded-xl p-2 w-fit">
                 <Logo className="h-10 w-auto" />
               </div>
               <h3 className="text-xl font-serif font-bold">Verificação de Conta</h3>
               <p className="text-sm text-white/70 leading-relaxed font-medium">
                 Seus dados são revisados periodicamente pela diretoria administrativa para garantir a validade dos benefícios e seguros vinculados à sua matrícula.
               </p>
            </div>
            <div className="pt-8 flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-sititrel-green"></div>
               <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Dados verificados pelo Sindicato</span>
            </div>
         </section>
      </div>

      {/* Add Dependent Modal */}
      {showDepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sititrel-blue/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl border border-sititrel-accent"
          >
            <h3 className="text-2xl font-serif font-bold text-sititrel-blue mb-8">Novo Dependente</h3>
            
            {modalError && (
              <div className="mb-6 flex items-center gap-2 p-4 rounded-xl bg-red-50 text-red-600 text-xs font-bold uppercase tracking-widest border border-red-100">
                <AlertCircle size={16} />
                {modalError}
              </div>
            )}

            <div className="space-y-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Nome Completo</label>
                <input
                  type="text"
                  value={newDep.name}
                  onChange={(e) => setNewDep({...newDep, name: e.target.value})}
                  className="w-full rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none transition-all"
                  placeholder="Nome do dependente"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Parentesco</label>
                <select
                  value={newDep.parentesco}
                  onChange={(e) => setNewDep({...newDep, parentesco: e.target.value as any})}
                  className="w-full rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none appearance-none cursor-pointer"
                >
                  <option value="Cônjuge">Cônjuge</option>
                  <option value="Filho(a)">Filho(a)</option>
                  <option value="Pai/Mãe">Pai/Mãe</option>
                  <option value="Enteado(a)">Enteado(a)</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">CPF (Opcional)</label>
                <input
                  type="text"
                  value={newDep.cpf}
                  onChange={(e) => setNewDep({...newDep, cpf: e.target.value})}
                  className="w-full rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none transition-all"
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 ml-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={newDep.dataNascimento}
                  onChange={(e) => setNewDep({...newDep, dataNascimento: e.target.value})}
                  className="w-full rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button 
                onClick={() => setShowDepModal(false)}
                className="flex-1 rounded-xl bg-sititrel-bg py-4 text-[11px] font-bold uppercase tracking-widest text-sititrel-blue border border-sititrel-accent/50 hover:bg-sititrel-accent transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddDependente}
                className="flex-1 rounded-xl bg-sititrel-blue py-4 text-[11px] font-bold uppercase tracking-widest text-white shadow-xl shadow-sititrel-blue/10 hover:bg-sititrel-green active:scale-95 transition-all"
              >
                Gravar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
