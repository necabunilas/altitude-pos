"use client";

import { useState } from "react";
import { formatPeso } from "@/lib/money";

export default function MenuManager({ initialMenu }) {
  const [menu, setMenu] = useState(initialMenu);
  const categories = menu.map((c) => ({ id: c.id, name: c.name }));

  async function reload() {
    const res = await fetch("/api/menu?all=1");
    if (res.ok) setMenu((await res.json()).menu);
  }

  async function toggle(item) {
    await fetch(`/api/menu/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    reload();
  }

  async function remove(item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await fetch(`/api/menu/items/${item.id}`, { method: "DELETE" });
    reload();
  }

  async function removeCategory(cat) {
    if (!confirm(`Delete the "${cat.name}" category?`)) return;
    const res = await fetch(`/api/menu/categories/${cat.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Could not delete category.");
      return;
    }
    reload();
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-espresso">Menu</h1>
        <AddCategory onDone={reload} />
      </div>

      {menu.map((cat) => (
        <section key={cat.id} className="bg-white border border-ink border-l-4 border-l-mocha">
          <div className="px-4 py-3 border-b border-sand flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-xl text-espresso">{cat.name}</h2>
              <span className="text-[11px] font-black text-white bg-mocha px-2 py-0.5">
                {cat.items.length}
              </span>
            </div>
            {cat.items.length === 0 && (
              <button
                onClick={() => removeCategory(cat)}
                className="text-xs text-mocha/70 hover:text-red-600"
              >
                Delete category
              </button>
            )}
          </div>
          <ul>
            {cat.items.map((item) => (
              <li
                key={item.id}
                className="px-4 py-3 flex items-center gap-3 border-b border-sand/40 last:border-0"
              >
                <div className="flex-1">
                  <div className={item.available ? "font-medium" : "font-medium text-mocha/70 line-through"}>
                    {item.name}
                  </div>
                  <div className="text-sm text-mocha">
                    {formatPeso(item.priceCents)}
                    {item.description ? ` · ${item.description}` : ""}
                  </div>
                </div>
                <EditPrice item={item} onDone={reload} />
                <button
                  onClick={() => toggle(item)}
                  className={`text-xs px-2 py-1 rounded-full ${
                    item.available
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-neutral-200 text-mocha"
                  }`}
                >
                  {item.available ? "Available" : "Hidden"}
                </button>
                <button
                  onClick={() => remove(item)}
                  className="text-neutral-300 hover:text-red-600 text-lg leading-none"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-sand/60">
            <AddItem categoryId={cat.id} onDone={reload} />
          </div>
        </section>
      ))}

      {categories.length === 0 && (
        <p className="text-mocha/70">Add a category to get started.</p>
      )}
    </div>
  );
}

function AddItem({ categoryId, onDone }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");

  async function save() {
    if (!name || !price) return;
    await fetch("/api/menu/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        name,
        description: desc,
        priceCents: Math.round(parseFloat(price) * 100),
      }),
    });
    setName("");
    setPrice("");
    setDesc("");
    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-mocha hover:text-neutral-900">
        + Add item
      </button>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="border border-ink px-2 py-1 text-sm flex-1 min-w-32 focus:outline-none focus:border-brass"
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Price ₱"
        inputMode="decimal"
        className="border border-ink px-2 py-1 text-sm w-24 focus:outline-none focus:border-brass"
      />
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description"
        className="border border-ink px-2 py-1 text-sm flex-1 min-w-40 focus:outline-none focus:border-brass"
      />
      <button onClick={save} className="text-xs bg-ink text-white font-black uppercase tracking-wide px-3 py-1.5 hover:bg-espresso-light transition-colors">
        Save
      </button>
      <button onClick={() => setOpen(false)} className="text-sm text-mocha/70">
        Cancel
      </button>
    </div>
  );
}

function EditPrice({ item, onDone }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState((item.priceCents / 100).toFixed(2));

  async function save() {
    await fetch(`/api/menu/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceCents: Math.round(parseFloat(price) * 100) }),
    });
    setEditing(false);
    onDone();
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-xs text-mocha/70 hover:text-neutral-900">
        edit ₱
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        inputMode="decimal"
        className="border border-ink px-1 py-0.5 text-sm w-20 focus:outline-none focus:border-brass"
      />
      <button onClick={save} className="text-xs bg-ink text-white px-2 py-1 hover:bg-espresso-light transition-colors">
        ✓
      </button>
    </span>
  );
}

function AddCategory({ onDone }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function save() {
    if (!name) return;
    await fetch("/api/menu/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sortOrder: 99 }),
    });
    setName("");
    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs px-3 py-2 bg-ink text-white font-black uppercase tracking-wide hover:bg-espresso-light transition-colors">
        + Category
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        className="border border-ink px-2 py-1 text-sm focus:outline-none focus:border-brass"
      />
      <button onClick={save} className="text-xs bg-ink text-white font-black uppercase tracking-wide px-3 py-1.5 hover:bg-espresso-light transition-colors">
        Add
      </button>
      <button onClick={() => setOpen(false)} className="text-sm text-mocha/70">
        Cancel
      </button>
    </div>
  );
}