'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, BarChart3, BookOpen, FileText, Truck, Code, Info, Mail, Newspaper } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import NewsletterSignup from './NewsletterSignup';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/precious-metals', label: 'Precious Metals', icon: FileText },
  { href: '/learn', label: 'Learn', icon: BookOpen },
  { href: '/delivery', label: 'Delivery Notices', icon: Truck },
  { href: '/blog', label: 'Blog', icon: Newspaper },
  { href: '/api-info', label: 'API', icon: Code },
  { href: '/about', label: 'About', icon: Info },
  { href: '/contact', label: 'Contact', icon: Mail },
];

interface NavbarProps {
  lastUpdatedText: string;
}

export default function Navbar({ lastUpdatedText }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    if (mobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [mobileOpen]);

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  function isLinkActive(href: string) {
    if (href === '/learn' && pathname === '/delivery') return false;
    return isActive(href);
  }

  return (
    <nav
      ref={menuRef}
      className="sticky top-0 z-50 w-full border-b border-slate-200/60 dark:border-white/[0.06] bg-white/95 dark:bg-zinc-950/80 backdrop-blur-xl"
    >
      <div className="w-full px-4 sm:px-6 lg:px-10">
        {/* Main row */}
        <div className="flex items-center justify-between h-12 sm:h-14">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-2.5 shrink-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5 sm:w-[22px] sm:h-[22px]"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="nav-gold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="nav-silver" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4d4d8" />
                    <stop offset="100%" stopColor="#a1a1aa" />
                  </linearGradient>
                  <clipPath id="nav-tl">
                    <polygon points="0,0 24,0 0,24" />
                  </clipPath>
                  <clipPath id="nav-br">
                    <polygon points="24,0 24,24 0,24" />
                  </clipPath>
                </defs>
                {/* Shield — gold top-left half */}
                <path d="M12 2 L21 6 L21 12 C21 17.5 16.5 21 12 22 C7.5 21 3 17.5 3 12 L3 6Z" fill="url(#nav-gold)" clipPath="url(#nav-tl)" />
                {/* Shield — silver bottom-right half */}
                <path d="M12 2 L21 6 L21 12 C21 17.5 16.5 21 12 22 C7.5 21 3 17.5 3 12 L3 6Z" fill="url(#nav-silver)" clipPath="url(#nav-br)" />
                {/* Subtle outline */}
                <path d="M12 2 L21 6 L21 12 C21 17.5 16.5 21 12 22 C7.5 21 3 17.5 3 12 L3 6Z" fill="none" stroke="white" strokeWidth="0.6" strokeOpacity="0.3" />
                {/* Diagonal divider */}
                <line x1="3.5" y1="20" x2="20.5" y2="3.5" stroke="white" strokeWidth="0.5" strokeOpacity="0.25" />
                {/* Ascending bars */}
                <rect x="6.5" y="14" width="2.5" height="4.5" rx="0.4" fill="white" fillOpacity="0.95" />
                <rect x="10.75" y="11" width="2.5" height="7.5" rx="0.4" fill="white" fillOpacity="0.95" />
                <rect x="15" y="7.5" width="2.5" height="11" rx="0.4" fill="white" fillOpacity="0.95" />
              </svg>
            </div>
            <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white uppercase">
              Heavy Metal Stats
            </span>
          </Link>

          {/* Desktop nav links — centered */}
          <div className="hidden lg:flex items-center gap-1.5">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${
                  isLinkActive(href)
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10'
                    : 'text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right side: last updated + controls + hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Last updated — desktop only */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-muted-foreground mr-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              <span>Last Updated: {lastUpdatedText}</span>
            </div>

            <NewsletterSignup />
            <LanguageSelector />
            <ThemeToggle />

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-9 h-9 rounded-lg bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700/80 flex items-center justify-center transition-colors !min-h-0 !min-w-0"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? (
                <X className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
              ) : (
                <Menu className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 top-12 bg-black/40 backdrop-blur-sm lg:hidden z-40" />

          <div className="absolute top-full left-0 right-0 lg:hidden bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-white/[0.06] shadow-2xl shadow-black/10 dark:shadow-black/40 z-50 max-h-[calc(100vh-3rem)] overflow-y-auto">
            {/* Last updated — shown in mobile menu */}
            <div className="flex items-center gap-1.5 px-6 pt-3 pb-1 text-[11px] text-muted-foreground">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              <span>Last Updated: {lastUpdatedText}</span>
            </div>

            <div className="px-3 py-2">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isLinkActive(href)
                      ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10'
                      : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-4 h-4 opacity-60" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
