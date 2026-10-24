"use client";

import { useState } from "react";
import { formatPeso } from "@/lib/money";
import ConfirmModal from "../ConfirmModal";

export default function MenuManager({ initialMenu }) {
  const [menu, setMenu] = useState(initialMenu);
  // Pending delete awaiting confirmation: { item } or { cat }.
  const [confirming, setConfirming] = useState(null);
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
    const res = await fetch(`/api/menu/items/${item.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) reload();
    return { ok: res.ok, error: d.error || "Could not delete the item." };
  }

  async function removeCategory(cat) {
    const res = await fetch(`/api/menu/categories/${cat.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) reload();
    return { ok: res.ok, error: d.error || "Could not delete category." };
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
                onClick={() => setConfirming({ cat })}
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
                  title={item.available ? "Tap to hide from menu" : "Tap to make available"}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-2.5 py-1 border transition-colors ${
                    item.available
                      ? "border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                      : "border-neutral-300 text-mocha/70 hover:bg-neutral-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.available ? "bg-emerald-500" : "bg-neutral-400"
                    }`}
                  />
                  {item.available ? "Available" : "Hidden"}
                </button>
                <button
                  onClick={() => setConfirming({ item })}
                  title="Delete item"
                  className="w-7 h-7 grid place-items-center border border-transparent text-neutral-300 hover:text-red-600 hover:border-red-200 text-lg leading-none transition-colors"
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

      {confirming?.item && (
        <ConfirmModal
          title="Delete item?"
          onConfirm={() => remove(confirming.item)}
          onClose={() => setConfirming(null)}
        >
          <div className="mt-1 text-mocha">{confirming.item.name}</div>
          <div className="mt-3 font-semibold text-3xl text-espresso">
            {formatPeso(confirming.item.priceCents)}
          </div>
          <p className="text-sm text-mocha mt-4">
            It will be removed from the menu. Past orders and sales keep it. To take it off
            the menu for now, set it to Hidden instead.
          </p>
        </ConfirmModal>
      )}

      {confirming?.cat && (
        <ConfirmModal
          title="Delete category?"
          onConfirm={() => removeCategory(confirming.cat)}
          onClose={() => setConfirming(null)}
        >
          <div className="mt-1 text-mocha">{confirming.cat.name}</div>
          <p className="text-sm text-mocha mt-4">It has no items and will be removed from the menu.</p>
        </ConfirmModal>
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
      <button
        onClick={() => setEditing(true)}
        title="Edit price"
        className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 border border-ink text-ink hover:bg-ink hover:text-white transition-colors"
      >
        Edit ₱
      </button>
    );
  }
  return (
    <span className="inline-flex items-center">
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        inputMode="decimal"
        autoFocus
        className="border border-ink border-r-0 px-2 py-1 text-sm w-20 focus:outline-none focus:border-brass"
      />
      <button
        onClick={save}
        title="Save price"
        className="text-xs bg-ink text-white font-black px-2.5 py-1.5 leading-none hover:bg-espresso-light transition-colors"
      >
        ✓
      </button>
      <button
        onClick={() => setEditing(false)}
        title="Cancel"
        className="text-mocha/60 hover:text-red-600 text-lg leading-none px-1.5 transition-colors"
      >
        ×
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