"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Camera,
  ChefHat,
  Clock,
  Globe2,
  Plus,
  Save,
  ShoppingCart,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Ingredient = {
  id?: number;
  name: string;
  quantity: string | null;
  unit: string | null;
  category: string;
  note: string | null;
  sortOrder?: number;
};

type Recipe = {
  id: number;
  householdId: number;
  title: string;
  description: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  photoUrl: string | null;
  instructions: string | null;
  visibility: "private" | "public";
  updatedAt: string;
  household: { id: number; name: string };
  createdBy: { id: number; email: string; displayName: string | null } | null;
  ingredients: Ingredient[];
};

type PotluckEvent = {
  id: number;
  title: string;
  date: string;
  group: { id: number; name: string };
};

type Tab = "mine" | "public";

const CATEGORIES = ["produce", "dairy", "meat", "pantry", "frozen", "snacks", "drinks", "household", "other"];

const BLANK_INGREDIENT: Ingredient = { name: "", quantity: "", unit: "", category: "pantry", note: "" };
const BLANK_RECIPE = {
  id: null as number | null,
  title: "",
  description: "",
  servings: "4",
  prepMinutes: "",
  cookMinutes: "",
  photoUrl: "",
  instructions: "",
  visibility: "private" as "private" | "public",
  ingredients: [{ ...BLANK_INGREDIENT }],
};

function timeLabel(recipe: Recipe) {
  const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  return total > 0 ? `${total} min` : "No time set";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function ingredientAmount(ingredient: Ingredient) {
  return [ingredient.quantity, ingredient.unit].filter(Boolean).join(" ");
}

function recipeImageSrc(value: string | null | undefined, householdId?: number) {
  const clean = typeof value === "string" ? value.trim() : "";
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean) || clean.startsWith("/")) return clean;
  if (clean.startsWith("uploads/")) return `/${clean}`;
  if (householdId && !clean.includes("/") && /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i.test(clean)) {
    return `/uploads/recipes/${householdId}/${clean}`;
  }
  return clean;
}

