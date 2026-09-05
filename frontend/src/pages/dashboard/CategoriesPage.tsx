import React, { useState, useEffect } from 'react';
import { categoriesApi } from '../../services/api';
import {
  FolderTree,
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
  ChevronDown,
  ChevronUp,
  Tag,
  ShieldAlert,
  Building2,
} from 'lucide-react';

interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  order: number;
  isActive: boolean;
  reelsCount?: number;
  typesCount?: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  order: number;
  isActive: boolean;
  reelsCount?: number;
  subCategories: SubCategory[];
}

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catIcon, setCatIcon] = useState('weekend_outlined');
  const [catOrder, setCatOrder] = useState<number>(1);
  const [catIsActive, setCatIsActive] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // SubCategory Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [parentCategoryForSub, setParentCategoryForSub] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [subName, setSubName] = useState('');
  const [subSlug, setSubSlug] = useState('');
  const [subOrder, setSubOrder] = useState<number>(1);
  const [subIsActive, setSubIsActive] = useState(true);
  const [isSavingSub, setIsSavingSub] = useState(false);

  // Notice / Protection Modal State
  const [alertNotice, setAlertNotice] = useState<{
    title: string;
    message: string;
    isWarning?: boolean;
  } | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoriesApi.getAllAdmin();
      const list = Array.isArray(data) ? data : [];
      setCategories(list);
      // Auto expand all categories by default
      const expMap: Record<string, boolean> = {};
      list.forEach((c: Category) => {
        expMap[c.id] = true;
      });
      setExpandedCategories(expMap);
    } catch (e) {
      console.warn('Error fetching categories', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Helper to generate slug
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '_')
      .replace(/^-+|-+$/g, '');
  };

  // Category Modal Handlers
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatSlug('');
    setCatIcon('weekend_outlined');
    setCatOrder(categories.length + 1);
    setCatIsActive(true);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatIcon(cat.icon || 'weekend_outlined');
    setCatOrder(cat.order);
    setCatIsActive(cat.isActive);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catSlug.trim()) return;
    setIsSavingCategory(true);
    try {
      if (editingCategory) {
        await categoriesApi.updateCategory(editingCategory.id, {
          name: catName.trim(),
          slug: catSlug.trim(),
          icon: catIcon.trim(),
          order: Number(catOrder),
          isActive: catIsActive,
        });
      } else {
        await categoriesApi.createCategory({
          name: catName.trim(),
          slug: catSlug.trim(),
          icon: catIcon.trim(),
          order: Number(catOrder),
          isActive: catIsActive,
        });
      }
      setIsCategoryModalOpen(false);
      await fetchCategories();
    } catch (err: any) {
      setAlertNotice({
        title: 'Error Saving Category',
        message: err?.response?.data?.message || err?.message || 'Failed to save category.',
        isWarning: true,
      });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    const confirm = window.confirm(
      `Are you sure you want to delete or deactivate the category "${cat.name}"?`
    );
    if (!confirm) return;

    try {
      const res = await categoriesApi.deleteCategory(cat.id);
      if (res?.deactivated) {
        setAlertNotice({
          title: 'Protected Category Deactivated',
          message: res.message,
          isWarning: true,
        });
      }
      await fetchCategories();
    } catch (err: any) {
      setAlertNotice({
        title: 'Delete Failed',
        message: err?.response?.data?.message || err?.message || 'Could not delete category.',
        isWarning: true,
      });
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    try {
      await categoriesApi.updateCategory(cat.id, {
        isActive: !cat.isActive,
      });
      await fetchCategories();
    } catch (err: any) {
      setAlertNotice({
        title: 'Status Update Failed',
        message: err?.response?.data?.message || err?.message,
        isWarning: true,
      });
    }
  };

  // SubCategory Modal Handlers
  const handleOpenCreateSub = (parentCat: Category) => {
    setParentCategoryForSub(parentCat);
    setEditingSubCategory(null);
    setSubName('');
    setSubSlug('');
    setSubOrder((parentCat.subCategories?.length || 0) + 1);
    setSubIsActive(true);
    setIsSubModalOpen(true);
  };

  const handleOpenEditSub = (parentCat: Category, sub: SubCategory) => {
    setParentCategoryForSub(parentCat);
    setEditingSubCategory(sub);
    setSubName(sub.name);
    setSubSlug(sub.slug);
    setSubOrder(sub.order);
    setSubIsActive(sub.isActive);
    setIsSubModalOpen(true);
  };

  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentCategoryForSub || !subName.trim() || !subSlug.trim()) return;
    setIsSavingSub(true);
    try {
      if (editingSubCategory) {
        await categoriesApi.updateSubCategory(editingSubCategory.id, {
          name: subName.trim(),
          slug: subSlug.trim(),
          order: Number(subOrder),
          isActive: subIsActive,
        });
      } else {
        await categoriesApi.createSubCategory(parentCategoryForSub.id, {
          name: subName.trim(),
          slug: subSlug.trim(),
          order: Number(subOrder),
          isActive: subIsActive,
        });
      }
      setIsSubModalOpen(false);
      await fetchCategories();
    } catch (err: any) {
      setAlertNotice({
        title: 'Error Saving Subcategory',
        message: err?.response?.data?.message || err?.message || 'Failed to save subcategory.',
        isWarning: true,
      });
    } finally {
      setIsSavingSub(false);
    }
  };

  const handleDeleteSubCategory = async (sub: SubCategory) => {
    const confirm = window.confirm(
      `Are you sure you want to delete or deactivate the subcategory "${sub.name}"?`
    );
    if (!confirm) return;

    try {
      const res = await categoriesApi.deleteSubCategory(sub.id);
      if (res?.deactivated) {
        setAlertNotice({
          title: 'Protected Subcategory Deactivated',
          message: res.message,
          isWarning: true,
        });
      }
      await fetchCategories();
    } catch (err: any) {
      setAlertNotice({
        title: 'Delete Failed',
        message: err?.response?.data?.message || err?.message || 'Could not delete subcategory.',
        isWarning: true,
      });
    }
  };

  const handleToggleSubActive = async (sub: SubCategory) => {
    try {
      await categoriesApi.updateSubCategory(sub.id, {
        isActive: !sub.isActive,
      });
      await fetchCategories();
    } catch (err: any) {
      setAlertNotice({
        title: 'Status Update Failed',
        message: err?.response?.data?.message || err?.message,
        isWarning: true,
      });
    }
  };

  // Calculations & Filtering
  const totalCategories = categories.length;
  const totalSubCategories = categories.reduce(
    (acc, cat) => acc + (cat.subCategories?.length || 0),
    0
  );
  const activeCategories = categories.filter((c) => c.isActive).length;
  const totalReelsLinked = categories.reduce(
    (acc, cat) => acc + (cat.reelsCount || 0),
    0
  );

  const filteredCategories = categories.filter((cat) => {
    const matchesSearch =
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cat.subCategories || []).some(
        (sub) =>
          sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.slug.toLowerCase().includes(searchTerm.toLowerCase())
      );

    if (!matchesSearch) return false;

    if (filterStatus === 'ACTIVE') return cat.isActive;
    if (filterStatus === 'INACTIVE') return !cat.isActive;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-primary" />
            <span>Categories & Taxonomies</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {totalCategories} Main Categories
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage real estate categories, child subcategories, display orders, and video link safety policies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCategories}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-input bg-card text-card-foreground hover:bg-accent transition shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenCreateCategory}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Categories</span>
            <FolderTree className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{totalCategories}</div>
          <p className="text-xs text-muted-foreground mt-1">Top-level property types</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Subcategories</span>
            <Layers className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{totalSubCategories}</div>
          <p className="text-xs text-muted-foreground mt-1">Nested child elements</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active on Mobile</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {activeCategories} / {totalCategories}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Shown in Add Reel upload</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Linked Reels</span>
            <Film className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{totalReelsLinked}</div>
          <p className="text-xs text-muted-foreground mt-1">Protected from hard delete</p>
        </div>
      </div>

      {/* Safety Policy Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed text-foreground">
        <ShieldAlert className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        <div>
          <span className="font-bold text-primary">Deletion Safety Protection:</span> Any category or subcategory linked with uploaded reels cannot be deleted to preserve video history. Attempting to delete will safely deactivate the item (<code className="bg-primary/10 px-1 py-0.5 rounded text-primary font-mono font-semibold">isActive = false</code>), automatically removing it from future reel upload selections on the mobile app.
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search categories or subcategories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              filterStatus === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({totalCategories})
          </button>
          <button
            onClick={() => setFilterStatus('ACTIVE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              filterStatus === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Active ({activeCategories})
          </button>
          <button
            onClick={() => setFilterStatus('INACTIVE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              filterStatus === 'INACTIVE'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Deactivated ({totalCategories - activeCategories})
          </button>
        </div>
      </div>

      {/* Categories List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading category taxonomies...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-2xl bg-card/50 text-center px-4">
          <FolderTree className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-bold text-foreground">No Categories Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            {searchTerm ? `No category matching "${searchTerm}".` : 'No categories exist yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((cat) => {
            const isExpanded = !!expandedCategories[cat.id];
            const subCount = cat.subCategories?.length || 0;
            const reelsCount = cat.reelsCount || 0;

            return (
              <div
                key={cat.id}
                className={`rounded-2xl border transition-all ${
                  cat.isActive
                    ? 'border-border bg-card shadow-sm'
                    : 'border-rose-500/20 bg-rose-500/5'
                }`}
              >
                {/* Category Header Row */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleExpand(cat.id)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                      <Tag className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-base truncate">
                          {cat.name}
                        </span>
                        <code className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                          {cat.slug}
                        </code>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          Order: {cat.order}
                        </span>
                        {cat.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Deactivated
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{subCount} Subcategories</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Film className="h-3 w-3 text-amber-500" />
                          <strong className="text-foreground">{reelsCount}</strong> Linked Reels
                        </span>
                        {cat.icon && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[11px]">Icon: {cat.icon}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleToggleCategoryActive(cat)}
                      title={cat.isActive ? 'Deactivate from mobile app' : 'Activate for mobile app'}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                        cat.isActive
                          ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                          : 'border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                      }`}
                    >
                      {cat.isActive ? 'Active' : 'Disabled'}
                    </button>

                    <button
                      onClick={() => handleOpenCreateSub(cat)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-input bg-background hover:bg-accent text-foreground transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Sub</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-2 rounded-xl border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition"
                      title="Edit Category"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-2 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 transition"
                      title="Delete / Deactivate Category"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subcategories Accordion Content */}
                {isExpanded && (
                  <div className="border-t border-border/60 bg-muted/20 p-4 rounded-b-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        <span>Subcategories ({subCount})</span>
                      </h4>
                      <button
                        onClick={() => handleOpenCreateSub(cat)}
                        className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>New Subcategory</span>
                      </button>
                    </div>

                    {subCount === 0 ? (
                      <div className="text-center py-4 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                        No subcategories. Click "+ Add Sub" to create one.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {cat.subCategories.map((sub) => {
                          const subReels = sub.reelsCount || 0;
                          return (
                            <div
                              key={sub.id}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                                sub.isActive
                                  ? 'border-border bg-card'
                                  : 'border-rose-500/20 bg-rose-500/5 opacity-80'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-xs text-foreground truncate">
                                    {sub.name}
                                  </span>
                                  {!sub.isActive && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-500">
                                      OFF
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                                  <span>{sub.slug}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5 text-amber-500">
                                    <Film className="h-2.5 w-2.5" />
                                    {subReels} reels
                                  </span>
                                  {sub.typesCount !== undefined && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-0.5 text-primary">
                                        <Building2 className="h-2.5 w-2.5" />
                                        {sub.typesCount} types
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleToggleSubActive(sub)}
                                  className={`p-1 rounded-md text-[10px] font-bold transition ${
                                    sub.isActive
                                      ? 'text-emerald-500 hover:bg-emerald-500/10'
                                      : 'text-rose-500 hover:bg-rose-500/10'
                                  }`}
                                  title={sub.isActive ? 'Deactivate subcategory' : 'Activate subcategory'}
                                >
                                  {sub.isActive ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleOpenEditSub(cat, sub)}
                                  className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition"
                                  title="Edit Subcategory"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSubCategory(sub)}
                                  className="p-1 rounded-md hover:bg-destructive/10 text-destructive transition"
                                  title="Delete / Deactivate Subcategory"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-primary" />
                <span>{editingCategory ? 'Edit Category' : 'Create New Category'}</span>
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Living Room"
                  value={catName}
                  onChange={(e) => {
                    setCatName(e.target.value);
                    if (!editingCategory) {
                      setCatSlug(slugify(e.target.value));
                    }
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Unique Slug *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. living_room"
                  value={catSlug}
                  onChange={(e) => setCatSlug(slugify(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-background border border-input rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Icon Name
                  </label>
                  <input
                    type="text"
                    placeholder="weekend_outlined"
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-background border border-input rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={catOrder}
                    onChange={(e) => setCatOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="catActiveCheck"
                  checked={catIsActive}
                  onChange={(e) => setCatIsActive(e.target.checked)}
                  className="h-4 w-4 text-primary rounded border-input focus:ring-primary"
                />
                <label htmlFor="catActiveCheck" className="text-xs font-medium text-foreground cursor-pointer">
                  Active (Visible for reel uploads in mobile app)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-input hover:bg-accent text-foreground transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm shadow-primary/20 flex items-center gap-1.5"
                >
                  {isSavingCategory && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingCategory ? 'Save Changes' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SubCategory Create/Edit Modal */}
      {isSubModalOpen && parentCategoryForSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <span>{editingSubCategory ? 'Edit Subcategory' : 'Add Subcategory'}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Under: <strong className="text-foreground">{parentCategoryForSub.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubCategory} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Bedroom"
                  value={subName}
                  onChange={(e) => {
                    setSubName(e.target.value);
                    if (!editingSubCategory) {
                      setSubSlug(slugify(e.target.value));
                    }
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Unique Slug *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. master_bedroom"
                  value={subSlug}
                  onChange={(e) => setSubSlug(slugify(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-background border border-input rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={subOrder}
                  onChange={(e) => setSubOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="subActiveCheck"
                  checked={subIsActive}
                  onChange={(e) => setSubIsActive(e.target.checked)}
                  className="h-4 w-4 text-primary rounded border-input focus:ring-primary"
                />
                <label htmlFor="subActiveCheck" className="text-xs font-medium text-foreground cursor-pointer">
                  Active (Visible for reel uploads in mobile app)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-input hover:bg-accent text-foreground transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSub}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm shadow-primary/20 flex items-center gap-1.5"
                >
                  {isSavingSub && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingSubCategory ? 'Save Changes' : 'Create Subcategory'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Notice Modal */}
      {alertNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden p-6 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">{alertNotice.title}</h3>
                <p className="text-xs text-muted-foreground">Category Policy Notice</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {alertNotice.message}
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAlertNotice(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
