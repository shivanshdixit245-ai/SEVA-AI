import { useState, useEffect } from 'react';
import { Bell, Menu, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import NotificationBell from './NotificationBell';
import AddressSelector from './ui/address-selector';

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = user
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'GU';

  const displayName = user ? user.name : 'Guest User';
  const planLabel = user
    ? user.role === 'admin' ? 'Administrator' : user.role === 'worker' ? 'Service Provider' : 'Standard Plan'
    : 'Guest';

  return (
    <nav className="fixed top-4 right-4 left-4 lg:left-72 z-30 transition-all duration-300">
      <div className="glass-panel rounded-2xl px-6 py-3 flex items-center justify-between shadow-lg backdrop-blur-md bg-white/30 border border-white/40">
        {/* Left Side: Address Selector */}
        <div>
          <AddressSelector />
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-3 bg">

          <div className="flex items-center gap-3">
            {mounted && isAuthenticated ? (
              <Link href="/profile" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white hidden md:block">{displayName}</span>
                </div>
              </Link>
            ) : (
              <Link href="/login" className="flex items-center gap-1 text-xs font-bold text-white bg-[var(--color-seva-accent)] px-3 py-1.5 rounded-lg shadow-lg hover:bg-[var(--color-seva-accent)]/80 transition-all">
                SIGN IN
              </Link>
            )}

            <button className="p-2 text-white/60 hover:text-white transition-colors hover:bg-white/10 rounded-lg">
              <Settings size={18} />
            </button>

            <NotificationBell />
          </div>
        </div>
      </div>
    </nav>
  );
}