export default function ParentRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [publicRecipes, setPublicRecipes] = useState<Recipe[]>([]);
  const [potluckEvents, setPotluckEvents] = useState<PotluckEvent[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("mine");
  const [form, setForm] = useState(BLANK_RECIPE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPotluckId, setSelectedPotluckId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [recipePrompt, setRecipePrompt] = useState("");
  const [draftingRecipe, setDraftingRecipe] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/recipes");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setLoadError(data?.error ?? "Could not load recipes");
        return;
      }
      const nextRecipes = Array.isArray(data?.recipes) ? data.recipes : [];
      setRecipes(nextRecipes);
      setPublicRecipes(Array.isArray(data?.publicRecipes) ? data.publicRecipes : []);
      setPotluckEvents(Array.isArray(data?.potluckEvents) ? data.potluckEvents : []);
      setSelectedId((current) => current && nextRecipes.some((recipe: Recipe) => recipe.id === current) ? current : nextRecipes[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeRecipes = tab === "mine" ? recipes : publicRecipes;
  const selectedRecipe = useMemo(
    () => activeRecipes.find((recipe) => recipe.id === selectedId) ?? activeRecipes[0] ?? null,
    [activeRecipes, selectedId]
  );

  useEffect(() => {
    if (!selectedRecipe || form.id === selectedRecipe.id || tab !== "mine") return;
    editRecipe(selectedRecipe);
  }, [selectedRecipe, tab]);

  function updateForm(key: keyof typeof BLANK_RECIPE, value: string | Ingredient[]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function updateIngredient(index: number, key: keyof Ingredient, value: string) {
    setForm((previous) => ({
      ...previous,
      ingredients: previous.ingredients.map((ingredient, itemIndex) =>
        itemIndex === index ? { ...ingredient, [key]: value } : ingredient
      ),
    }));
  }

  function addIngredient() {
    setForm((previous) => ({ ...previous, ingredients: [...previous.ingredients, { ...BLANK_INGREDIENT }] }));
  }

  function removeIngredient(index: number) {
    setForm((previous) => ({
      ...previous,
      ingredients: previous.ingredients.length === 1
        ? [{ ...BLANK_INGREDIENT }]
        : previous.ingredients.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function editRecipe(recipe: Recipe) {
    setForm({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description ?? "",
      servings: String(recipe.servings ?? 4),
      prepMinutes: recipe.prepMinutes ? String(recipe.prepMinutes) : "",
      cookMinutes: recipe.cookMinutes ? String(recipe.cookMinutes) : "",
      photoUrl: recipe.photoUrl ?? "",
      instructions: recipe.instructions ?? "",
      visibility: recipe.visibility,
      ingredients: recipe.ingredients.length > 0
        ? recipe.ingredients.map((ingredient) => ({
            ...ingredient,
            quantity: ingredient.quantity ?? "",
            unit: ingredient.unit ?? "",
            note: ingredient.note ?? "",
          }))
        : [{ ...BLANK_INGREDIENT }],
    });
    setSelectedId(recipe.id);
  }

  function newRecipe() {
    setForm({ ...BLANK_RECIPE, ingredients: [{ ...BLANK_INGREDIENT }] });
    setSelectedId(null);
    setTab("mine");
  }

  async function saveRecipe() {
    if (!form.title.trim()) {
      toast.error("Recipe title is required");
      return;
    }
    setSaving(true);
    try {
      const ingredients = form.ingredients
        .map((ingredient) => ({
          name: ingredient.name.trim(),
          quantity: ingredient.quantity?.trim() ?? "",
          unit: ingredient.unit?.trim() ?? "",
          category: ingredient.category || "pantry",
          note: ingredient.note?.trim() ?? "",
        }))
        .filter((ingredient) => ingredient.name);
      const res = await fetch("/api/recipes", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          title: form.title,
          description: form.description,
          servings: form.servings,
          prepMinutes: form.prepMinutes,
          cookMinutes: form.cookMinutes,
          photoUrl: recipeImageSrc(form.photoUrl, selectedRecipe?.householdId),
          instructions: form.instructions,
          visibility: form.visibility,
          ingredients,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save recipe");
        return;
      }
      toast.success(form.id ? "Recipe updated" : "Recipe created");
      await load();
      setSelectedId(data.id);
      editRecipe(data);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecipe(recipe: Recipe) {
    if (!confirm(`Delete ${recipe.title}?`)) return;
    const res = await fetch(`/api/recipes?id=${recipe.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete recipe");
      return;
    }
    toast.success("Recipe deleted");
    newRecipe();
    await load();
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/recipes/image", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not upload photo");
        return;
      }
      updateForm("photoUrl", data.path);
      toast.success("Dish photo uploaded");
    } finally {
      setUploading(false);
    }
  }

  async function generateRecipeDraft() {
    if (recipePrompt.trim().length < 4) {
      toast.error("Describe the recipe first");
      return;
    }
    setDraftingRecipe(true);
    try {
      const res = await fetch("/api/recipes/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: recipePrompt }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not generate recipe");
        return;
      }
      const draft = data?.draft;
      if (!draft) {
        toast.error("AI did not return a usable recipe");
        return;
      }
      setForm({
        id: null,
        title: draft.title ?? "",
        description: draft.description ?? "",
        servings: draft.servings ?? "4",
        prepMinutes: draft.prepMinutes ?? "",
        cookMinutes: draft.cookMinutes ?? "",
        photoUrl: draft.photoUrl ?? "",
        instructions: draft.instructions ?? "",
        visibility: draft.visibility === "public" ? "public" : "private",
        ingredients: Array.isArray(draft.ingredients) && draft.ingredients.length > 0
          ? draft.ingredients.map((ingredient: Ingredient) => ({
              name: ingredient.name ?? "",
              quantity: ingredient.quantity ?? "",
              unit: ingredient.unit ?? "",
              category: ingredient.category ?? "pantry",
              note: ingredient.note ?? "",
            }))
          : [{ ...BLANK_INGREDIENT }],
      });
      setSelectedId(null);
      setTab("mine");
      toast.success("Recipe draft ready");
    } finally {
      setDraftingRecipe(false);
    }
  }

  async function createShoppingList(recipe: Recipe) {
    const res = await fetch("/api/recipes/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "shopping-list", recipeId: recipe.id }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not create shopping list");
      return;
    }
    toast.success("Shopping list created");
  }

  async function addToPotluck(recipe: Recipe) {
    if (!selectedPotluckId) {
      toast.error("Choose a potluck event");
      return;
    }
    const res = await fetch("/api/recipes/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "potluck-item", recipeId: recipe.id, eventId: selectedPotluckId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not add potluck item");
      return;
    }
    toast.success("Dish added to potluck");
  }

  async function copyPublicRecipe(recipe: Recipe) {
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: recipe.title,
        description: recipe.description,
        servings: recipe.servings,
        prepMinutes: recipe.prepMinutes,
        cookMinutes: recipe.cookMinutes,
        photoUrl: recipeImageSrc(recipe.photoUrl, recipe.householdId),
        instructions: recipe.instructions,
        visibility: "private",
        ingredients: recipe.ingredients,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not save recipe copy");
      return;
    }
    toast.success("Recipe saved to your household");
    setTab("mine");
    await load();
    setSelectedId(data.id);
    editRecipe(data);
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-xl font-black text-slate-500">Loading recipes...</div>;
  }

  if (loadError) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <Link href="/parent" className="mb-6 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 font-bold text-slate-600 shadow-sm">
          <ArrowLeft size={18} /> Parent Panel
        </Link>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-800">Recipes</h1>
          <p className="mt-2 font-semibold text-slate-500">{loadError}</p>
          <Link href="/parent/settings" className="mt-4 inline-flex rounded-lg bg-red-500 px-4 py-2 text-sm font-black text-white">
            Open Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/parent" className="rounded-lg bg-white p-2 shadow-sm transition-shadow hover:shadow-md">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800 sm:text-3xl">Recipes</h1>
            <p className="text-sm font-semibold text-slate-500">Dishes, ingredients, prep notes, grocery lists, and potluck sharing</p>
          </div>
        </div>
        <button
          type="button"
          onClick={newRecipe}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 font-black text-white shadow-sm hover:bg-red-600"
        >
          <Plus size={18} /> New Recipe
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTab("mine")}
              className={`rounded-md px-3 py-2 text-sm font-black ${tab === "mine" ? "bg-white text-red-600 shadow-sm" : "text-slate-500"}`}
            >
              My Recipes ({recipes.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("public")}
              className={`rounded-md px-3 py-2 text-sm font-black ${tab === "public" ? "bg-white text-red-600 shadow-sm" : "text-slate-500"}`}
            >
              Public ({publicRecipes.length})
            </button>
          </div>
          <div className="space-y-2">
            {activeRecipes.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => {
                  setSelectedId(recipe.id);
                  if (tab === "mine") editRecipe(recipe);
                }}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedRecipe?.id === recipe.id ? "border-red-200 bg-red-50" : "border-slate-100 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="line-clamp-1 font-black text-slate-800">{recipe.title}</p>
                  {recipe.visibility === "public" && <Globe2 size={16} className="shrink-0 text-sky-500" />}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1"><Users size={13} /> {recipe.servings}</span>
                  <span className="inline-flex items-center gap-1"><Clock size={13} /> {timeLabel(recipe)}</span>
                  <span>{recipe.ingredients.length} ingredients</span>
                </div>
              </button>
            ))}
            {activeRecipes.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-400">
                {tab === "mine" ? "No recipes saved yet." : "No public recipes shared yet."}
              </p>
            )}
          </div>
        </aside>

        <main className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-lg bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-3 text-red-600">
                <ChefHat size={22} />
              </div>
              <div>
                <h2 className="font-black text-slate-800">{form.id ? "Edit Recipe" : "Create Recipe"}</h2>
                <p className="text-sm font-semibold text-slate-500">Save a dish with ingredients, a photo, and prep instructions.</p>
              </div>
            </div>

            <div className="mb-5 rounded-lg border border-red-100 bg-red-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Wand2 size={18} className="text-red-600" />
                <h3 className="font-black text-slate-800">Generate from Prompt</h3>
              </div>
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                <Textarea
                  value={recipePrompt}
                  onChange={(event) => setRecipePrompt(event.target.value)}
                  rows={3}
                  placeholder="Easy taco pasta for 6, kid friendly, no peanuts, ready in 30 minutes"
                  className="bg-white"
                />
                <button
                  type="button"
                  onClick={generateRecipeDraft}
                  disabled={draftingRecipe}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 font-black text-white hover:bg-red-600 disabled:opacity-60 md:self-start"
                >
                  <Wand2 size={18} /> {draftingRecipe ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <Label>Dish name</Label>
                <Input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="Baked ziti" />
              </label>
              <label>
                <Label>Servings</Label>
                <Input type="number" min="1" value={form.servings} onChange={(event) => updateForm("servings", event.target.value)} />
              </label>
              <label>
                <Label>Visibility</Label>
                <select
                  value={form.visibility}
                  onChange={(event) => updateForm("visibility", event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                >
                  <option value="private">Household only</option>
                  <option value="public">Public recipe</option>
                </select>
              </label>
              <label>
                <Label>Prep minutes</Label>
                <Input type="number" min="0" value={form.prepMinutes} onChange={(event) => updateForm("prepMinutes", event.target.value)} />
              </label>
              <label>
                <Label>Cook minutes</Label>
                <Input type="number" min="0" value={form.cookMinutes} onChange={(event) => updateForm("cookMinutes", event.target.value)} />
              </label>
              <label className="md:col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} rows={3} />
              </label>
            </div>

            <div className="mt-5">
              <Label>Dish photo</Label>
              <div className="mt-2 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                  {recipeImageSrc(form.photoUrl, selectedRecipe?.householdId) ? (
                    <img src={recipeImageSrc(form.photoUrl, selectedRecipe?.householdId)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="text-slate-300" />
                  )}
                </div>
                <div className="space-y-3">
                  <Input value={form.photoUrl} onChange={(event) => updateForm("photoUrl", event.target.value)} placeholder="/uploads/recipes/..." />
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadPhoto(file);
                    }}
                    className="block w-full text-sm font-semibold text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-2 file:font-black file:text-red-600"
                  />
                  {uploading && <p className="text-xs font-bold text-slate-400">Optimizing image...</p>}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label>Ingredients</Label>
                <button type="button" onClick={addIngredient} className="inline-flex items-center gap-1 text-sm font-black text-red-600">
                  <Plus size={15} /> Ingredient
                </button>
              </div>
              <div className="space-y-2">
                {form.ingredients.map((ingredient, index) => (
                  <div key={index} className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 md:grid-cols-[1fr_90px_90px_120px_36px]">
                    <Input value={ingredient.name} onChange={(event) => updateIngredient(index, "name", event.target.value)} placeholder="Ingredient" />
                    <Input value={ingredient.quantity ?? ""} onChange={(event) => updateIngredient(index, "quantity", event.target.value)} placeholder="Qty" />
                    <Input value={ingredient.unit ?? ""} onChange={(event) => updateIngredient(index, "unit", event.target.value)} placeholder="Unit" />
                    <select
                      value={ingredient.category}
                      onChange={(event) => updateIngredient(index, "category", event.target.value)}
                      className="h-10 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700"
                    >
                      {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <button type="button" onClick={() => removeIngredient(index)} className="rounded-md bg-white p-2 text-slate-400 hover:text-red-500" title="Remove ingredient">
                      <Trash2 size={18} />
                    </button>
                    <Input
                      value={ingredient.note ?? ""}
                      onChange={(event) => updateIngredient(index, "note", event.target.value)}
                      placeholder="Ingredient note"
                      className="md:col-span-5"
                    />
                  </div>
                ))}
              </div>
            </div>

            <label className="mt-5 block">
              <Label>Instructions</Label>
              <Textarea value={form.instructions} onChange={(event) => updateForm("instructions", event.target.value)} rows={8} />
            </label>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveRecipe}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 font-black text-white hover:bg-red-600 disabled:opacity-60"
              >
                <Save size={18} /> {saving ? "Saving..." : "Save Recipe"}
              </button>
              {form.id && selectedRecipe && tab === "mine" && (
                <button
                  type="button"
                  onClick={() => deleteRecipe(selectedRecipe)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 font-black text-slate-600 hover:bg-slate-200"
                >
                  <Trash2 size={18} /> Delete
                </button>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <BookOpen size={20} className="text-red-500" />
                <h2 className="font-black text-slate-800">Recipe Preview</h2>
              </div>
              {selectedRecipe ? (
                <div>
                  {recipeImageSrc(selectedRecipe.photoUrl, selectedRecipe.householdId) && (
                    <img src={recipeImageSrc(selectedRecipe.photoUrl, selectedRecipe.householdId)} alt="" className="mb-3 aspect-[4/3] w-full rounded-lg object-cover" />
                  )}
                  <h3 className="text-xl font-black text-slate-800">{selectedRecipe.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {selectedRecipe.household.name} · {selectedRecipe.visibility === "public" ? "Public" : "Private"}
                  </p>
                  {selectedRecipe.description && <p className="mt-3 text-sm font-semibold text-slate-600">{selectedRecipe.description}</p>}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-black text-slate-500">
                    <span className="rounded-lg bg-slate-50 p-2">{selectedRecipe.servings} servings</span>
                    <span className="rounded-lg bg-slate-50 p-2">{selectedRecipe.prepMinutes ?? 0} prep</span>
                    <span className="rounded-lg bg-slate-50 p-2">{selectedRecipe.cookMinutes ?? 0} cook</span>
                  </div>
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-black uppercase text-slate-400">Ingredients</p>
                    <ul className="space-y-1">
                      {selectedRecipe.ingredients.map((ingredient) => (
                        <li key={ingredient.id ?? ingredient.name} className="text-sm font-semibold text-slate-600">
                          <span className="font-black text-slate-800">{ingredientAmount(ingredient)}</span> {ingredient.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {selectedRecipe.instructions && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-black uppercase text-slate-400">Instructions</p>
                      <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">{selectedRecipe.instructions}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 p-5 text-center text-sm font-bold text-slate-400">Select or create a recipe.</p>
              )}
            </section>

            {selectedRecipe && (
              <section className="rounded-lg bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <ShoppingCart size={20} className="text-emerald-500" />
                  <h2 className="font-black text-slate-800">Recipe Actions</h2>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => createShoppingList(selectedRecipe)}
                    className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-black text-white hover:bg-emerald-600"
                  >
                    Create Shopping List
                  </button>
                  <select
                    value={selectedPotluckId}
                    onChange={(event) => setSelectedPotluckId(event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                  >
                    <option value="">Choose potluck</option>
                    {potluckEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} · {event.group.name} · {formatDate(event.date)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => addToPotluck(selectedRecipe)}
                    className="w-full rounded-lg bg-violet-500 px-4 py-2.5 font-black text-white hover:bg-violet-600"
                  >
                    Add Dish to Potluck
                  </button>
                  {tab === "public" && (
                    <button
                      type="button"
                      onClick={() => copyPublicRecipe(selectedRecipe)}
                      className="w-full rounded-lg bg-slate-800 px-4 py-2.5 font-black text-white hover:bg-slate-900"
                    >
                      Save Copy
                    </button>
                  )}
                </div>
              </section>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}
