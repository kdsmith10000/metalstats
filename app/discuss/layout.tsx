import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discuss - Metals Forum',
  description: 'Join the Heavy Metal Stats community forum. Discuss gold, silver, platinum, palladium, and copper markets, supply and demand analysis, and trading speculation.',
  alternates: {
    canonical: 'https://heavymetalstats.com/discuss',
  },
  openGraph: {
    title: 'Discuss - Metals Market Forum | Heavy Metal Stats',
    description: 'Community forum for precious metals market discussion. Gold, silver, platinum, copper speculation and supply/demand analysis.',
    url: 'https://heavymetalstats.com/discuss',
  },
};

export default function DiscussLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
