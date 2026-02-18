'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';

export default function CollapsibleReferences({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-20 mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 mb-5 w-full group cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-500">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
          References
        </h2>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 dark:text-slate-500 ml-auto transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${open ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
