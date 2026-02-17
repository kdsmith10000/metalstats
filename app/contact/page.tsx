import Link from 'next/link';
import { ArrowLeft, Mail, Newspaper } from 'lucide-react';

export const metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Heavy Metal Stats. Questions, feedback, or suggestions about our COMEX metals inventory tracker? We would love to hear from you.',
  alternates: {
    canonical: 'https://heavymetalstats.com/contact',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: 'Contact Us | Heavy Metal Stats',
    description: 'Get in touch with Heavy Metal Stats. Questions, feedback, or suggestions about our COMEX metals inventory tracker?',
    url: 'https://heavymetalstats.com/contact',
  },
  other: {
    'google-adsense-account': 'ca-pub-1319414449875714',
  },
};

export default function Contact() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="flex-1 py-16 px-8 lg:px-24">
        <div className="max-w-4xl mx-auto">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-16"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="mb-16">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-6">
              Contact Us
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Have a question, suggestion, or found a data issue? We&#39;d love to hear from you.
            </p>
          </div>

          <div className="grid gap-6">
            <div className="p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-5 h-5 text-slate-900 dark:text-white" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Email
                </h2>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                The best way to reach us is by email. Whether you have feedback, a bug report, a feature request, or a general question — drop us a line and we&#39;ll get back to you as soon as possible.
              </p>
              <a
                href="mailto:mail@heavymetalstats.com"
                className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline transition-colors"
              >
                mail@heavymetalstats.com
              </a>
            </div>

            <div className="p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Newspaper className="w-5 h-5 text-slate-900 dark:text-white" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Newsletter
                </h2>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                You can also reach out by replying to any of our newsletter emails. If you&#39;re not subscribed yet, sign up from the dashboard to receive daily COMEX inventory updates and market highlights directly in your inbox.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-6 border-t border-slate-200 dark:border-slate-800">
        <div className="w-full px-6 text-center">
          <p className="text-sm text-slate-400">
            Data from CME Group. Informational only — not financial advice.
          </p>
          <nav className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Dashboard</Link>
            <Link href="/precious-metals" className="hover:text-slate-600 dark:hover:text-slate-300">Precious Metal Stats</Link>
            <Link href="/learn" className="hover:text-slate-600 dark:hover:text-slate-300">Learn</Link>
            <Link href="/delivery" className="hover:text-slate-600 dark:hover:text-slate-300">Delivery Notices</Link>
            <Link href="/api-info" className="hover:text-slate-600 dark:hover:text-slate-300">API</Link>
            <Link href="/about" className="hover:text-slate-600 dark:hover:text-slate-300">About</Link>
            <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
