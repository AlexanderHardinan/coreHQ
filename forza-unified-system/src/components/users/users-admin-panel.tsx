"use client";

import { useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/lib/auth/permissions";
import { roleLabels } from "@/lib/auth/permissions";

type ExistingUser = {
  id: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
};

type UsersAdminPanelProps = {
  users: ExistingUser[];
};

const roles: UserRole[] = [
  "boh_staff",
  "foh_staff",
  "manager",
  "super_admin",
];

export function UsersAdminPanel({ users }: UsersAdminPanelProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("TempPass123!");
  const [role, setRole] = useState<UserRole>("manager");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);

    const response = await fetch("/api/admin/users/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName,
        email,
        password,
        role,
      }),
    });

    const result = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      toast.error(result.message || "Failed to create user.");
      return;
    }

    toast.success("User created successfully.");

    setFullName("");
    setEmail("");
    setPassword("TempPass123!");
    setRole("manager");

    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <UserPlus size={22} />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Super Admin Only
            </p>
            <h1 className="text-2xl font-black text-slate-950">
              Create User Account
            </h1>
          </div>
        </div>

        <form onSubmit={handleCreateUser} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-slate-700">
              Full Name
            </label>
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
              placeholder="Team member name"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Temporary Password
            </label>
            <input
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
              placeholder="Temporary password"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">Role</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-950"
            >
              {roles.map((item) => (
                <option key={item} value={item}>
                  {roleLabels[item]}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="forza-transition flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck size={18} />
              {isSubmitting ? "Creating User..." : "Create User"}
            </button>
          </div>
        </form>
      </section>

      <section className="glass-panel rounded-[2rem] p-6">
        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Account Directory
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            Existing Users
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Name</th>
                <th className="px-4">Role</th>
                <th className="px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="rounded-2xl bg-white shadow-sm">
                  <td className="rounded-l-2xl px-4 py-4 text-sm font-black text-slate-950">
                    {user.full_name || "Unnamed User"}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                    {roleLabels[user.role]}
                  </td>
                  <td className="rounded-r-2xl px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        user.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}

              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="rounded-2xl bg-white px-4 py-6 text-center text-sm font-bold text-slate-500"
                  >
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}