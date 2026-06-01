"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Signed in successfully.");

    const nextPath =
      new URLSearchParams(window.location.search).get("next") || "/dashboard";

    window.location.href = nextPath;
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <section className="glass-panel relative w-full max-w-md overflow-hidden rounded-[2rem] p-7 shadow-2xl">
        <div className="absolute -right-20 -top-20 h-52 w-52 animate-pulse rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-52 w-52 animate-pulse rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute left-1/2 top-10 h-36 w-36 -translate-x-1/2 animate-ping rounded-full bg-slate-200/20" />

        <div className="relative z-10 mb-7 flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl">
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" size={22} />
            ) : (
              <LockKeyhole size={22} />
            )}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Forza Unified System
            </p>
            <h1 className="text-2xl font-black text-slate-950">Sign In</h1>
          </div>
        </div>

        <div className="relative z-10 mb-6 space-y-3">
          <div className="rounded-3xl border border-slate-200 bg-white/75 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Sparkles size={16} />
              Private premium commercial system
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
              <ShieldCheck size={16} />
              Accounts are created only by Super Admin
            </div>
          </div>
        </div>

        <form onSubmit={handleSignIn} className="relative z-10 space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-semibold outline-none transition duration-300 focus:-translate-y-0.5 focus:border-slate-950 focus:shadow-lg"
              placeholder="you@example.com"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Password
            </label>

            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 pr-12 text-sm font-semibold outline-none transition duration-300 focus:-translate-y-0.5 focus:border-slate-950 focus:shadow-lg"
                placeholder="Your password"
                disabled={isSubmitting}
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={isSubmitting}
                className="forza-transition absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="forza-transition group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-80"
          >
            <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition duration-700 group-hover:translate-x-[120%]" />

            {isSubmitting ? (
              <>
                <LoaderCircle className="relative z-10 animate-spin" size={18} />
                <span className="relative z-10">Verifying Access...</span>
              </>
            ) : (
              <>
                <span className="relative z-10">Sign In</span>
                <ArrowRight className="relative z-10" size={18} />
              </>
            )}
          </button>

          {isSubmitting ? (
            <div className="overflow-hidden rounded-full bg-slate-100">
              <div className="h-2 w-1/2 animate-[loadingBar_1.1s_ease-in-out_infinite] rounded-full bg-slate-950" />
            </div>
          ) : null}
        </form>

        <p className="relative z-10 mt-6 text-center text-sm font-semibold text-slate-500">
          Need access? Contact your Super Admin.
        </p>

        <div className="relative z-10 mt-4 text-center">
          <Link href="/" className="text-sm font-black text-slate-950">
            Back to Home
          </Link>
        </div>

        <style jsx>{`
          @keyframes loadingBar {
            0% {
              transform: translateX(-120%);
            }
            50% {
              transform: translateX(60%);
            }
            100% {
              transform: translateX(220%);
            }
          }
        `}</style>
      </section>
    </main>
  );
}