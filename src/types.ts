export type Role = 'member' | 'admin';

export interface Empresa {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
}

export interface Noticia {
  id: string;
  title: string;
  content: string;
  createdAt: any;
}

export interface UserProfile {
  id: string;
  cpf: string;
  name: string;
  email: string;
  matricula?: string;
  empresa?: string;
  pis?: string;
  ctps?: string;
  nomePai?: string;
  nomeMae?: string;
  estadoCivil?: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'União Estável';
  telefone?: string;
  cep?: string;
  cidade?: string;
  uf?: string;
  endereco?: string;
  numero?: string;
  photoURL?: string;
  role: Role;
  approved: boolean;
  blocked?: boolean;
  isSocio?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Dependente {
  id: string;
  name: string;
  parentesco: 'Cônjuge' | 'Filho(a)' | 'Pai/Mãe' | 'Enteado(a)' | 'Outro';
  dataNascimento: string;
  cpf?: string;
}
