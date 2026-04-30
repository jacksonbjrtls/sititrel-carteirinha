import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, orderBy, setDoc, addDoc, getDocs } from 'firebase/firestore';
import { UserProfile, Empresa, Noticia, Dependente } from '../types';
import { Search, Filter, UserCheck, UserX, Shield, MoreVertical, Trash2, Edit2, CheckCircle, Clock, Upload, Plus, Building, Ban, Download, X, Newspaper, ShieldAlert, User, Phone, Mail, Briefcase, Users, MapPin, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { utils, writeFile } from 'xlsx';
import DigitalCard from '../components/DigitalCard';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

const AdminDashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newNews, setNewNews] = useState({ title: '', content: '' });
  const [downloadingUserId, setDownloadingUserId] = useState<string | null>(null);
  const [activeDownloadProfile, setActiveDownloadProfile] = useState<UserProfile | null>(null);
  const [activeDownloadDeps, setActiveDownloadDeps] = useState<Dependente[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);

  const lookupCep = async (cep: string, isEdit: boolean = true) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLookingUpCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        if (isEdit) {
          setEditFormData((prev: any) => ({
            ...prev,
            cep: cleanCep,
            endereco: data.logradouro,
            cidade: data.localidade,
            uf: data.uf
          }));
        } else {
          // For the "Add User" uncontrolled form, we can update values via document
          const form = document.querySelector('form[data-novo-associado=true]') as HTMLFormElement;
          if (form) {
             (form.elements.namedItem('endereco') as HTMLInputElement).value = data.logradouro || '';
             (form.elements.namedItem('cidade') as HTMLInputElement).value = data.localidade || '';
             (form.elements.namedItem('uf') as HTMLInputElement).value = data.uf || '';
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsLookingUpCep(false);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditFormData({ 
      name: user.name, 
      cpf: user.cpf, 
      empresa: user.empresa || '', 
      matricula: user.matricula || '',
      isSocio: user.isSocio || false,
      pis: user.pis || '',
      ctps: user.ctps || '',
      nomePai: user.nomePai || '',
      nomeMae: user.nomeMae || '',
      estadoCivil: user.estadoCivil || 'Solteiro',
      telefone: user.telefone || '',
      cep: user.cep || '',
      cidade: user.cidade || '',
      uf: user.uf || '',
      endereco: user.endereco || '',
      numero: user.numero || ''
    });
    setIsEditing(true);
    setShowDetailModal(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    try {
      const { id, ...rest } = editFormData;
      await updateDoc(doc(db, 'profiles', selectedUser.id), {
        ...editFormData,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
      // We don't close the modal immediately so the user can see the saved state
      // Actually, standard behavior is to close or stay in read mode.
      // Let's stay in read mode.
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'profiles');
    }
  };

  const handleDownloadUserCard = async (user: UserProfile) => {
    try {
      console.log('Admin iniciando download de carteirinha para:', user.name);
      setDownloadingUserId(user.id);
      setActiveDownloadProfile(user);
      
      // Fetch dependents for this user to include on card back
      const depsPath = `profiles/${user.id}/dependentes`;
      let userDeps: Dependente[] = [];
      try {
        const depsSnap = await getDocs(collection(db, depsPath));
        userDeps = depsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Dependente));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, depsPath);
      }
      setActiveDownloadDeps(userDeps);

      // Wait for rendering fully
      await new Promise(resolve => setTimeout(resolve, 3000));

      const innerId = `printable-card-inner-${user.id}`;
      const innerContainer = document.getElementById(innerId);
      
      if (!innerContainer) {
        throw new Error(`Container de impressão não localizado (ID: ${innerId}).`);
      }

      const cardParts = Array.from(innerContainer.children) as HTMLElement[];

      if (cardParts.length === 0) {
        throw new Error("O conteúdo da carteirinha está vazio.");
      }

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

        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const ratio = imgProps.width / imgProps.height;
        const width = pdfHeight * ratio;
        const x = (pdfWidth - width) / 2;

        pdf.addImage(dataUrl, "PNG", x, 0, width, pdfHeight);
      }
      
      const fileName = `carteirinha-sititrel-${user.name.replace(/\s+/g, '_').toUpperCase()}.pdf`;
      pdf.save(fileName);
      console.log('PDF gerado com sucesso via admin:', fileName);

    } catch (err: any) {
      console.error('Download Error (Admin):', err);
      alert(`Erro ao gerar carteirinha: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setDownloadingUserId(null);
      setActiveDownloadProfile(null);
      setActiveDownloadDeps([]);
    }
  };

  useEffect(() => {
    const qProfiles = query(collection(db, 'profiles'), orderBy('createdAt', 'desc'));
    const unsubProfiles = onSnapshot(qProfiles, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setProfiles(list);
      setStats({
        total: list.length,
        pending: list.filter(p => !p.approved).length,
        active: list.filter(p => p.approved).length
      });
      setLoading(false);
    });

    const qEmpresas = query(collection(db, 'empresas'), orderBy('name', 'asc'));
    const unsubEmpresas = onSnapshot(qEmpresas, (snapshot) => {
      setEmpresas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Empresa)));
    });

    const qNoticias = query(collection(db, 'noticias'), orderBy('createdAt', 'desc'));
    const unsubNoticias = onSnapshot(qNoticias, (snapshot) => {
      setNoticias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Noticia)));
    });

    return () => {
      unsubProfiles();
      unsubEmpresas();
      unsubNoticias();
    };
  }, []);

  const handleToggleApproval = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'profiles', user.id), {
        approved: !user.approved,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'profiles');
    }
  };

  const handleToggleBlock = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'profiles', user.id), {
        blocked: !user.blocked,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'profiles');
    }
  };

  const handleToggleAdmin = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'profiles', user.id), {
        role: user.role === 'admin' ? 'member' : 'admin',
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'profiles');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este usuário?")) return;
    try {
      await deleteDoc(doc(db, 'profiles', userId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'profiles');
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;
    try {
      await addDoc(collection(db, 'empresas'), {
        name: newCompanyName,
        active: true,
        createdAt: new Date().toISOString()
      });
      setNewCompanyName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'empresas');
    }
  };

  const handleToggleCompany = async (empresa: Empresa) => {
    try {
      await updateDoc(doc(db, 'empresas', empresa.id), {
        active: !empresa.active
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'empresas');
    }
  };

  const handleAddNews = async () => {
    if (!newNews.title || !newNews.content) return;
    try {
      await addDoc(collection(db, 'noticias'), {
        ...newNews,
        createdAt: serverTimestamp()
      });
      setNewNews({ title: '', content: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'noticias');
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm('Excluir esta notícia?')) return;
    try {
      await deleteDoc(doc(db, 'noticias', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'noticias');
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Nome: 'João Silva',
        CPF: '123.456.789-00',
        Matricula: '12345',
        Empresa: 'Suzano',
        Email: 'opcional@exemplo.com'
      }
    ];

    const ws = utils.json_to_sheet(templateData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Modelo Importação");
    
    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // Nome
      { wch: 15 }, // CPF
      { wch: 15 }, // Matricula
      { wch: 20 }, // Empresa
      { wch: 30 }  // Email
    ];

    writeFile(wb, "Modelo_Importacao_Sititrel.xlsx");
  };

  const handleMassImport = async () => {
    try {
      if (!importData.trim()) return;
      
      const lines = importData.trim().split('\n');
      if (lines.length < 2) {
        alert('Dados insuficientes para importação.');
        return;
      }

      // Detection of delimiter: look for tabs first (common when copying from Excel), then commas
      let delimiter = ',';
      if (lines[0].includes('\t')) delimiter = '\t';
      else if (!lines[0].includes(',') && lines[0].includes(';')) delimiter = ';';

      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
      const rows = lines.slice(1);

      let successCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        if (!row.trim()) continue;
        const values = row.split(delimiter);
        const data: any = {};
        
        headers.forEach((header, i) => {
          // Map likely headers to profile fields
          const cleanHeader = header.trim();
          const val = values[i]?.trim();
          if (!val) return;

          if (cleanHeader === 'nome' || cleanHeader === 'name') data.name = val;
          if (cleanHeader === 'email') data.email = val;
          if (cleanHeader === 'cpf') data.cpf = val;
          if (cleanHeader === 'matricula' || cleanHeader === 'matrícula') data.matricula = val;
          if (cleanHeader === 'empresa') data.empresa = val;
          if (cleanHeader === 'pis') data.pis = val;
          if (cleanHeader === 'ctps') data.ctps = val;
          if (cleanHeader === 'telefone' || cleanHeader === 'phone') data.telefone = val;
          if (cleanHeader === 'cep') data.cep = val;
          if (cleanHeader === 'endereco' || cleanHeader === 'endereço' || cleanHeader === 'logradouro') data.endereco = val;
          if (cleanHeader === 'numero' || cleanHeader === 'número') data.numero = val;
          if (cleanHeader === 'cidade' || cleanHeader === 'city') data.cidade = val;
          if (cleanHeader === 'uf' || cleanHeader === 'estado') data.uf = val.toUpperCase().slice(0, 2);
          if (cleanHeader === 'pai' || cleanHeader === 'nome do pai') data.nomePai = val;
          if (cleanHeader === 'mae' || cleanHeader === 'mãe' || cleanHeader === 'nome da mãe') data.nomeMae = val;
        });

        if (data.name && data.cpf) {
          try {
            const tempId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await setDoc(doc(db, 'profiles', tempId), {
              ...data,
              email: data.email || `membro_${Math.random().toString(36).substr(2, 5)}@sititrel.com`,
              role: 'member',
              approved: true,
              isSocio: true,
              isImported: true, // Flag to identify mass imported users
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            successCount++;
          } catch (e) {
            console.error("Error importing row:", e);
            errorCount++;
          }
        } else {
          errorCount++;
        }
      }
      
      alert(`Importação concluída! ${successCount} associados importados.${errorCount > 0 ? ` ${errorCount} linhas ignoradas por erro ou dados incompletos (Certifique-se de preencher Nome e CPF).` : ''}`);
      setShowImportModal(false);
      setImportData('');
    } catch (err) {
      alert('Erro na importação. Verifique o formato dos dados.');
      console.error(err);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.cpf.includes(searchTerm) || 
                          p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' ? true : 
                         filter === 'pending' ? !p.approved : p.approved;
    return matchesSearch && matchesFilter;
  });

  const pendingCount = profiles.filter(p => !p.approved).length;

  return (
    <div className="space-y-10 selection:bg-sititrel-accent/30">
      {/* Hidden printable card for admin download */}
      <div className="fixed top-0 left-[-9999px] pointer-events-none -z-50 block w-[1200px] h-auto overflow-visible">
        {activeDownloadProfile && (
          <DigitalCard profile={activeDownloadProfile} dependents={activeDownloadDeps} isDownload={true} />
        )}
      </div>
      {/* Header and Quick Actions */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
           <h2 className="text-3xl font-serif font-bold text-sititrel-blue">Painel Administrativo</h2>
           <p className="text-sm text-sititrel-text/60 font-medium">Gestão de {stats.total} associados e empresas.</p>
        </div>
        <div className="flex flex-wrap gap-3">
           <button 
             onClick={() => setShowCompanyModal(true)}
             className="flex items-center gap-2 rounded-xl border border-sititrel-accent bg-white px-5 py-2.5 text-sm font-bold text-sititrel-blue shadow-sm transition-all hover:bg-sititrel-accent"
           >
             <Building size={18} />
             Empresas
           </button>
           <button 
             onClick={() => setShowNewsModal(true)}
             className="flex items-center gap-2 rounded-xl border border-sititrel-accent bg-white px-5 py-2.5 text-sm font-bold text-sititrel-blue shadow-sm transition-all hover:bg-sititrel-accent"
           >
             <Newspaper size={18} />
             Notícias
           </button>
           <button 
             onClick={() => setShowImportModal(true)}
             className="flex items-center gap-2 rounded-xl border border-sititrel-accent bg-white px-5 py-2.5 text-sm font-bold text-sititrel-blue shadow-sm transition-all hover:bg-sititrel-accent"
           >
             <Upload size={18} />
             Importar
           </button>
           <button 
             onClick={() => setShowAddUserModal(true)}
             className="flex items-center gap-2 rounded-xl bg-sititrel-blue px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sititrel-blue/20 transition-all hover:bg-sititrel-blue-dark"
           >
             <Plus size={18} />
             Novo Usuário
           </button>
        </div>
      </div>

      {/* Stats / Header */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-[32px] border border-sititrel-accent/20 bg-white p-8 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/40 mb-2">Total de Cadastros</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-serif font-black text-sititrel-blue">{stats.total}</p>
          </div>
        </div>
        <div className="rounded-[32px] border border-sititrel-accent/30 bg-sititrel-bg/50 p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sititrel-accent/10 rounded-full -mr-12 -mt-12 blur-xl" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/60 mb-2">Solicitações Pendentes</p>
          <div className="flex items-center gap-3">
            <p className="text-4xl font-serif font-black text-sititrel-blue">{stats.pending}</p>
            {stats.pending > 0 && <Clock className="text-sititrel-blue/40 animate-pulse" size={24} />}
          </div>
        </div>
        <div className="rounded-[32px] bg-sititrel-blue p-8 shadow-xl shadow-sititrel-blue/10 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mb-10 blur-xl" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-2">Associados Ativos</p>
          <p className="text-4xl font-serif font-black text-white">{stats.active}</p>
        </div>
      </div>

      {/* Main Table Area */}
      <section className="rounded-[40px] border border-sititrel-accent/20 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-6 border-b border-sititrel-accent/10 p-8 md:flex-row md:items-center md:justify-between bg-sititrel-bg/10">
           <div className="relative flex-1 group">
             <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-sititrel-accent group-focus-within:text-sititrel-blue transition-colors" />
             <input
               type="text"
               placeholder="Buscar por nome, CPF ou email..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full rounded-2xl border border-sititrel-accent/30 bg-white pl-12 pr-4 py-4 text-sm font-medium text-sititrel-blue focus:border-sititrel-blue outline-none transition-all shadow-inner placeholder:text-sititrel-blue/30"
             />
           </div>
           
           <div className="flex items-center gap-2 bg-sititrel-bg/40 p-1.5 rounded-2xl border border-sititrel-accent/20">
             {(['all', 'pending', 'approved'] as const).map((f) => (
               <button
                 key={f}
                 onClick={() => setFilter(f)}
                 className={`whitespace-nowrap rounded-xl px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                   filter === f ? 'bg-sititrel-blue text-white shadow-lg' : 'text-sititrel-blue/60 hover:text-sititrel-blue hover:bg-white/50'
                 }`}
               >
                 {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Aprovados'}
               </button>
             ))}
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-sititrel-accent/10 bg-sititrel-bg/20 text-[10px] font-bold uppercase tracking-[0.2em] text-sititrel-blue/40">
                <th className="px-8 py-5">Associado</th>
                <th className="px-8 py-5">Empresa / Documento</th>
                <th className="px-8 py-5">Status do Vínculo</th>
                <th className="px-8 py-5 text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sititrel-accent/10">
              {filteredProfiles.map((user) => (
                <tr 
                  key={user.id} 
                  onClick={() => { setSelectedUser(user); setShowDetailModal(true); }}
                  className={`group hover:bg-sititrel-bg/30 transition-all cursor-pointer ${user.blocked ? 'bg-red-50/30' : ''}`}
                >
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sititrel-accent text-sititrel-blue font-black text-lg shadow-inner overflow-hidden">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.name} className="h-full w-full object-cover" />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-serif font-bold text-sititrel-blue line-clamp-1 text-base leading-tight">{user.name}</span>
                        <span className="text-xs text-sititrel-text/50 font-medium">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Building size={12} className="text-sititrel-blue/30" />
                        <span className="text-xs font-bold text-sititrel-text line-clamp-1">{user.empresa || 'Não informada'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield size={12} className="text-sititrel-blue/30" />
                        <span className="text-[11px] font-mono font-bold text-sititrel-blue/50 tracking-tighter">{user.cpf || 'PENDENTE'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-sititrel-blue/30" />
                        <span className="text-[11px] text-sititrel-text/50 lowercase truncate max-w-[150px]">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {(user as any).isSocio ? (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-200">
                            Sócio
                          </span>
                        ) : (
                          <span className="rounded-md bg-sititrel-bg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-sititrel-blue/40 border border-sititrel-accent/20">
                            Visitante
                          </span>
                        )}
                        
                        {user.approved ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                            <CheckCircle size={12} /> Ativo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-amber-600 animate-pulse">
                            <Clock size={12} /> Pendente
                          </span>
                        )}
                        
                        {user.blocked && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-red-600">Bloqueado</span>
                        )}
                        
                        {user.role === 'admin' && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-sititrel-blue bg-sititrel-accent/50 px-2 py-0.5 rounded">Admin</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!user.approved ? (
                          <button 
                            onClick={() => handleToggleApproval(user)}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
                          >
                            <UserCheck size={14} /> Ativar Associado
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleToggleApproval(user)}
                            className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2"
                          >
                            <UserX size={14} /> Dar Baixa (Revogar)
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleDownloadUserCard(user)}
                        disabled={downloadingUserId === user.id}
                        className={`p-3 rounded-xl border border-sititrel-blue/20 text-sititrel-blue hover:bg-sititrel-blue hover:text-white transition-all ${downloadingUserId === user.id ? 'opacity-50' : ''}`}
                        title="Baixar Carteirinha"
                      >
                        {downloadingUserId === user.id ? <Clock className="animate-spin" size={18} /> : <Download size={18} />}
                      </button>
                      
                      <div className="group/dropdown relative">
                        <button className="p-3 rounded-xl border border-sititrel-accent/30 text-sititrel-blue/60 hover:bg-sititrel-bg transition-all">
                          <MoreVertical size={18} />
                        </button>
                        
                        <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white p-2 shadow-2xl border border-sititrel-accent/20 opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all z-20">
                          <button 
                            onClick={() => handleToggleBlock(user)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-sititrel-blue hover:bg-sititrel-bg rounded-xl"
                          >
                            {user.blocked ? <ShieldAlert size={16} /> : <Ban size={16} />}
                            {user.blocked ? 'Desbloquear' : 'Bloquear'}
                          </button>
                          <button 
                            onClick={() => handleToggleAdmin(user)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-sititrel-blue hover:bg-sititrel-bg rounded-xl"
                          >
                            <Shield size={16} />
                            {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                          </button>
                          <div className="h-px bg-sititrel-accent/20 my-2 mx-2" />
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl"
                          >
                            <Trash2 size={16} />
                            Excluir Registro
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                       <Search size={48} className="text-sititrel-accent/30" />
                       <p className="text-sm font-medium text-sititrel-text/40 font-serif italic">
                         Nenhum associado encontrado nesta listagem.
                       </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-sititrel-blue/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-[40px] p-10 shadow-2xl border border-sititrel-accent"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-sititrel-blue">Importação em Massa</h3>
                  <p className="text-sm text-sititrel-text/60 mt-1">Cole os dados da sua planilha para importar múltiplos associados.</p>
                </div>
                <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-sititrel-bg rounded-full transition-all">
                  <X size={24} className="text-sititrel-blue/40" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-sititrel-bg p-6 rounded-2xl border border-sititrel-accent/30">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-sititrel-blue/60">Estrutura Sugerida (Tabela)</p>
                    <button 
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 text-[10px] font-bold text-sititrel-blue hover:underline"
                    >
                      <Download size={12} />
                      Baixar Modelo Excel (.xlsx)
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto rounded-xl border border-sititrel-accent/20 bg-white shadow-inner">
                    <table className="w-full text-[10px] text-left">
                      <thead>
                        <tr className="bg-sititrel-bg/50 border-b border-sititrel-accent/10">
                          <th className="px-4 py-2 font-black border-r border-sititrel-accent/10">NOME</th>
                          <th className="px-4 py-2 font-black border-r border-sititrel-accent/10">CPF</th>
                          <th className="px-4 py-2 font-black border-r border-sititrel-accent/10">MATRICULA</th>
                          <th className="px-4 py-2 font-black border-r border-sititrel-accent/10 uppercase">EMPRESA</th>
                          <th className="px-4 py-2 font-black uppercase text-sititrel-blue/40">EMAIL (OPCIONAL)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-sititrel-accent/5">
                          <td className="px-4 py-2 text-sititrel-text/40 border-r border-sititrel-accent/5 italic">João Silva</td>
                          <td className="px-4 py-2 text-sititrel-text/40 border-r border-sititrel-accent/5 italic">123.456.789-00</td>
                          <td className="px-4 py-2 text-sititrel-text/40 border-r border-sititrel-accent/5 italic">12345</td>
                          <td className="px-4 py-2 text-sititrel-text/40 border-r border-sititrel-accent/5 italic">Suzano</td>
                          <td className="px-4 py-2 text-sititrel-text/20 italic">---</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-sititrel-text/40 mt-3 font-medium">
                    * Dica: Você pode copiar e colar direto do **Excel** para o campo abaixo.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/60 ml-1">Cole aqui os dados</label>
                  <textarea 
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Cole as colunas do Excel ou os dados separados por vírgula..."
                    className="w-full h-48 rounded-2xl border border-sititrel-accent/30 bg-sititrel-bg/30 p-5 text-sm font-mono focus:border-sititrel-blue outline-none transition-all placeholder:text-sititrel-blue/20"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowImportModal(false)}
                    className="flex-1 rounded-xl bg-sititrel-bg py-4 text-[11px] font-bold uppercase tracking-widest text-sititrel-blue border border-sititrel-accent/50 hover:bg-sititrel-accent transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleMassImport}
                    className="flex-1 rounded-xl bg-sititrel-blue py-4 text-[11px] font-bold uppercase tracking-widest text-white shadow-xl shadow-sititrel-blue/10 hover:bg-sititrel-blue-dark active:scale-95 transition-all"
                  >
                    Iniciar Importação
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Companies Modal */}
      <AnimatePresence>
        {showCompanyModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-sititrel-blue/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl border border-sititrel-accent"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-sititrel-blue">Gestão de Empresas</h3>
                  <p className="text-sm text-sititrel-text/60 mt-1">Empresas conveniadas ao sindicato.</p>
                </div>
                <button onClick={() => setShowCompanyModal(false)} className="p-2 hover:bg-sititrel-bg rounded-full transition-all">
                   <X size={24} className="text-sititrel-blue/40" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Nome da empresa"
                    className="flex-1 rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none transition-all"
                  />
                  <button 
                    onClick={handleAddCompany}
                    className="rounded-xl bg-sititrel-blue px-4 py-3 text-white transition-all hover:bg-sititrel-blue-dark"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {empresas.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-4 rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/10">
                      <span className={`text-sm font-bold ${emp.active ? 'text-sititrel-blue' : 'text-sititrel-text/40'}`}>
                        {emp.name}
                      </span>
                      <button 
                        onClick={() => handleToggleCompany(emp)}
                        className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${emp.active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                      >
                        {emp.active ? 'Ativa' : 'Inativa'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Add User Modal */}
      <AnimatePresence>
        {showAddUserModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-sititrel-blue/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-[40px] p-10 shadow-2xl border border-sititrel-accent max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-sititrel-blue">Novo Associado</h3>
                  <p className="text-sm text-sititrel-text/60 mt-1">Cadastro manual de filiado.</p>
                </div>
                <button onClick={() => setShowAddUserModal(false)} className="p-2 hover:bg-sititrel-bg rounded-full transition-all">
                  <X size={24} className="text-sititrel-blue/40" />
                </button>
              </div>

              <form 
                data-novo-associado="true"
                onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);
                try {
                  const tempId = `manual_${Date.now()}`;
                  await setDoc(doc(db, 'profiles', tempId), {
                    ...data,
                    role: 'member',
                    approved: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  });
                  alert('Usuário cadastrado com sucesso!');
                  setShowAddUserModal(false);
                } catch (err) {
                  alert('Erro ao cadastrar usuário.');
                }
              }} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/60 ml-1">Nome Completo</label>
                    <input name="name" required className="rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/60 ml-1">E-mail</label>
                    <input name="email" type="email" required className="rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/60 ml-1">CPF</label>
                    <input name="cpf" required className="rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none" placeholder="000.000.000-00" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/60 ml-1">Matrícula</label>
                    <input name="matricula" className="rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/60 ml-1">CEP</label>
                    <input 
                      name="cep" 
                      maxLength={9}
                      onBlur={(e) => lookupCep(e.target.value, false)}
                      className="rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none" 
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/60 ml-1">Logradouro / Rua</label>
                    <input name="endereco" className="rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/60 ml-1">Número</label>
                    <input name="numero" className="rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/60 ml-1">Cidade</label>
                    <input name="cidade" className="rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/60 ml-1">UF</label>
                    <input name="uf" maxLength={2} className="rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none uppercase" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/60 ml-1">Empresa</label>
                  <select name="empresa" required className="rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none">
                    {empresas.filter(e => e.active).map(e => (
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

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowAddUserModal(false)} className="flex-1 rounded-xl bg-sititrel-bg py-4 text-[11px] font-bold uppercase tracking-widest text-sititrel-blue border border-sititrel-accent/50 hover:bg-sititrel-accent transition-all">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 rounded-xl bg-sititrel-blue py-4 text-[11px] font-bold uppercase tracking-widest text-white shadow-xl shadow-sititrel-blue/10 hover:bg-sititrel-blue-dark active:scale-95 transition-all">
                    Gravar Associado
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* NewsModal */}
      <AnimatePresence>
        {showNewsModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-sititrel-blue/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-[40px] p-10 shadow-2xl border border-sititrel-accent max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-sititrel-blue">Gestão de Notícias</h3>
                  <p className="text-sm text-sititrel-text/60 mt-1">Publicar avisos para os associados.</p>
                </div>
                <button onClick={() => setShowNewsModal(false)} className="p-2 hover:bg-sititrel-bg rounded-full transition-all">
                  <X size={24} className="text-sititrel-blue/40" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/60 ml-1">Título</label>
                    <input 
                      type="text" 
                      value={newNews.title}
                      onChange={(e) => setNewNews({...newNews, title: e.target.value})}
                      className="rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-bold focus:border-sititrel-blue outline-none" 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/60 ml-1">Conteúdo</label>
                    <textarea 
                      value={newNews.content}
                      onChange={(e) => setNewNews({...newNews, content: e.target.value})}
                      className="rounded-xl border border-sititrel-accent/30 bg-sititrel-bg/30 px-4 py-3 text-sm font-medium focus:border-sititrel-blue outline-none h-32" 
                    />
                  </div>
                  <button 
                    onClick={handleAddNews}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-sititrel-blue py-4 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-sititrel-blue/10 hover:bg-sititrel-blue-dark transition-all"
                  >
                    <Plus size={18} />
                    Publicar Agora
                  </button>
                </div>

                <div className="pt-6 border-t border-sititrel-accent/20">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-sititrel-blue/40 mb-4">Notícias Publicadas</h4>
                  <div className="space-y-3">
                    {noticias.map(news => (
                      <div key={news.id} className="flex items-center justify-between p-4 rounded-xl border border-sititrel-accent/20 bg-sititrel-bg/5 transition-all hover:bg-sititrel-bg/20">
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-bold text-sititrel-blue truncate">{news.title}</span>
                          <span className="text-[10px] text-sititrel-text/40">{news.createdAt?.toDate ? news.createdAt.toDate().toLocaleDateString() : 'Recent'}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteNews(news.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {noticias.length === 0 && <p className="text-[10px] text-center italic text-sititrel-text/40">Nenhuma notícia publicada.</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Digital Card for Admin Download Generation - Mounted only during download */}
      {activeDownloadProfile && (
        <DigitalCard profile={activeDownloadProfile} dependents={activeDownloadDeps} isDownload={true} />
      )}
      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sititrel-blue/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-sititrel-accent/10 flex items-center justify-between bg-sititrel-bg/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden bg-white">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-sititrel-blue/10 text-sititrel-blue">
                        <User size={20} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sititrel-blue text-lg">{selectedUser.name}</h3>
                    <p className="text-[10px] font-bold text-sititrel-blue/40 uppercase tracking-widest">
                      ID: {selectedUser.id.substring(0, 8)}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setShowDetailModal(false); setIsEditing(false); }} className="p-2 hover:bg-white rounded-full transition-all">
                  <X size={20} className="text-sititrel-blue/40" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                {/* Status Badge */}
                <div className="flex justify-center">
                  <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${
                    selectedUser.approved ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {selectedUser.approved ? <CheckCircle size={14} /> : <UserX size={14} />}
                    {selectedUser.approved ? 'Acesso Liberado' : 'Associado com Baixa (Inativo)'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* Personal Data Section */}
                  <div className="space-y-4 lg:col-span-1">
                    <p className="text-[10px] font-bold text-sititrel-blue/40 uppercase tracking-widest border-b border-sititrel-accent/10 pb-2 flex items-center gap-2">
                       <User size={12} /> Dados Pessoais
                    </p>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">Nome Completo</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-sititrel-bg/20 rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.name}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">CPF</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-sititrel-bg/20 rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.cpf}
                            onChange={(e) => setEditFormData({...editFormData, cpf: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.cpf || 'Não informado'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">E-mail</p>
                        <p className="text-sm font-bold text-sititrel-blue/50 lowercase truncate">{selectedUser.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">Telefone</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-sititrel-bg/20 rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.telefone}
                            onChange={(e) => setEditFormData({...editFormData, telefone: e.target.value})}
                            placeholder="(00) 00000-0000"
                          />
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.telefone || 'Não informado'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Professional Section */}
                  <div className="space-y-4 lg:col-span-1">
                    <p className="text-[10px] font-bold text-sititrel-blue/40 uppercase tracking-widest border-b border-sititrel-accent/10 pb-2 flex items-center gap-2">
                       <Briefcase size={12} /> Vínculo Profissional
                    </p>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">Empresa</p>
                        {isEditing ? (
                          <select 
                            className="w-full bg-sititrel-bg/20 rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.empresa}
                            onChange={(e) => setEditFormData({...editFormData, empresa: e.target.value})}
                          >
                            <option value="">Selecione...</option>
                            {empresas.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                          </select>
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.empresa || 'Não informado'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">Matrícula</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-sititrel-bg/20 rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.matricula}
                            onChange={(e) => setEditFormData({...editFormData, matricula: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.matricula || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">PIS / PASEP</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-sititrel-bg/20 rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.pis}
                            onChange={(e) => setEditFormData({...editFormData, pis: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.pis || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">CTPS</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-sititrel-bg/20 rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.ctps}
                            onChange={(e) => setEditFormData({...editFormData, ctps: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.ctps || 'N/A'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Family / Social Section */}
                  <div className="space-y-4 lg:col-span-1">
                    <p className="text-[10px] font-bold text-sititrel-blue/40 uppercase tracking-widest border-b border-sititrel-accent/10 pb-2 flex items-center gap-2">
                       <Users size={12} /> Dados Familiares / Sociais
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 py-2 bg-sititrel-bg/10 rounded-xl px-4 border border-sititrel-accent/10">
                        <input 
                          type="checkbox" 
                          id="isSocio"
                          checked={isEditing ? editFormData.isSocio : selectedUser.isSocio} 
                          onChange={(e) => isEditing && setEditFormData({...editFormData, isSocio: e.target.checked})}
                          className="rounded border-sititrel-accent/30 text-sititrel-blue h-4 w-4" 
                        />
                        <label htmlFor="isSocio" className="text-xs font-bold text-sititrel-blue cursor-pointer">Sócio do Sindicato</label>
                      </div>
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">Estado Civil</p>
                        {isEditing ? (
                          <select 
                            className="w-full bg-sititrel-bg/20 rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.estadoCivil}
                            onChange={(e) => setEditFormData({...editFormData, estadoCivil: e.target.value as any})}
                          >
                            <option value="Solteiro">Solteiro(a)</option>
                            <option value="Casado">Casado(a)</option>
                            <option value="Divorciado">Divorciado(a)</option>
                            <option value="Viúvo">Viúvo(a)</option>
                            <option value="União Estável">União Estável</option>
                          </select>
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.estadoCivil || 'Não informado'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">Nome do Pai</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-sititrel-bg/20 rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.nomePai}
                            onChange={(e) => setEditFormData({...editFormData, nomePai: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.nomePai || 'Não informado'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">Nome da Mãe</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-sititrel-bg/20 rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.nomeMae}
                            onChange={(e) => setEditFormData({...editFormData, nomeMae: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.nomeMae || 'Não informado'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="space-y-4 md:col-span-2 lg:col-span-3 bg-sititrel-bg/5 p-6 rounded-3xl border border-sititrel-accent/10">
                    <p className="text-[10px] font-bold text-sititrel-blue/40 uppercase tracking-widest border-b border-sititrel-accent/10 pb-2 flex items-center gap-2">
                       <MapPin size={12} /> Endereço Completo
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">CEP</p>
                        {isEditing ? (
                          <div className="relative">
                            <input 
                              type="text" 
                              maxLength={9}
                              className="w-full bg-white rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                              value={editFormData.cep}
                              onChange={(e) => setEditFormData({...editFormData, cep: e.target.value})}
                              onBlur={(e) => lookupCep(e.target.value, true)}
                            />
                            {isLookingUpCep && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Clock size={12} className="animate-spin text-sititrel-blue/40" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.cep || 'Não informado'}</p>
                        )}
                      </div>
                      <div className="lg:col-span-2">
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">Logradouro / Rua</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-white rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.endereco}
                            onChange={(e) => setEditFormData({...editFormData, endereco: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.endereco || 'Não informado'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">Número</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-white rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.numero}
                            onChange={(e) => setEditFormData({...editFormData, numero: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.numero || 'S/N'}</p>
                        )}
                      </div>
                      <div className="lg:col-span-2">
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">Cidade</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-white rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.cidade}
                            onChange={(e) => setEditFormData({...editFormData, cidade: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.cidade || 'Não informada'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-sititrel-text/40 font-bold uppercase mb-1">UF / Estado</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-white rounded-lg p-2.5 text-xs font-bold text-sititrel-blue border border-sititrel-accent/20 focus:border-sititrel-blue outline-none"
                            value={editFormData.uf}
                            onChange={(e) => setEditFormData({...editFormData, uf: e.target.value.toUpperCase().slice(0, 2)})}
                          />
                        ) : (
                          <p className="text-sm font-bold text-sititrel-blue">{selectedUser.uf || 'N/A'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-sititrel-accent/10 flex justify-between items-center text-[10px] text-sititrel-text/40 font-bold uppercase tracking-widest">
                  <span>Criado em: {selectedUser.createdAt?.toDate ? selectedUser.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}</span>
                  <span>Última Alt: {selectedUser.updatedAt?.toDate ? selectedUser.updatedAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}</span>
                </div>
              </div>

              <div className="p-6 bg-sititrel-bg/10 flex flex-wrap gap-3">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleSaveUser}
                      className="flex-1 min-w-[150px] py-4 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2"
                    >
                      <Save size={16} /> Salvar Alterações
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="flex-1 min-w-[150px] py-4 bg-white border border-sititrel-accent/20 text-sititrel-blue rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-sititrel-bg/50 transition-all"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => handleDownloadUserCard(selectedUser)}
                      disabled={downloadingUserId === selectedUser.id}
                      className="flex-1 min-w-[180px] py-4 bg-sititrel-blue text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-sititrel-blue/90 transition-all shadow-lg shadow-sititrel-blue/10 flex items-center justify-center gap-2"
                    >
                      {downloadingUserId === selectedUser.id ? <Clock className="animate-spin" size={16} /> : <Download size={16} />}
                      Baixar Carteirinha
                    </button>
                    {!selectedUser.approved ? (
                      <button 
                        onClick={() => { handleToggleApproval(selectedUser); setShowDetailModal(false); }}
                        className="flex-1 min-w-[180px] py-4 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2"
                      >
                        <UserCheck size={16} /> Ativar Associado
                      </button>
                    ) : (
                      <button 
                        onClick={() => { handleToggleApproval(selectedUser); setShowDetailModal(false); }}
                        className="flex-1 min-w-[180px] py-4 bg-white border border-red-200 text-red-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                      >
                        <UserX size={16} /> Dar Baixa (Revogar)
                      </button>
                    )}
                    <button 
                      onClick={() => handleEditUser(selectedUser)}
                      className="flex-1 min-w-[120px] py-4 bg-white border border-sititrel-accent/30 text-sititrel-blue rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-sititrel-bg/50 transition-all flex items-center justify-center gap-2"
                    >
                      <Edit2 size={16} /> Editar
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
