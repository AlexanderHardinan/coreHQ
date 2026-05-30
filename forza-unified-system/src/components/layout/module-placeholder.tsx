import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

type ModulePlaceholderProps = {
  title: string;
  description: string;
};

export function ModulePlaceholder({
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="glass-panel w-full max-w-3xl rounded-[2rem] p-8">
        <Link
          href="/dashboard"
          className="forza-transition mb-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-black text-slate-700 hover:bg-white hover:text-slate-950"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Construction size={26} />
        </div>

        <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950">
          {title}
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          {description}
        </p>

        <div className="mt-6 rounded-3xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-800">
            Module UI, CRUD, realtime sync, filters, reports, and exports will
            be built in the next phases.
          </p>
        </div>
      </section>
    </main>
  );
}