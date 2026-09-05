import React, { useState, useEffect } from 'react';
import { propertyTypesApi, categoriesApi } from '../../services/api';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Film,
  Layers,
  Home,
  Briefcase,
  Factory,
  Tractor,
  Trees,
  Warehouse,
  LandPlot,
  Filter,
  ShieldAlert,
} from 'lucide-react';

interface SubCategoryItem {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  order: number;
  isActive: boolean;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  subCategories: SubCategoryItem[];
}

interface PropertyType {
  id: string;
  subCategoryId?: string | null;
  subCategory?: {
    id: string;
    name: string;
    slug: string;
    categoryId?: string;
    category?: {
      id: string;
      name: string;
      slug: string;
    };
  } | null;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  order: number;
  isActive: boolean;
  reelsCount?: number;
  createdAt: string;
  updatedAt: string;
}

const AVAILABLE_ICONS = [
  { label: 'Home / Residential', value: 'home_outlined', icon: Home },
  { label: 'Commercial / Office', value: 'business_outlined', icon: Briefcase },
  { label: 'Plot / Land', value: 'terrain_outlined', icon: LandPlot },
  { label: 'Industrial / Shed', value: 'factory_outlined', icon: Factory },
  { label: 'Agricultural / Farm', value: 'agriculture_outlined', icon: Tractor },
  { label: 'Villa / Bungalow', value: 'villa_outlined', icon: Building2 },
  { label: 'Warehouse / Storage', value: 'warehouse_outlined', icon: Warehouse },
  { label: 'Garden / Open', value: 'deck_outlined', icon: Trees },
];

