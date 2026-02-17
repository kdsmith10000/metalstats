'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { User, LogOut, MessageSquare, Loader2 } from 'lucide-react';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  if (status === 'loading') {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
        <Loader2 className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/auth/login"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-bold text-slate-900 transition-colors"
      >
        <User className="w-3.5 h-3.5" />
        Sign In
      </Link>
    );
  }

  const initials = (session.user.name || session.user.email || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full overflow-hidden border-2 border-amber-500/60 hover:border-amber-500 transition-colors flex items-center justify-center bg-amber-100 dark:bg-amber-900/30"
        aria-label="User menu"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-xl shadow-black/10 dark:shadow-black/40 z-50 py-1 overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {session.user.name || 'User'}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
              {session.user.email}
            </p>
          </div>

          <Link
            href="/discuss"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <MessageSquare className="w-4 h-4 opacity-60" />
            Discuss Forum
          </Link>

          <button
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: '/' });
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            <LogOut className="w-4 h-4 opacity-60" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
