import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ChefHat,
  Crown,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const highlights = [
  {
    title: "Built for Modern Brands",
    description:
      "Designed for restaurant groups that need clarity, control, and premium operational flow.",
    icon: Boxes,
  },
  {
    title: "For Culinary Operations",
    description:
      "Created for kitchens, bars, teams, branches, and daily restaurant execution.",
    icon: ChefHat,
  },
  {
    title: "Private by Design",
    description:
      "A secure private workspace for authorized teams, managers, and ownership.",
    icon: LockKeyhole,
  },
  {
    title: "Premium Brand Control",
    description:
      "A polished command environment for growing hospitality brands.",
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col justify-center">
        <div className="glass-panel rounded-[2rem] p-8 md:p-12">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <Sparkles size={16} />
            Premium Multi-Brand Restaurant Platform
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
                Forza Unified System
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                A private premium platform designed for modern restaurant
                brands, created to bring every branch, team, and daily operation
                into one refined, secure, and beautifully organized workspace.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  style={{ color: "#ffffff" }}
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-xl transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:text-white active:text-white"
                >
                  <span className="text-white group-hover:text-white group-active:text-white">
                    Enter Dashboard
                  </span>
                  <ArrowRight
                    size={18}
                    className="text-white group-hover:text-white group-active:text-white"
                    color="#ffffff"
                    strokeWidth={2.5}
                  />
                </Link>
              </div>
            </div>

            <div className="glass-panel forza-transition rounded-[2rem] p-5">
              <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
                <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-amber-100/80 blur-3xl" />

                <div className="relative z-10 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-400">
                      Branch Presence
                    </p>
                    <h2 className="text-2xl font-black text-slate-950">
                      North Macedonia
                    </h2>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
                    Skopje Area
                  </div>
                </div>

                <div className="relative z-10 flex min-h-[320px] items-center justify-center">
                  <div className="relative w-full max-w-[520px]">
                    <div className="absolute left-[38%] top-[24%] z-20 flex animate-ping rounded-full bg-red-500/30 p-5" />

                    <div className="absolute left-[41%] top-[27%] z-30">
                      <div className="relative flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-2 shadow-xl">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
                          <MapPin size={16} />
                        </span>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-red-600">
                            Branch Focus
                          </p>
                          <p className="text-sm font-black text-slate-950">
                            Skopje Area
                          </p>
                        </div>
                      </div>
                    </div>

                    <svg
                      viewBox="0 0 520 360"
                      className="h-auto w-full animate-[floatMap_5s_ease-in-out_infinite]"
                      role="img"
                      aria-label="Animated North Macedonia map with Skopje area branch highlight"
                    >
                      <defs>
                        <linearGradient
                          id="mapGradient"
                          x1="0"
                          x2="1"
                          y1="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#f8fafc" />
                          <stop offset="55%" stopColor="#e2e8f0" />
                          <stop offset="100%" stopColor="#dbeafe" />
                        </linearGradient>

                        <filter
                          id="mapShadow"
                          x="-20%"
                          y="-20%"
                          width="140%"
                          height="140%"
                        >
                          <feDropShadow
                            dx="0"
                            dy="18"
                            stdDeviation="18"
                            floodColor="#0f172a"
                            floodOpacity="0.14"
                          />
                        </filter>
                      </defs>

                      <path
                        d="M241 42
                        C268 29 302 40 318 62
                        C339 60 365 66 380 82
                        C404 83 425 98 431 119
                        C454 132 464 154 458 176
                        C471 204 458 226 437 239
                        C438 264 420 282 395 286
                        C377 309 347 312 326 298
                        C303 314 274 307 260 285
                        C231 292 205 278 198 252
                        C166 248 147 225 154 198
                        C135 176 138 146 161 128
                        C159 103 175 82 199 77
                        C205 59 221 48 241 42Z"
                        fill="url(#mapGradient)"
                        stroke="#0f172a"
                        strokeWidth="3"
                        filter="url(#mapShadow)"
                      />

                      <path
                        d="M214 96 C247 118 281 119 327 101"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="2"
                        strokeDasharray="7 8"
                      />

                      <path
                        d="M184 176 C229 158 286 164 424 176"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="2"
                        strokeDasharray="7 8"
                      />

                      <path
                        d="M246 77 C237 132 239 190 260 277"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="2"
                        strokeDasharray="7 8"
                      />

                      <circle
                        cx="228"
                        cy="128"
                        r="12"
                        fill="#dc2626"
                        className="animate-pulse"
                      />
                      <circle
                        cx="228"
                        cy="128"
                        r="26"
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="3"
                        strokeOpacity="0.28"
                        className="animate-ping"
                      />

                      <circle
                        cx="316"
                        cy="184"
                        r="6"
                        fill="#0f172a"
                        opacity="0.7"
                      />
                      <circle
                        cx="372"
                        cy="229"
                        r="6"
                        fill="#0f172a"
                        opacity="0.7"
                      />
                      <circle
                        cx="258"
                        cy="248"
                        r="6"
                        fill="#0f172a"
                        opacity="0.7"
                      />
                    </svg>
                  </div>
                </div>

                <div className="relative z-10 mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Crown size={16} />
                    Designed for premium restaurant brand leadership.
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Built to support focused teams, polished service standards,
                    and confident multi-branch growth.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="forza-transition forza-hover rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-base font-black text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          <footer className="mt-10 border-t border-slate-200 pt-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Developer Rights Chef Alex @FORZA 2026
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}