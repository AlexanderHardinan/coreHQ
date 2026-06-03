"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DashboardShell,
  type DashboardBrand,
} from "@/components/layout/dashboard-shell";
import { getAllowedModules, roleLabels, type UserRole } from "@/lib/auth/permissions";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type ProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
};

function normalizeBrandCode(value: string | null | undefined) {
  const brand = String(value || "FORZA").trim().toUpperCase();

  if (brand === "FUSION") {
    return "FUSION";
  }

  return "FORZA";
}

function getImageExtension(file: File) {
  const fallback = "png";
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!extension) {
    return fallback;
  }

  if (["jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension;
  }

  return fallback;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileClient />
    </Suspense>
  );
}

function ProfileClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const requestedBrandCode = normalizeBrandCode(searchParams.get("brand"));
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [brands, setBrands] = useState<DashboardBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<DashboardBrand | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const role = profile?.role || "manager";
  const modules = getAllowedModules(role);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/sign-in";
        return;
      }

      setUserEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role, is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        toast.error(profileError.message);
        setIsLoading(false);
        return;
      }

      if (!profileData || profileData.is_active === false) {
        window.location.href = "/sign-in";
        return;
      }

      const nextProfile = profileData as ProfileRecord;
      setProfile(nextProfile);
      setPreviewUrl(nextProfile.avatar_url || null);

      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("id, name, code, description, icon")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (brandsError) {
        toast.error(brandsError.message);
        setIsLoading(false);
        return;
      }

      const sortedBrands = ((brandsData || []) as DashboardBrand[]).sort(
        (a, b) => {
          const order = ["FORZA", "FUSION"];
          const aIndex = order.indexOf(a.code);
          const bIndex = order.indexOf(b.code);

          if (aIndex === -1 && bIndex === -1) {
            return a.name.localeCompare(b.name);
          }

          if (aIndex === -1) {
            return 1;
          }

          if (bIndex === -1) {
            return -1;
          }

          return aIndex - bIndex;
        },
      );

      setBrands(sortedBrands);

      const nextSelectedBrand =
        sortedBrands.find((brand) => brand.code === requestedBrandCode) ||
        sortedBrands.find((brand) => brand.code === "FORZA") ||
        sortedBrands[0] ||
        null;

      setSelectedBrand(nextSelectedBrand);
      setIsLoading(false);
    }

    loadProfile();
  }, [requestedBrandCode, supabase]);

  async function handleAvatarUpload(file: File | null) {
    if (!file) {
      return;
    }

    if (!profile?.id) {
      toast.error("Profile is not loaded.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }

    const maxSize = 3 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error("Avatar image must be 3 MB or smaller.");
      return;
    }

    setIsUploading(true);

    try {
      const extension = getImageExtension(file);
      const filePath = `${profile.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl,
        })
        .eq("id", profile.id);

      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              avatar_url: avatarUrl,
            }
          : current,
      );
      setPreviewUrl(avatarUrl);
      toast.success("Profile avatar updated successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload profile avatar.",
      );
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  if (isLoading || !profile) {
    return <ProfileLoading />;
  }

  return (
    <DashboardShell
      fullName={profile.full_name || userEmail || "Forza User"}
      avatarUrl={profile.avatar_url || null}
      role={role}
      modules={modules}
      brands={brands}
      selectedBrand={selectedBrand}
    >
      <section className="glass-panel relative overflow-hidden rounded-[2.25rem] p-6 md:p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 animate-pulse rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 animate-pulse rounded-full bg-emerald-200/50 blur-3xl" />

        <div className="relative z-10 grid gap-8 xl:grid-cols-[1fr_420px] xl:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
              <Sparkles size={16} />
              Personal Profile
            </div>

            <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">
              My Profile
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              Profile Avatar & Account Details
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Upload your own profile photo. Once saved, your avatar will appear
              across the system header and profile areas that use your account
              image.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="relative">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={profile.full_name || "Profile avatar"}
                    className="h-24 w-24 rounded-[2rem] object-cover shadow-xl"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-slate-950 text-white shadow-xl">
                    <UserCircle2 size={44} />
                  </div>
                )}

                <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg">
                  <Camera size={17} />
                </div>
              </div>

              <div>
                <p className="text-lg font-black text-slate-950">
                  {profile.full_name || "Forza User"}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {profile.email || userEmail}
                </p>
                <p className="mt-2 inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                  {roleLabels[profile.role]}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Upload Rules
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                Accepted image formats: JPG, PNG, WEBP. Maximum file size: 3 MB.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[430px_1fr]">
        <section className="glass-panel rounded-[2.25rem] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ImagePlus size={22} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-slate-400">
                Avatar Upload
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Update Profile Photo
              </h2>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={(event) =>
              handleAvatarUpload(event.target.files?.[0] || null)
            }
            className="hidden"
          />

          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="forza-button-hover flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? (
              <LoaderCircle className="animate-spin" size={18} />
            ) : (
              <Upload size={18} />
            )}
            {isUploading ? "Uploading Avatar..." : "Choose and Upload Avatar"}
          </button>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Current Avatar Status
            </p>

            <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
              {profile.avatar_url ? (
                <>
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  Avatar uploaded and active.
                </>
              ) : (
                <>
                  <UserCircle2 size={18} className="text-slate-400" />
                  No avatar uploaded yet.
                </>
              )}
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[2.25rem] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-slate-400">
                Account Information
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                User Details
              </h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard label="Full Name" value={profile.full_name || "-"} />
            <InfoCard label="Email" value={profile.email || userEmail || "-"} />
            <InfoCard label="Role" value={roleLabels[profile.role]} />
            <InfoCard
              label="Status"
              value={profile.is_active ? "Active" : "Inactive"}
            />
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Note
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
              Name, role, and account status are managed by Super Admin. Avatar
              upload is available for each user account.
            </p>
          </div>
        </section>
      </section>
    </DashboardShell>
  );
}

function ProfileLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="glass-panel relative w-full max-w-lg overflow-hidden rounded-[2rem] p-8 text-center">
        <div className="absolute -right-16 -top-16 h-40 w-40 animate-pulse rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 animate-pulse rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl">
          <UserCircle2 className="animate-pulse" size={24} />
        </div>
        <h1 className="relative z-10 mt-5 text-2xl font-black text-slate-950">
          Loading Profile
        </h1>
        <p className="relative z-10 mt-2 text-sm font-bold text-slate-500">
          Preparing your profile workspace...
        </p>
      </section>
    </main>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
};

function InfoCard({ label, value }: InfoCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}