"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FolderOpen, ChevronLeft, Loader2, Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  icon: string | null;
  sortOrder: number;
  _count: { posts: number };
}

interface EditState {
  name: string;
  description: string;
  slug: string;
  icon: string;
  sortOrder: number;
}

const defaultEdit: EditState = {
  name: "",
  description: "",
  slug: "",
  icon: "",
  sortOrder: 0,
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 50);
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [editState, setEditState] = useState<EditState>(defaultEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditState({
      name: cat.name,
      description: cat.description ?? "",
      slug: cat.slug,
      icon: cat.icon ?? "",
      sortOrder: cat.sortOrder,
    });
    setError("");
  }

  function startNew() {
    setEditingId("new");
    setEditState(defaultEdit);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setError("");
  }

  async function saveEdit() {
    setSaving(true);
    setError("");
    try {
      const isNew = editingId === "new";
      const url = isNew
        ? "/api/admin/categories"
        : `/api/admin/categories/${editingId}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editState.name,
          description: editState.description || undefined,
          slug: editState.slug,
          icon: editState.icon || undefined,
          sortOrder: editState.sortOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "保存失败");
      } else {
        if (isNew) {
          setCategories((prev) => [...prev, data]);
        } else {
          setCategories((prev) =>
            prev.map((c) => (c.id === editingId ? data : c))
          );
        }
        setEditingId(null);
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`确认删除版块「${name}」？`)) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "删除失败");
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      alert("网络错误，请重试");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-ink-400 hover:text-cinnabar-600 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <FolderOpen className="w-5 h-5 text-cinnabar-600" />
        <h1 className="text-2xl font-serif text-ink-800">版块管理</h1>
        <div className="ml-auto">
          <button
            onClick={startNew}
            disabled={editingId !== null}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            新建版块
          </button>
        </div>
      </div>

      {/* New category form */}
      {editingId === "new" && (
        <EditForm
          state={editState}
          onChange={setEditState}
          onSave={saveEdit}
          onCancel={cancelEdit}
          saving={saving}
          error={error}
          title="新建版块"
        />
      )}

      {/* Category list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-cinnabar-600" />
        </div>
      ) : categories.length === 0 ? (
        <div className="card p-12 text-center text-ink-400 font-sans text-sm">
          暂无版块，点击「新建版块」创建
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="card p-4">
              {editingId === cat.id ? (
                <EditForm
                  state={editState}
                  onChange={setEditState}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                  saving={saving}
                  error={error}
                  title={`编辑：${cat.name}`}
                />
              ) : (
                <div className="flex items-center gap-4">
                  <span className="text-2xl w-8 text-center">{cat.icon || "📁"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-ink-800">{cat.name}</span>
                      <span className="text-xs font-sans text-ink-400 bg-parchment-200 px-1.5 py-0.5 rounded">
                        /{cat.slug}
                      </span>
                      <span className="text-xs font-sans text-ink-400">
                        排序 {cat.sortOrder}
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-xs font-sans text-ink-400 mt-0.5 truncate">
                        {cat.description}
                      </p>
                    )}
                    <p className="text-xs font-sans text-ink-400 mt-0.5">
                      {cat._count.posts} 篇帖子
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(cat)}
                      disabled={editingId !== null}
                      className="p-1.5 rounded-sm text-ink-400 hover:text-cinnabar-600 hover:bg-cinnabar-50 transition-colors disabled:opacity-40"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id, cat.name)}
                      disabled={editingId !== null}
                      className="p-1.5 rounded-sm text-ink-400 hover:text-cinnabar-600 hover:bg-cinnabar-50 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface EditFormProps {
  state: EditState;
  onChange: (s: EditState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  title: string;
}

function EditForm({ state, onChange, onSave, onCancel, saving, error, title }: EditFormProps) {
  function set(field: keyof EditState, value: string | number) {
    onChange({ ...state, [field]: value });
  }

  return (
    <div className="space-y-3 bg-parchment-100 rounded-sm p-4 border border-parchment-300">
      <p className="text-sm font-serif text-ink-700">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-sans text-ink-500 mb-1">
            名称 <span className="text-cinnabar-600">*</span>
          </label>
          <input
            type="text"
            value={state.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (!state.slug) set("slug", slugify(e.target.value));
            }}
            className="forum-input"
            placeholder="版块名称"
          />
        </div>
        <div>
          <label className="block text-xs font-sans text-ink-500 mb-1">
            Slug <span className="text-cinnabar-600">*</span>
          </label>
          <input
            type="text"
            value={state.slug}
            onChange={(e) => set("slug", e.target.value)}
            className="forum-input"
            placeholder="url-slug"
          />
        </div>
        <div>
          <label className="block text-xs font-sans text-ink-500 mb-1">图标 Emoji</label>
          <input
            type="text"
            value={state.icon}
            onChange={(e) => set("icon", e.target.value)}
            className="forum-input"
            placeholder="📖"
            maxLength={4}
          />
        </div>
        <div>
          <label className="block text-xs font-sans text-ink-500 mb-1">排序权重</label>
          <input
            type="number"
            value={state.sortOrder}
            onChange={(e) => set("sortOrder", parseInt(e.target.value, 10) || 0)}
            className="forum-input"
            placeholder="0"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-sans text-ink-500 mb-1">描述</label>
          <input
            type="text"
            value={state.description}
            onChange={(e) => set("description", e.target.value)}
            className="forum-input"
            placeholder="版块简介（可选）"
            maxLength={200}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-cinnabar-600 bg-cinnabar-50 border border-cinnabar-200 rounded-sm px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={saving || !state.name || !state.slug}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-50 text-xs py-1.5"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          保存
        </button>
        <button
          onClick={onCancel}
          className="btn-secondary flex items-center gap-1.5 text-xs py-1.5"
        >
          <X className="w-3.5 h-3.5" />
          取消
        </button>
      </div>
    </div>
  );
}
