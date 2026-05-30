"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Account created. Check your email if confirmation is enabled.");
    window.location.href = "/sign-in";
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="glass-panel w-full max-w-md rounded-[2rem] p-7">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Forza Unified System
            </p>
            <h1 className="text-2xl font-black text-slate-950">
              Create Account
            </h1>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white/75 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Sparkles size={16} />
            Default role after signup: Manager
          </div>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
              placeholder="Minimum 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="forza-transition flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
            <ArrowRight size={18} />
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-semibold text-slate-500">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-black text-slate-950">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}