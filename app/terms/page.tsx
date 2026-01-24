import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Metal Stats - COMEX Metals Inventory Tracker. Understand the terms and conditions for using our precious metals tracking service.',
  alternates: {
    canonical: 'https://heavymetalstats.com/terms',
  },
  openGraph: {
    title: 'Terms of Service | COMEX Metals Tracker',
    description: 'Terms of Service for Metal Stats - COMEX Metals Inventory Tracker.',
    url: 'https://heavymetalstats.com/terms',
  },
  other: {
    'google-adsense-account': 'ca-pub-1319414449875714',
  },
};

export default function TermsOfService() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: 'By accessing and using the COMEX Metals Supply & Demand Tracker ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use this Service.',
    },
    {
      title: '2. Description of Service',
      content: 'This Service provides aggregated data and analysis of COMEX precious metals inventory, delivery notices, and market activity. Data is sourced from publicly available CME Group reports including DLV665-T delivery reports and depository statistics.',
    },
    {
      title: '3. Data Disclaimer',
      content: 'All information provided is for informational and educational purposes only. This Service does NOT constitute financial advice, investment recommendations, or trading signals. Data may be delayed, incomplete, or contain errors. Users should verify all information independently before making any financial decisions.',
    },
    {
      title: '4. No Warranty',
      content: 'The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express or implied. We do not guarantee the accuracy, completeness, timeliness, or reliability of any data presented. Past performance and historical data do not guarantee future results.',
    },
    {
      title: '5. Limitation of Liability',
      content: 'Under no circumstances shall the creators, operators, or contributors of this Service be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, including but not limited to trading losses, investment decisions, or data inaccuracies.',
    },
    {
      title: '6. Intellectual Property',
      content: 'The layout, design, and original analysis contained in this Service are proprietary. Raw data is sourced from CME Group and remains their property. Users may not redistribute, sell, or commercially exploit this Service without express written permission.',
    },
    {
      title: '7. User Conduct',
      content: 'Users agree not to: (a) use automated systems to scrape or harvest data at excessive rates; (b) attempt to reverse engineer or compromise the Service; (c) use the Service for any unlawful purpose; (d) misrepresent the source or accuracy of data obtained from this Service.',
    },
    {
      title: '8. Third-Party Links',
      content: 'This Service contains links to CME Group and other third-party websites. We are not responsible for the content, accuracy, or practices of these external sites.',
    },
    {
      title: '9. Modifications',
      content: 'We reserve the right to modify these Terms of Service at any time. Continued use of the Service after changes constitutes acceptance of the modified terms.',
    },
    {
      title: '10. Governing Law',
      content: 'These Terms shall be governed by and construed in accordance with applicable laws. Any disputes shall be resolved through appropriate legal channels.',
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
            Terms of Service
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
