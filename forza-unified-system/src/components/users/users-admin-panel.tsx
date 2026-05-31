"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Pencil,
  Save,
  ShieldCheck,
  Store,
  UserCog,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/lib/auth/permissions";
import { roleLabels } from "@/lib/auth/permissions";
import type { DashboardBrand } from "@/components/layout/dashboard-shell";

export type ExistingUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  is_active: boolean;
};

export type BrandUnitOption = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  is_active: boolean;
};

export type UserUnitAccessRecord = {
  id: string;
  user_id: string;
  brand_unit_id: string;
};

type UsersAdminPanelProps = {
  users: ExistingUser[];
  brands: DashboardBrand[];
  units: BrandUnitOption[];
  userUnitAccess: UserUnitAccessRecord[];
  selectedBrandCode: string;
};

const roles: UserRole[] = [
  "boh_staff",
  "foh_staff",
  "manager",
  "super_admin",
];

export function UsersAdminPanel({
  users,
  brands,
  units,
  userUnitAccess,
  selectedBrandCode,
}: UsersAdminPanelProps) {
  const selectedBrand =
    brands.find((brand) => brand.code === selectedBrandCode) ||
    brands[0] ||
    null;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("TempPass123!");
  const [role, setRole] = useState<UserRole>("manager");
  const [createBrandId, setCreateBrandId] = useState(selectedBrand?.id || "");
  const [createUnitIds, setCreateUnitIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingUserId, setEditingUserId] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("manager");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editBrandId, setEditBrandId] = useState(selectedBrand?.id || "");
  const [editUnitIds, setEditUnitIds] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const createUnits = useMemo(
    () => units.filter((unit) => unit.brand_id === createBrandId),
    [createBrandId, units],
  );

  const editUnits = useMemo(
    () => units.filter((unit) => unit.brand_id === editBrandId),
    [editBrandId, units],
  );

  function getUserUnitIds(userId: string) {
    return userUnitAccess
      .filter((item) => item.user_id === userId)
      .map((item) => item.brand_unit_id);
  }

  function getUserBrandNames(userId: string) {
    const assignedUnitIds = getUserUnitIds(userId);
    const assignedBrandIds = units
      .filter((unit) => assignedUnitIds.includes(unit.id))
      .map((unit) => unit.brand_id)
      .filter(Boolean);

    const uniqueBrandIds = Array.from(new Set(assignedBrandIds));

    return brands
      .filter((brand) => uniqueBrandIds.includes(brand.id))
      .map((brand) => brand.name)
      .join(", ");
  }

  function getUserUnitNames(userId: string) {
    const assignedUnitIds = getUserUnitIds(userId);

    return units
      .filter((unit) => assignedUnitIds.includes(unit.id))
      .map((unit) => unit.name)
      .join(", ");
  }

  function toggleCreateUnit(unitId: string) {
    setCreateUnitIds((current) =>
      current.includes(unitId)
        ? current.filter((id) => id !== unitId)
        : [...current, unitId],
    );
  }

  function toggleEditUnit(unitId: string) {
    setEditUnitIds((current) =>
      current.includes(unitId)
        ? current.filter((id) => id !== unitId)
        : [...current, unitId],
    );
  }

  function beginEdit(user: ExistingUser) {
    const assignedUnitIds = getUserUnitIds(user.id);
    const firstAssignedUnit = units.find((unit) =>
      assignedUnitIds.includes(unit.id),
    );

    setEditingUserId(user.id);
    setEditFullName(user.full_name || "");
    setEditRole(user.role);
    setEditIsActive(user.is_active);
    setEditBrandId(firstAssignedUnit?.brand_id || selectedBrand?.id || "");
    setEditUnitIds(assignedUnitIds);
  }

  function cancelEdit() {
    setEditingUserId("");
    setEditFullName("");
    setEditRole("manager");
    setEditIsActive(true);
    setEditBrandId(selectedBrand?.id || "");
    setEditUnitIds([]);
  }

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
        brandId: createBrandId,
        unitIds: createUnitIds,
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
    setCreateUnitIds([]);

    window.location.reload();
  }

  async function handleUpdateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUserId) {
      toast.error("Select a user to edit.");
      return;
    }

    setIsUpdating(true);

    const response = await fetch("/api/admin/users/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: editingUserId,
        fullName: editFullName,
        role: editRole,
        isActive: editIsActive,
        brandId: editBrandId,
        unitIds: editUnitIds,
      }),
    });

    const result = await response.json();

    setIsUpdating(false);

    if (!response.ok) {
      toast.error(result.message || "Failed to update user.");
      return;
    }

    toast.success("User updated successfully.");
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
          <Field label="Full Name">
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="forza-input"
              placeholder="Team member name"
            />
          </Field>

          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="forza-input"
              placeholder="user@example.com"
            />
          </Field>

          <Field label="Temporary Password">
            <input
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="forza-input"
              placeholder="Temporary password"
            />
          </Field>

          <Field label="Role">
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="forza-input"
            >
              {roles.map((item) => (
                <option key={item} value={item}>
                  {roleLabels[item]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Brand Assignment">
            <select
              value={createBrandId}
              onChange={(event) => {
                setCreateBrandId(event.target.value);
                setCreateUnitIds([]);
              }}
              className="forza-input"
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Branch Unit Access
            </label>
            <div className="mt-2 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3">
              {createUnits.map((unit) => (
                <label
                  key={unit.id}
                  className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={createUnitIds.includes(unit.id)}
                    onChange={() => toggleCreateUnit(unit.id)}
                  />
                  {unit.name}
                </label>
              ))}

              {createUnits.length === 0 ? (
                <p className="text-sm font-bold text-slate-400">
                  No branch units for this brand.
                </p>
              ) : null}
            </div>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="forza-button-hover flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck size={18} />
              {isSubmitting ? "Creating User..." : "Create User"}
            </button>
          </div>
        </form>
      </section>

      {editingUserId ? (
        <section className="glass-panel rounded-[2rem] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <UserCog size={22} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-slate-400">
                Edit User
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Role and Access Control
              </h2>
            </div>
          </div>

          <form onSubmit={handleUpdateUser} className="grid gap-4 md:grid-cols-2">
            <Field label="Full Name">
              <input
                required
                value={editFullName}
                onChange={(event) => setEditFullName(event.target.value)}
                className="forza-input"
              />
            </Field>

            <Field label="Role">
              <select
                value={editRole}
                onChange={(event) => setEditRole(event.target.value as UserRole)}
                className="forza-input"
              >
                {roles.map((item) => (
                  <option key={item} value={item}>
                    {roleLabels[item]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                value={editIsActive ? "active" : "inactive"}
                onChange={(event) =>
                  setEditIsActive(event.target.value === "active")
                }
                className="forza-input"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>

            <Field label="Brand Assignment">
              <select
                value={editBrandId}
                onChange={(event) => {
                  setEditBrandId(event.target.value);
                  setEditUnitIds([]);
                }}
                className="forza-input"
              >
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700">
                Branch Unit Access
              </label>
              <div className="mt-2 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-2">
                {editUnits.map((unit) => (
                  <label
                    key={unit.id}
                    className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={editUnitIds.includes(unit.id)}
                      onChange={() => toggleEditUnit(unit.id)}
                    />
                    {unit.name}
                  </label>
                ))}

                {editUnits.length === 0 ? (
                  <p className="text-sm font-bold text-slate-400">
                    No branch units for this brand.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2 sm:flex-row">
              <button
                type="submit"
                disabled={isUpdating}
                className="forza-button-hover flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={cancelEdit}
                className="forza-button-hover flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

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
          <table className="w-full min-w-[900px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-4">Name</th>
                <th className="px-4">Email</th>
                <th className="px-4">Role</th>
                <th className="px-4">Brands</th>
                <th className="px-4">Branch Units</th>
                <th className="px-4">Status</th>
                <th className="px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const brandNames = getUserBrandNames(user.id);
                const unitNames = getUserUnitNames(user.id);

                return (
                  <tr key={user.id} className="rounded-2xl bg-white shadow-sm">
                    <td className="rounded-l-2xl px-4 py-4 text-sm font-black text-slate-950">
                      {user.full_name || "Unnamed User"}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-600">
                      {user.email || "No email"}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">
                      {roleLabels[user.role]}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={15} />
                        {brandNames || "No brand"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Store size={15} />
                        {unitNames || "No branch"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
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
                    <td className="rounded-r-2xl px-4 py-4">
                      <button
                        type="button"
                        onClick={() => beginEdit(user)}
                        className="forza-button-hover inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
                      >
                        <Pencil size={16} />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
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

type FieldProps = {
  label: string;
  children: React.ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}