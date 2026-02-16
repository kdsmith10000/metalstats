'use client';

import { useEffect, useState, useRef } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';

const LANGUAGES = [
  { code: '', label: 'English', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'ko', label: '\uD55C\uAD6D\uC5B4', flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'zh-CN', label: '\u4E2D\u6587', flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'ja', label: '\u65E5\u672C\u8A9E', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'es', label: 'Espa\u00F1ol', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'de', label: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'fr', label: 'Fran\u00E7ais', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'pt', label: 'Portugu\u00EAs', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'ru', label: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', flag: '\u{1F1F7}\u{1F1FA}' },
  { code: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', flag: '\u{1F1F8}\u{1F1E6}' },
  { code: 'hi', label: '\u0939\u093F\u0928\u094D\u0926\u0940', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'tr', label: 'T\u00FCrk\u00E7e', flag: '\u{1F1F9}\u{1F1F7}' },
];

declare global {
  interface Window {
    google: {
      translate: {
        TranslateElement: new (
          options: { pageLanguage: string; autoDisplay: boolean },
          elementId: string
        ) => void;
      };
    };
    googleTranslateElementInit: () => void;
  }
}

export default function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('');
  const [loaded, setLoaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Google Translate script
    if (document.getElementById('google-translate-script')) {
      setLoaded(true);
      return;
    }

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false },
        'google_translate_element'
      );
      setLoaded(true);
    };

    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src =
      '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectLanguage(langCode: string) {
    setCurrentLang(langCode);
    setOpen(false);

    // Drive Google Translate by setting the cookie
    if (langCode === '') {
      // Reset to English: remove the translate cookie and reload
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;
      window.location.reload();
      return;
    }

    document.cookie = `googtrans=/en/${langCode}; path=/;`;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${window.location.hostname}`;
    window.location.reload();
  }

  const activeLang = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  return (
    <div ref={dropdownRef} className="relative">
      {/* Hidden Google Translate element */}
      <div id="google_translate_element" className="hidden" />

      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-800/80 border border-white/[0.06] hover:bg-zinc-700/80 hover:border-white/10 transition-all duration-200 text-sm text-zinc-300 hover:text-white backdrop-blur-sm"
        aria-label="Translate page"
        title="Translate page"
      >
        <Globe className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
        <span className="hidden sm:inline text-base leading-none">{activeLang.flag}</span>
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-white/[0.08] bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 z-[100] overflow-hidden">
          <div className="px-3 py-2.5 border-b border-white/[0.06]">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 text-center">Translate page</p>
          </div>
          <div className="max-h-72 overflow-y-auto py-1.5 scrollbar-thin">
            {LANGUAGES.map((lang) => {
              const isActive = currentLang === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => selectLanguage(lang.code)}
                  className={`w-full text-left px-3 py-2 text-[13px] transition-all duration-150 flex items-center gap-2.5 rounded-lg mx-auto ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
