"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Layers3,
  MapPin,
  Pencil,
  Plus,
  Save,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export type BrandRecord = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
};

export type BrandGroupRecord = {
  id: string;
  brand_id: string;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
};

export type BrandCategoryRecord = {
  id: string;
  brand_id: string;
  brand_group_id: string | null;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
};

export type BrandUnitRecord = {
  id: string;
  brand_id: string | null;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  country: string | null;
  is_active: boolean;
};

type BrandManagementPanelProps = {
  brands: BrandRecord[];
  groups: BrandGroupRecord[];
  categories: BrandCategoryRecord[];
  units: BrandUnitRecord[];
  selectedBrandCode: string;
};

type EditMode = "create" | "edit";

function toCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function BrandManagementPanel({
  brands,
  groups,
  categories,
  units,
  selectedBrandCode,
}: BrandManagementPanelProps) {
  const supabase = createSupabaseBrowserClient();

  const initialBrand =
    brands.find((brand) => brand.code === selectedBrandCode) ||
    brands[0] ||
    null;

  const [activeBrandId, setActiveBrandId] = useState(initialBrand?.id || "");
  const [brandList, setBrandList] = useState(brands);
  const [groupList, setGroupList] = useState(groups);
  const [categoryList, setCategoryList] = useState(categories);
  const [unitList, setUnitList] = useState(units);

  const [brandMode, setBrandMode] = useState<EditMode>("create");
  const [brandEditId, setBrandEditId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandCode, setBrandCode] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [brandIcon, setBrandIcon] = useState("Building2");

  const [groupMode, setGroupMode] = useState<EditMode>("create");
  const [groupEditId, setGroupEditId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupIcon, setGroupIcon] = useState("Layers3");
  const [groupSortOrder, setGroupSortOrder] = useState("0");

  const [categoryMode, setCategoryMode] = useState<EditMode>("create");
  const [categoryEditId, setCategoryEditId] = useState("");
  const [categoryGroupId, setCategoryGroupId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("Tags");
  const [categorySortOrder, setCategorySortOrder] = useState("0");

  const [unitMode, setUnitMode] = useState<EditMode>("create");
  const [unitEditId, setUnitEditId] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitCode, setUnitCode] = useState("");
  const [unitAddress, setUnitAddress] = useState("");
  const [unitCity, setUnitCity] = useState("");
  const [unitCountry, setUnitCountry] = useState("");

  const activeBrand = useMemo(
    () => brandList.find((brand) => brand.id === activeBrandId) || null,
    [activeBrandId, brandList],
  );

  const activeGroups = useMemo(
    () => groupList.filter((group) => group.brand_id === activeBrandId),
    [activeBrandId, groupList],
  );

  const activeCategories = useMemo(
    () =>
      categoryList.filter((category) => category.brand_id === activeBrandId),
    [activeBrandId, categoryList],
  );

  const activeUnits = useMemo(
    () => unitList.filter((unit) => unit.brand_id === activeBrandId),
    [activeBrandId, unitList],
  );

  function resetBrandForm() {
    setBrandMode("create");
    setBrandEditId("");
    setBrandName("");
    setBrandCode("");
    setBrandDescription("");
    setBrandIcon("Building2");
  }

  function resetGroupForm() {
    setGroupMode("create");
    setGroupEditId("");
    setGroupName("");
    setGroupCode("");
    setGroupDescription("");
    setGroupIcon("Layers3");
    setGroupSortOrder("0");
  }

  function resetCategoryForm() {
    setCategoryMode("create");
    setCategoryEditId("");
    setCategoryGroupId("");
    setCategoryName("");
    setCategoryCode("");
    setCategoryDescription("");
    setCategoryIcon("Tags");
    setCategorySortOrder("0");
  }

  function resetUnitForm() {
    setUnitMode("create");
    setUnitEditId("");
    setUnitName("");
    setUnitCode("");
    setUnitAddress("");
    setUnitCity("");
    setUnitCountry("");
  }

  function editBrand(brand: BrandRecord) {
    setBrandMode("edit");
    setBrandEditId(brand.id);
    setBrandName(brand.name);
    setBrandCode(brand.code);
    setBrandDescription(brand.description || "");
    setBrandIcon(brand.icon || "Building2");
  }

  function editGroup(group: BrandGroupRecord) {
    setGroupMode("edit");
    setGroupEditId(group.id);
    setGroupName(group.name);
    setGroupCode(group.code);
    setGroupDescription(group.description || "");
    setGroupIcon(group.icon || "Layers3");
    setGroupSortOrder(String(group.sort_order || 0));
  }

  function editCategory(category: BrandCategoryRecord) {
    setCategoryMode("edit");
    setCategoryEditId(category.id);
    setCategoryGroupId(category.brand_group_id || "");
    setCategoryName(category.name);
    setCategoryCode(category.code);
    setCategoryDescription(category.description || "");
    setCategoryIcon(category.icon || "Tags");
    setCategorySortOrder(String(category.sort_order || 0));
  }

  function editUnit(unit: BrandUnitRecord) {
    setUnitMode("edit");
    setUnitEditId(unit.id);
    setUnitName(unit.name);
    setUnitCode(unit.code);
    setUnitAddress(unit.address || "");
    setUnitCity(unit.city || "");
    setUnitCountry(unit.country || "");
  }

  async function saveBrand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      name: brandName.trim(),
      code: toCode(brandCode || brandName),
      description: brandDescription.trim() || null,
      icon: brandIcon.trim() || "Building2",
      is_active: true,
    };

    if (!payload.name || !payload.code) {
      toast.error("Brand name and code are required.");
      return;
    }

    if (brandMode === "edit") {
      const { error } = await supabase
        .from("brands")
        .update(payload)
        .eq("id", brandEditId);

      if (error) {
        toast.error(error.message);
        return;
      }

      setBrandList((current) =>
        current.map((brand) =>
          brand.id === brandEditId ? { ...brand, ...payload } : brand,
        ),
      );

      toast.success("Brand updated successfully.");
      resetBrandForm();
      return;
    }

    const { data, error } = await supabase
      .from("brands")
      .insert(payload)
      .select("id, name, code, description, icon, is_active")
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setBrandList((current) => [...current, data as BrandRecord]);
    setActiveBrandId(data.id);
    toast.success("Brand created successfully.");
    resetBrandForm();
  }

  async function saveGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeBrandId) {
      toast.error("Select a brand first.");
      return;
    }

    const payload = {
      brand_id: activeBrandId,
      name: groupName.trim(),
      code: toCode(groupCode || groupName),
      description: groupDescription.trim() || null,
      icon: groupIcon.trim() || "Layers3",
      sort_order: Number(groupSortOrder || 0),
      is_active: true,
    };

    if (!payload.name || !payload.code) {
      toast.error("Group name and code are required.");
      return;
    }

    if (groupMode === "edit") {
      const { error } = await supabase
        .from("brand_groups")
        .update(payload)
        .eq("id", groupEditId);

      if (error) {
        toast.error(error.message);
        return;
      }

      setGroupList((current) =>
        current.map((group) =>
          group.id === groupEditId ? { ...group, ...payload } : group,
        ),
      );

      toast.success("Brand group updated successfully.");
      resetGroupForm();
      return;
    }

    const { data, error } = await supabase
      .from("brand_groups")
      .insert(payload)
      .select(
        "id, brand_id, name, code, description, icon, sort_order, is_active",
      )
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setGroupList((current) => [...current, data as BrandGroupRecord]);
    toast.success("Brand group created successfully.");
    resetGroupForm();
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeBrandId) {
      toast.error("Select a brand first.");
      return;
    }

    const payload = {
      brand_id: activeBrandId,
      brand_group_id: categoryGroupId || null,
      name: categoryName.trim(),
      code: toCode(categoryCode || categoryName),
      description: categoryDescription.trim() || null,
      icon: categoryIcon.trim() || "Tags",
      sort_order: Number(categorySortOrder || 0),
      is_active: true,
    };

    if (!payload.name || !payload.code) {
      toast.error("Category name and code are required.");
      return;
    }

    if (categoryMode === "edit") {
      const { error } = await supabase
        .from("brand_categories")
        .update(payload)
        .eq("id", categoryEditId);

      if (error) {
        toast.error(error.message);
        return;
      }

      setCategoryList((current) =>
        current.map((category) =>
          category.id === categoryEditId
            ? { ...category, ...payload }
            : category,
        ),
      );

      toast.success("Brand category updated successfully.");
      resetCategoryForm();
      return;
    }

    const { data, error } = await supabase
      .from("brand_categories")
      .insert(payload)
      .select(
        "id, brand_id, brand_group_id, name, code, description, icon, sort_order, is_active",
      )
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setCategoryList((current) => [...current, data as BrandCategoryRecord]);
    toast.success("Brand category created successfully.");
    resetCategoryForm();
  }

  async function saveUnit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeBrandId) {
      toast.error("Select a brand first.");
      return;
    }

    const payload = {
      brand_id: activeBrandId,
      name: unitName.trim(),
      code: toCode(unitCode || unitName),
      address: unitAddress.trim() || null,
      city: unitCity.trim() || null,
      country: unitCountry.trim() || null,
      is_active: true,
    };

    if (!payload.name || !payload.code) {
      toast.error("Branch unit name and code are required.");
      return;
    }

    if (unitMode === "edit") {
      const { error } = await supabase
        .from("brand_units")
        .update(payload)
        .eq("id", unitEditId);

      if (error) {
        toast.error(error.message);
        return;
      }

      setUnitList((current) =>
        current.map((unit) =>
          unit.id === unitEditId ? { ...unit, ...payload } : unit,
        ),
      );

      toast.success("Branch unit updated successfully.");
      resetUnitForm();
      return;
    }

    const { data, error } = await supabase
      .from("brand_units")
      .insert(payload)
      .select("id, brand_id, name, code, address, city, country, is_active")
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setUnitList((current) => [...current, data as BrandUnitRecord]);
    toast.success("Branch unit created successfully.");
    resetUnitForm();
  }

  async function deleteRecord(
    table:
      | "brands"
      | "brand_groups"
      | "brand_categories"
      | "brand_units",
    id: string,
  ) {
    const confirmed = window.confirm(
      "Delete this record? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (table === "brands") {
      setBrandList((current) => current.filter((item) => item.id !== id));
      setActiveBrandId((current) => {
        if (current !== id) {
          return current;
        }

        return brandList.find((brand) => brand.id !== id)?.id || "";
      });
    }

    if (table === "brand_groups") {
      setGroupList((current) => current.filter((item) => item.id !== id));
    }

    if (table === "brand_categories") {
      setCategoryList((current) => current.filter((item) => item.id !== id));
    }

    if (table === "brand_units") {
      setUnitList((current) => current.filter((item) => item.id !== id));
    }

    toast.success("Record deleted successfully.");
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-slate-400">
              Super Admin Module
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Brand Management
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Manage private brand structure, groups, categories, and branch
              units. This module is available only to Super Admin users.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Selected Brand
            </label>
            <select
              value={activeBrandId}
              onChange={(event) => setActiveBrandId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-950 outline-none focus:border-slate-950 lg:min-w-[220px]"
            >
              {brandList.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <CrudCard
          title="Brands"
          subtitle="Create, edit, and delete brands."
          icon={<Building2 size={22} />}
        >
          <form onSubmit={saveBrand} className="space-y-3">
            <TextField
              label="Brand Name"
              value={brandName}
              onChange={setBrandName}
              placeholder="Example: Forza"
            />
            <TextField
              label="Brand Code"
              value={brandCode}
              onChange={setBrandCode}
              placeholder="Example: FORZA"
            />
            <TextField
              label="Description"
              value={brandDescription}
              onChange={setBrandDescription}
              placeholder="Short brand description"
            />
            <TextField
              label="Icon"
              value={brandIcon}
              onChange={setBrandIcon}
              placeholder="Example: Building2"
            />
            <FormActions
              mode={brandMode}
              onCancel={resetBrandForm}
              createLabel="Create Brand"
              updateLabel="Update Brand"
            />
          </form>

          <RecordList>
            {brandList.map((brand) => (
              <RecordRow
                key={brand.id}
                title={brand.name}
                subtitle={brand.code}
                badge={brand.is_active ? "Active" : "Inactive"}
                onEdit={() => editBrand(brand)}
                onDelete={() => deleteRecord("brands", brand.id)}
              />
            ))}
          </RecordList>
        </CrudCard>

        <CrudCard
          title="Brand Groups"
          subtitle="Organize each brand into functional groups."
          icon={<Layers3 size={22} />}
        >
          <form onSubmit={saveGroup} className="space-y-3">
            <TextField
              label="Group Name"
              value={groupName}
              onChange={setGroupName}
              placeholder="Example: Operations"
            />
            <TextField
              label="Group Code"
              value={groupCode}
              onChange={setGroupCode}
              placeholder="Example: OPERATIONS"
            />
            <TextField
              label="Description"
              value={groupDescription}
              onChange={setGroupDescription}
              placeholder="Short group description"
            />
            <TextField
              label="Icon"
              value={groupIcon}
              onChange={setGroupIcon}
              placeholder="Example: Layers3"
            />
            <TextField
              label="Sort Order"
              value={groupSortOrder}
              onChange={setGroupSortOrder}
              placeholder="0"
              type="number"
            />
            <FormActions
              mode={groupMode}
              onCancel={resetGroupForm}
              createLabel="Create Group"
              updateLabel="Update Group"
            />
          </form>

          <RecordList>
            {activeGroups.map((group) => (
              <RecordRow
                key={group.id}
                title={group.name}
                subtitle={group.code}
                badge={`Order ${group.sort_order}`}
                onEdit={() => editGroup(group)}
                onDelete={() => deleteRecord("brand_groups", group.id)}
              />
            ))}
          </RecordList>
        </CrudCard>

        <CrudCard
          title="Brand Categories"
          subtitle="Create operational categories under each brand."
          icon={<Tags size={22} />}
        >
          <form onSubmit={saveCategory} className="space-y-3">
            <div>
              <label className="text-sm font-bold text-slate-700">Group</label>
              <select
                value={categoryGroupId}
                onChange={(event) => setCategoryGroupId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:border-slate-950"
              >
                <option value="">No group</option>
                {activeGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <TextField
              label="Category Name"
              value={categoryName}
              onChange={setCategoryName}
              placeholder="Example: Kitchen Ops"
            />
            <TextField
              label="Category Code"
              value={categoryCode}
              onChange={setCategoryCode}
              placeholder="Example: KITCHEN_OPS"
            />
            <TextField
              label="Description"
              value={categoryDescription}
              onChange={setCategoryDescription}
              placeholder="Short category description"
            />
            <TextField
              label="Icon"
              value={categoryIcon}
              onChange={setCategoryIcon}
              placeholder="Example: ChefHat"
            />
            <TextField
              label="Sort Order"
              value={categorySortOrder}
              onChange={setCategorySortOrder}
              placeholder="0"
              type="number"
            />
            <FormActions
              mode={categoryMode}
              onCancel={resetCategoryForm}
              createLabel="Create Category"
              updateLabel="Update Category"
            />
          </form>

          <RecordList>
            {activeCategories.map((category) => (
              <RecordRow
                key={category.id}
                title={category.name}
                subtitle={category.code}
                badge={`Order ${category.sort_order}`}
                onEdit={() => editCategory(category)}
                onDelete={() =>
                  deleteRecord("brand_categories", category.id)
                }
              />
            ))}
          </RecordList>
        </CrudCard>

        <CrudCard
          title="Branch Units"
          subtitle="Create and manage physical branch units."
          icon={<MapPin size={22} />}
        >
          <form onSubmit={saveUnit} className="space-y-3">
            <TextField
              label="Branch Name"
              value={unitName}
              onChange={setUnitName}
              placeholder="Example: Skopje Main Branch"
            />
            <TextField
              label="Branch Code"
              value={unitCode}
              onChange={setUnitCode}
              placeholder="Example: SKOPJE_MAIN"
            />
            <TextField
              label="Address"
              value={unitAddress}
              onChange={setUnitAddress}
              placeholder="Branch address"
            />
            <TextField
              label="City"
              value={unitCity}
              onChange={setUnitCity}
              placeholder="Example: Skopje"
            />
            <TextField
              label="Country"
              value={unitCountry}
              onChange={setUnitCountry}
              placeholder="Example: North Macedonia"
            />
            <FormActions
              mode={unitMode}
              onCancel={resetUnitForm}
              createLabel="Create Branch"
              updateLabel="Update Branch"
            />
          </form>

          <RecordList>
            {activeUnits.map((unit) => (
              <RecordRow
                key={unit.id}
                title={unit.name}
                subtitle={unit.code}
                badge={unit.city || "Branch"}
                onEdit={() => editUnit(unit)}
                onDelete={() => deleteRecord("brand_units", unit.id)}
              />
            ))}
          </RecordList>
        </CrudCard>
      </section>

      {!activeBrand ? (
        <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-sm font-black text-amber-800">
            No selected brand found. Create a brand to begin.
          </p>
        </section>
      ) : null}
    </div>
  );
}

type CrudCardProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

function CrudCard({ title, subtitle, icon, children }: CrudCardProps) {
  return (
    <section className="glass-panel rounded-[2rem] p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="text-sm font-semibold text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">{children}</div>
    </section>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "number";
};

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: TextFieldProps) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:border-slate-950"
        placeholder={placeholder}
      />
    </div>
  );
}

type FormActionsProps = {
  mode: EditMode;
  onCancel: () => void;
  createLabel: string;
  updateLabel: string;
};

function FormActions({
  mode,
  onCancel,
  createLabel,
  updateLabel,
}: FormActionsProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="submit"
        className="forza-button-hover flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl"
      >
        {mode === "edit" ? <Save size={17} /> : <Plus size={17} />}
        {mode === "edit" ? updateLabel : createLabel}
      </button>

      {mode === "edit" ? (
        <button
          type="button"
          onClick={onCancel}
          className="forza-button-hover flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
        >
          <X size={17} />
          Cancel
        </button>
      ) : null}
    </div>
  );
}

type RecordListProps = {
  children: React.ReactNode;
};

function RecordList({ children }: RecordListProps) {
  return <div className="space-y-3">{children}</div>;
}

type RecordRowProps = {
  title: string;
  subtitle: string;
  badge: string;
  onEdit: () => void;
  onDelete: () => void;
};

function RecordRow({
  title,
  subtitle,
  badge,
  onEdit,
  onDelete,
}: RecordRowProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
            {subtitle}
          </p>
          <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
            {badge}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="forza-button-hover flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="forza-button-hover flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}