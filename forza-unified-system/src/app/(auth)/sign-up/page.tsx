import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="glass-panel w-full max-w-md rounded-[2rem] p-7 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <LockKeyhole size={24} />
        </div>

        <p className="mt-6 text-xs font-black uppercase tracking-wide text-slate-400">
          Forza Unified System
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-950">
          Private Access Only
        </h1>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          This is a private premium commercial system. New accounts can only be
          created by the Super Admin from the Users module.
        </p>

        <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-800">
            <ShieldCheck size={16} />
            Public registration is disabled
          </div>
        </div>

        <Link
          href="/sign-in"
          className="forza-transition mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl hover:-translate-y-0.5"
        >
          Go to Sign In
        </Link>
      </section>
    </main>
  );
}