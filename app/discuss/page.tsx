import Link from 'next/link';
import { ArrowLeft, MessageSquare, Users, Lock } from 'lucide-react';
import { getForumCategories, isDatabaseAvailable } from '@/lib/db';

// ISR: re-generate at most every 60 seconds
export const revalidate = 60;

const CATEGORY_COLORS: Record<string, string> = {
  gold: 'from-amber-500 to-yellow-600',
  silver: 'from-slate-400 to-zinc-500',
  platinum: 'from-sky-400 to-blue-500',
  palladium: 'from-violet-400 to-purple-500',
  copper: 'from-orange-500 to-red-500',
  'supply-demand': 'from-emerald-500 to-teal-600',
  general: 'from-indigo-400 to-blue-500',
};

interface ForumCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  thread_count: number;
  post_count: number;
}

export default async function DiscussPage() {
  let categories: ForumCategory[] = [];

  if (isDatabaseAvailable()) {
    try {
      const result = await getForumCategories();
      categories = result as ForumCategory[];
    } catch (error) {
      console.error('Error fetching forum categories:', error);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="flex-1 py-12 px-6 lg:px-24">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
                  Discuss
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Metals market speculation and supply/demand analysis
                </p>
              </div>
            </div>

            {/* Coming soon notice */}
            <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Forum launching soon
                  </p>
                  <p className="text-sm text-amber-700/80 dark:text-amber-400/70 mt-1">
                    Thread creation and replies are coming in the next update. For now, browse the categories below and create an account to be ready when discussions open.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category grid */}
          {categories.length > 0 ? (
            <div className="grid gap-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="group relative rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Category icon */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${CATEGORY_COLORS[category.slug] || 'from-slate-400 to-slate-500'} flex items-center justify-center shrink-0`}>
                      <span className="text-sm font-black text-white">
                        {category.icon || category.name.charAt(0)}
                      </span>
                    </div>

                    {/* Category info */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {category.name}
                      </h2>
                      {category.description && (
                        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                          {category.description}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6 text-xs text-slate-400 dark:text-zinc-500 shrink-0">
                      <div className="text-center">
                        <p className="font-bold text-slate-600 dark:text-zinc-300 text-sm">
                          {category.thread_count}
                        </p>
                        <p>threads</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-slate-600 dark:text-zinc-300 text-sm">
                          {category.post_count}
                        </p>
                        <p>posts</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Fallback static categories when DB is unavailable */
            <div className="grid gap-4">
              {[
                { name: 'Gold', slug: 'gold', icon: 'Au', description: 'Gold market speculation, COMEX inventory, and price outlook' },
                { name: 'Silver', slug: 'silver', icon: 'Ag', description: 'Silver supply/demand dynamics and trading discussion' },
                { name: 'Platinum', slug: 'platinum', icon: 'Pt', description: 'Platinum market analysis and industrial demand' },
                { name: 'Palladium', slug: 'palladium', icon: 'Pd', description: 'Palladium supply constraints and automotive demand' },
                { name: 'Copper', slug: 'copper', icon: 'Cu', description: 'Copper macro trends and warehouse movements' },
                { name: 'Supply & Demand', slug: 'supply-demand', icon: 'SD', description: 'Cross-metal supply chain analysis and macro outlook' },
                { name: 'General', slug: 'general', icon: 'GN', description: 'Off-topic, introductions, and site feedback' },
              ].map((category) => (
                <div
                  key={category.slug}
                  className="group relative rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${CATEGORY_COLORS[category.slug] || 'from-slate-400 to-slate-500'} flex items-center justify-center shrink-0`}>
                      <span className="text-sm font-black text-white">{category.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {category.name}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                        {category.description}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 text-xs text-slate-400 dark:text-zinc-500 shrink-0">
                      <div className="text-center">
                        <p className="font-bold text-slate-600 dark:text-zinc-300 text-sm">0</p>
                        <p>threads</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-slate-600 dark:text-zinc-300 text-sm">0</p>
                        <p>posts</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sign-in CTA */}
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
              <Users className="w-4 h-4" />
              <span>
                <Link href="/auth/register" className="font-semibold text-amber-600 dark:text-amber-400 hover:underline">
                  Create an account
                </Link>
                {' '}or{' '}
                <Link href="/auth/login" className="font-semibold text-amber-600 dark:text-amber-400 hover:underline">
                  sign in
                </Link>
                {' '}to participate when discussions open.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
