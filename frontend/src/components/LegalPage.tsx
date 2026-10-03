import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { LEGAL_UPDATED } from '@/data/legal';

/** Shared frame for the privacy policy and terms: plain, readable, on theme. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FFE5] text-black flex flex-col">
      <main id="main" tabIndex={-1} className="outline-none flex-1 w-full max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-xs font-black uppercase neo-border rounded-lg bg-white px-3 py-2 mb-8 hover:-translate-y-0.5 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
          TuneIt home
        </Link>
        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight mb-3">{title}</h1>
        <p className="font-mono text-xs font-bold text-slate-600 mb-6">Last updated {LEGAL_UPDATED}</p>
        <p className="text-base leading-relaxed mb-10 max-w-prose">{intro}</p>
        <div className="flex flex-col gap-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white neo-border rounded-2xl p-6">
      <h2 className="text-xl font-black uppercase mb-3">{title}</h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed max-w-prose [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}