export const PropertyTypesPage: React.FC = () => {
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [filterSubCategory, setFilterSubCategory] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<PropertyType | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('home_outlined');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Delete & Alert State
  const [typeToDelete, setTypeToDelete] = useState<PropertyType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertNotice, setAlertNotice] = useState<{
    title: string;
    message: string;
    isWarning?: boolean;
  } | null>(null);

  const fetchPropertyTypesAndCategories = async () => {
    setLoading(true);
    try {
      const [typesData, catsData] = await Promise.all([
        propertyTypesApi.getAllAdmin(),
        categoriesApi.getAllAdmin(),
      ]);
      setPropertyTypes(Array.isArray(typesData) ? typesData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
    } catch (e) {
      console.warn('Error fetching property types or categories', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPropertyTypesAndCategories();
  }, []);

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '_')
      .replace(/^-+|-+$/g, '');
  };

  const handleOpenCreate = () => {
    setEditingType(null);
    setName('');
    setSlug('');
    setIcon('home_outlined');
    setDescription('');
    setOrder(propertyTypes.length + 1);
    setIsActive(true);

    if (categories.length > 0) {
      const firstCat = categories[0];
      setSelectedCategoryId(firstCat.id);
      if (firstCat.subCategories && firstCat.subCategories.length > 0) {
        setSelectedSubCategoryId(firstCat.subCategories[0].id);
      } else {
        setSelectedSubCategoryId('');
      }
    } else {
      setSelectedCategoryId('');
      setSelectedSubCategoryId('');
    }

    setIsModalOpen(true);
  };

  const handleOpenEdit = (pt: PropertyType) => {
    setEditingType(pt);
    setName(pt.name);
    setSlug(pt.slug);
    setIcon(pt.icon || 'home_outlined');
    setDescription(pt.description || '');
    setOrder(pt.order);
    setIsActive(pt.isActive);

    const subId = pt.subCategoryId || pt.subCategory?.id || '';
    setSelectedSubCategoryId(subId);

    let catId = '';
    if (pt.subCategory?.categoryId) {
      catId = pt.subCategory.categoryId;
    } else if (pt.subCategory?.category?.id) {
      catId = pt.subCategory.category.id;
    } else if (subId) {
      const foundCat = categories.find((c) =>
        c.subCategories?.some((s) => s.id === subId)
      );
      if (foundCat) catId = foundCat.id;
    }
    setSelectedCategoryId(catId || (categories[0]?.id ?? ''));

    setIsModalOpen(true);
  };

  const handleCategoryChange = (newCatId: string) => {
    setSelectedCategoryId(newCatId);
    const cat = categories.find((c) => c.id === newCatId);
    if (cat && cat.subCategories && cat.subCategories.length > 0) {
      setSelectedSubCategoryId(cat.subCategories[0].id);
    } else {
      setSelectedSubCategoryId('');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!editingType) {
      setSlug(slugify(val));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        subCategoryId: selectedSubCategoryId || null,
        name: name.trim(),
        slug: slug.trim(),
        icon,
        description: description.trim() || undefined,
        order: Number(order),
        isActive,
      };

      if (editingType) {
        await propertyTypesApi.update(editingType.id, payload);
      } else {
        await propertyTypesApi.create(payload);
      }
      setIsModalOpen(false);
      await fetchPropertyTypesAndCategories();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save property type.';
      setAlertNotice({
        title: 'Action Failed',
        message: Array.isArray(msg) ? msg.join(', ') : msg,
        isWarning: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (pt: PropertyType) => {
    try {
      await propertyTypesApi.update(pt.id, { isActive: !pt.isActive });
      setPropertyTypes((prev) =>
        prev.map((item) => (item.id === pt.id ? { ...item, isActive: !item.isActive } : item))
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update status.';
      setAlertNotice({
        title: 'Update Failed',
        message: Array.isArray(msg) ? msg.join(', ') : msg,
        isWarning: true,
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!typeToDelete) return;
    setIsDeleting(true);
    try {
      const res: any = await propertyTypesApi.delete(typeToDelete.id);
      setTypeToDelete(null);
      await fetchPropertyTypesAndCategories();

      if (res?.deactivated) {
        setAlertNotice({
          title: 'Protected & Deactivated',
          message: res.message || 'Property type is linked with videos. It was safely deactivated so existing reels remain intact.',
          isWarning: true,
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete property type.';
      setAlertNotice({
        title: 'Delete Failed',
        message: Array.isArray(msg) ? msg.join(', ') : msg,
        isWarning: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Stats
  const totalTypes = propertyTypes.length;
  const activeCount = propertyTypes.filter((p) => p.isActive).length;
  const inactiveCount = totalTypes - activeCount;
  const totalLinkedReels = propertyTypes.reduce((acc, curr) => acc + (curr.reelsCount || 0), 0);

  // Subcategories for current selected modal category
  const activeModalCategory = categories.find((c) => c.id === selectedCategoryId);
  const modalSubCategories = activeModalCategory?.subCategories || [];

  // Filtering
  const filteredTypes = propertyTypes.filter((pt) => {
    const subName = pt.subCategory?.name || '';
    const catName = pt.subCategory?.category?.name || '';

    const matchesSearch =
      !searchTerm ||
      pt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pt.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pt.description && pt.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      subName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      catName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && pt.isActive) ||
      (filterStatus === 'INACTIVE' && !pt.isActive);

    const matchesSubCategory =
      filterSubCategory === 'ALL' ||
      pt.subCategoryId === filterSubCategory ||
      pt.subCategory?.id === filterSubCategory;

    return matchesSearch && matchesStatus && matchesSubCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span>Property & Reel Types</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {activeCount} Active
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage subcategory-dependent property types shown in reel upload forms and discovery filters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPropertyTypesAndCategories}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Property Type</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Types</span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{totalTypes}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Categorized subcategory types</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Active in App</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-500">{activeCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Shown in upload dropdown</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Inactive</span>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold text-muted-foreground">{inactiveCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Hidden from app forms</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Reels</span>
            <Film className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-500">{totalLinkedReels}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Tagged with these types</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search property types, slug, subcategory, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
          />
        </div>

        {/* Subcategory & Status Filter */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs text-muted-foreground shrink-0">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline font-medium">Subcategory:</span>
            <select
              value={filterSubCategory}
              onChange={(e) => setFilterSubCategory(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="ALL">All Subcategories</option>
              {categories.map((cat) => (
                <optgroup key={cat.id} label={cat.name}>
                  {(cat.subCategories || []).map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  filterStatus === status
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {status === 'ALL' ? 'All' : status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Property Types Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-16">Order</th>
                <th className="py-3.5 px-4">Property Type</th>
                <th className="py-3.5 px-4">Subcategory & Category</th>
                <th className="py-3.5 px-4">Slug (Identifier)</th>
                <th className="py-3.5 px-4 text-center">Linked Videos</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading property types...</span>
                  </td>
                </tr>
              ) : filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="font-semibold text-sm">No Property Types Found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {searchTerm || filterSubCategory !== 'ALL'
                        ? 'Try adjusting your search query or filter.'
                        : 'Click "Add Property Type" to create one.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTypes.map((pt) => {
                  const iconObj = AVAILABLE_ICONS.find((i) => i.value === pt.icon);
                  const IconComponent = iconObj ? iconObj.icon : Building2;

                  const subCategoryName = pt.subCategory?.name;
                  const categoryName = pt.subCategory?.category?.name;

                  return (
                    <tr key={pt.id} className="hover:bg-muted/30 transition group">
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        <span className="px-2 py-0.5 rounded bg-muted text-[11px] font-medium">
                          #{pt.order}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold shrink-0 ${
                              pt.isActive
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              <span>{pt.name}</span>
                            </div>
                            {pt.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {pt.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subcategory & Category Badge */}
                      <td className="py-3.5 px-4">
                        {subCategoryName ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 w-fit">
                              <Layers className="h-3 w-3" />
                              <span>{subCategoryName}</span>
                            </span>
                            {categoryName && (
                              <span className="text-[10px] text-muted-foreground pl-1">
                                in {categoryName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-muted text-muted-foreground border border-border/50">
                            General / Universal
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        <span className="px-2 py-1 rounded-md bg-muted/60 text-xs border border-border/50">
                          {pt.slug}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <Film className="h-3 w-3" />
                          <span>{pt.reelsCount || 0} reels</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(pt)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                            pt.isActive
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                          title="Click to toggle Active / Inactive status"
                        >
                          {pt.isActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(pt)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                            title="Edit Type"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setTypeToDelete(pt)}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete or Deactivate"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span>{editingType ? 'Edit Property Type' : 'Create Property Type'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              {/* Category Selection */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  1. Parent Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory Selection */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  2. Subcategory (Parent for this Type) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSubCategoryId}
                  onChange={(e) => setSelectedSubCategoryId(e.target.value)}
                  disabled={!selectedCategoryId || modalSubCategories.length === 0}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground disabled:opacity-50"
                >
                  {modalSubCategories.length === 0 ? (
                    <option value="">No subcategories in selected category</option>
                  ) : (
                    <>
                      <option value="">Select Subcategory</option>
                      {modalSubCategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  When a creator selects this subcategory in video upload, this type will be available.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Type Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1 BHK, 2 BHK, Bare Shell, Corner Plot"
                  value={name}
                  onChange={handleNameChange}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Slug (Identifier) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1_bhk, bare_shell, corner_plot"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Icon Style</label>
                <select
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                >
                  {AVAILABLE_ICONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.value})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Short description for admin reference..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Active in Mobile App
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Inactive</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-foreground transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingType ? 'Save Changes' : 'Create Type'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {typeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Delete "{typeToDelete.name}"?
              </h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {typeToDelete.reelsCount && typeToDelete.reelsCount > 0 ? (
                <span>
                  This property type is currently tagged in{' '}
                  <strong className="text-foreground">{typeToDelete.reelsCount} reel(s)</strong>.
                  To protect historical video data, deleting it will{' '}
                  <strong className="text-foreground">safely deactivate</strong> it instead of permanently erasing it. It will be hidden from new video upload forms.
                </span>
              ) : (
                <span>
                  This property type has 0 linked reels. It will be permanently removed from the system.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setTypeToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-foreground transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {typeToDelete.reelsCount && typeToDelete.reelsCount > 0
                    ? 'Deactivate Safely'
                    : 'Delete Permanently'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert / Notice Modal */}
      {alertNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl animate-in zoom-in-95 duration-200 text-center">
            <div
              className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${
                alertNotice.isWarning
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-primary/10 text-primary border border-primary/20'
              }`}
            >
              {alertNotice.isWarning ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <h4 className="text-sm font-bold text-foreground mb-1">{alertNotice.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              {alertNotice.message}
            </p>
            <button
              onClick={() => setAlertNotice(null)}
              className="w-full py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyTypesPage;
