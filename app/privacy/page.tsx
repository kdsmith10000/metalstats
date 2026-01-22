import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Metal Stats - COMEX Metals Inventory Tracker. Learn how we handle your data and protect your privacy.',
  alternates: {
    canonical: 'https://metalstats.vercel.app/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | COMEX Metals Tracker',
    description: 'Privacy Policy for Metal Stats - COMEX Metals Inventory Tracker.',
    url: 'https://metalstats.vercel.app/privacy',
  },
};

export default function PrivacyPolicy() {
  const sections = [
    {
      title: '1. Information Collection',
      content: 'This application does not actively collect, store, or transmit personal information. No cookies, tracking pixels, or analytics scripts are embedded that collect personal data. No user accounts or login credentials are required to use this Service.',
    },
    {
      title: '2. Data Sources',
      content: 'All market data displayed is sourced from publicly available CME Group reports. No proprietary user data is incorporated into the analysis. The data presented includes warehouse inventory levels, delivery notices, and related market statistics.',
    },
    {
      title: '3. Third-Party Services',
      content: 'Links to external websites (CME Group, etc.) are provided for convenience. These third parties have their own privacy policies which we encourage you to review. We are not responsible for the privacy practices of external websites.',
    },
    {
      title: '4. Local Storage',
      content: 'This application may use browser local storage to save user preferences such as theme settings (light/dark mode). This data is stored locally on your device and is not transmitted to any server. You can clear this data at any time through your browser settings.',
    },
    {
      title: '5. Data Security',
      content: 'Since no personal data is collected, there is no personal data to secure. However, we recommend using secure connections (HTTPS) when accessing this Service and external data sources.',
    },
    {
      title: '6. Analytics',
      content: 'This application may use Vercel Analytics to collect anonymous usage statistics such as page views and general geographic regions. This data is aggregated and does not identify individual users. No personal information is collected through analytics.',
    },
    {
      title: '7. Changes to This Policy',
      content: 'We may update this Privacy Policy from time to time. Any changes will be reflected on this page with an updated revision date. Continued use of the Service after changes constitutes acceptance of the modified policy.',
    },
    {
      title: '8. Contact',
      content: 'For privacy-related inquiries or concerns, please reach out through appropriate channels. We are committed to addressing any questions about our data practices.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 px-8 lg:px-24">
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
            Privacy Policy
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Last Updated: January 21, 2026
          </p>
        </div>

        <div className="grid gap-6">
          {sections.map((section, index) => (
            <div 
              key={index}
              className="p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-sm"
            >
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
                {section.title}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
