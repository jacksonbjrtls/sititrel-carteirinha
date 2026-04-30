import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { LayoutDashboard, User, Shield, LogOut } from 'lucide-react';
import Logo from './Logo';
import { motion, AnimatePresence } from 'motion/react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isAdmin, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { name: 'Carteirinha', path: '/', icon: LayoutDashboard },
    { name: 'Meu Perfil', path: '/profile', icon: User },
    ...(isAdmin ? [{ name: 'Admin', path: '/admin', icon: Shield }] : []),
  ];

  const fullName = profile?.name || user?.displayName || user?.email?.split('@')[0] || '';
  const nameParts = fullName.trim().split(/\s+/);
  const displayName = nameParts.length <= 1 ? nameParts[0] : `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;

  return (
    <div className="min-h-screen bg-sititrel-bg font-sans text-sititrel-text">
      {/* Sidebar / Desktop Nav */}
      <nav className="fixed bottom-0 z-50 w-full border-t border-sititrel-accent bg-white md:top-0 md:h-screen md:w-64 md:border-r md:border-t-0 lg:w-72">
        <div className="flex flex-col h-full">
          <div className="hidden border-b border-sititrel-accent/50 p-6 md:block">
            <div className="flex items-center justify-center py-2">
              <Logo 
                className="h-20 w-auto"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-row justify-around p-2 md:flex-col md:justify-start md:gap-1 md:p-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all md:px-5 ${
                  location.pathname === item.path
                    ? 'bg-sititrel-blue text-white shadow-md'
                    : 'text-slate-500 hover:bg-sititrel-accent/30 hover:text-sititrel-blue'
                }`}
              >
                <item.icon size={20} className={location.pathname === item.path ? 'text-white' : 'text-slate-400'} />
                <span className="hidden md:block">{item.name}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all md:px-5 text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={20} className="text-slate-400 group-hover:text-red-600" />
              <span className="hidden md:block">Sair</span>
            </button>
          </div>

          <div className="hidden border-t border-sititrel-accent/50 p-4 md:hidden">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium text-slate-500 transition-all hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-24 md:pb-0 md:pl-64 lg:pl-72 focus:outline-none">
        <header className="sticky top-0 z-40 border-b border-sititrel-accent bg-white/70 p-4 backdrop-blur-md md:p-6 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo 
                className="h-8 w-auto md:hidden"
              />
              <h1 className="text-xl font-serif font-bold text-sititrel-blue md:text-2xl">
                {navItems.find(i => i.path === location.pathname)?.name || 'SITITREL'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end mr-2">
                <span className="text-xs font-bold text-sititrel-text">{displayName}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-sititrel-blue/60">
                  {isAdmin ? 'Administrador' : 'Associado'}
                </span>
              </div>
              <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-sititrel-accent shadow-sm flex items-center justify-center text-sititrel-blue font-bold">
                {(profile?.name || user?.displayName || user?.email)?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Layout;
