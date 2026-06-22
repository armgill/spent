import { useState, useRef, useEffect } from "react";
import { Receipt, BarChart2, Tag, X, ChevronLeft, ChevronRight, Plus, Trash2, Trophy, Upload } from "lucide-react";
import { useLocalStorage } from "./useLocalStorage";
import { useSession, pushAllExpenses, LeaderboardTab } from "./social";

type Category = { id: string; name: string };
type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "Food" },
  { id: "2", name: "Transport" },
  { id: "3", name: "Entertainment" },
  { id: "4", name: "Shopping" },
  { id: "5", name: "Bills" },
  { id: "6", name: "Other" },
];

const SAMPLE_EXPENSES: Expense[] = [
  { id: "e1", description: "Grocery run", amount: 52.4, category: "Food", date: "2026-06-15" },
  { id: "e2", description: "Uber to airport", amount: 34.0, category: "Transport", date: "2026-06-14" },
  { id: "e3", description: "Netflix", amount: 15.99, category: "Entertainment", date: "2026-06-13" },
  { id: "e4", description: "New shoes", amount: 89.95, category: "Shopping", date: "2026-06-12" },
  { id: "e5", description: "Electricity bill", amount: 110.0, category: "Bills", date: "2026-06-10" },
  { id: "e6", description: "Coffee", amount: 5.5, category: "Food", date: "2026-06-09" },
];

const BG = "#111111";

function fmt(n: number) {
  return "$" + n.toFixed(2);
}

function monthLabel(year: number, month: number) {
  return new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

function parseCSV(text: string): Omit<Expense, "id">[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes("expense") || header.includes("type") || header.includes("note") || header.includes("date");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const today = new Date().toISOString().slice(0, 10);

  return dataLines
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const dateCol = cols[0] || "";
      const amountStr = cols[1] || "";
      const category = cols[2] || "Other";
      const description = cols[3] || "";

      const num = parseFloat(amountStr.replace(/^\$/, ""));
      if (isNaN(num) || num === 0) return null;

      const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(dateCol) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateCol);
      let date = today;
      if (hasDate) {
        if (dateCol.includes("/")) {
          const parts = dateCol.split("/");
          const y = parts[2].length === 2 ? "20" + parts[2] : parts[2];
          date = `${y}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
        } else {
          date = dateCol;
        }
      }

      return { amount: Math.abs(num), category, description, date };
    })
    .filter(Boolean) as Omit<Expense, "id">[];
}

function ExpensesTab({
  expenses,
  categories,
  onAdd,
  onDelete,
}: {
  expenses: Expense[];
  categories: Category[];
  onAdd: (e: Omit<Expense, "id">) => void;
  onDelete: (id: string) => void;
}) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState(categories[0]?.name ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const items = parseCSV(reader.result as string);
      items.forEach((item) => onAdd(item));
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function submit() {
    if (!desc.trim()) return setError("Enter a description.");
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return setError("Enter a valid amount.");
    onAdd({ description: desc.trim(), amount: num, category: cat, date });
    setDesc("");
    setAmount("");
    setError("");
  }

  return (
    <div className="flex flex-col px-5">
      {/* Big amount field at top */}
      <div className="pt-2 pb-6 flex flex-col items-center relative">
        <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          className="absolute right-0 top-2 active:opacity-50"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          <Upload size={16} />
        </button>
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.25)" }}>
          Amount
        </p>
        <div className="flex items-start justify-center w-full">
          <span className="text-4xl font-light mt-2 mr-1" style={{ color: "rgba(255,255,255,0.4)" }}>$</span>
          <input
            style={{ background: "transparent", color: "#fff", width: `${Math.max(1, (amount.length || 1))}ch` }}
            className="text-7xl font-bold outline-none p-[0px]"
            placeholder="0"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>

      {/* Rest of form */}
      <div className="flex flex-col gap-3 py-6 mb-2">
        <input
          style={{ background: "transparent", color: "#fff" }}
          className="w-full py-2 text-sm outline-none placeholder:opacity-30"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="flex gap-4">
          <select
            style={{ background: BG, color: "#fff" }}
            className="flex-1 py-2 text-sm outline-none"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.name} style={{ background: BG }}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            style={{ background: "transparent", color: "rgba(255,255,255,0.5)" }}
            className="flex-1 py-2 text-sm outline-none"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {error && <p className="text-xs" style={{ color: "rgba(255,80,80,0.8)" }}>{error}</p>}
        <button
          onClick={submit}
          className="flex items-center gap-2 py-2 text-sm font-medium"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          <Plus size={15} />
          Add
        </button>
      </div>

      {/* List */}
      {expenses.length === 0 ? (
        <p className="text-sm mt-8 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
          No expenses yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {[...expenses]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((exp, i, arr) => (
              <div
                key={exp.id}
                className="flex items-center justify-between py-4"
              >
                <span className="text-sm font-semibold mr-4 shrink-0" style={{ color: "#fff" }}>
                  {fmt(exp.amount)}
                </span>
                <div className="flex-1 min-w-0 text-right mr-4">
                  <p className="text-sm font-medium" style={{ color: "#fff" }}>
                    {exp.description}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {exp.category} – {exp.date}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(exp.id)}
                  style={{ color: "rgba(255,255,255,0.2)" }}
                  className="active:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary Tab ─────────────────────────────────────────────────────────────

type SummaryView = "daily" | "weekly" | "monthly";

function dayLabel(date: Date) {
  return date.toLocaleDateString("default", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function weekLabel(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const s = start.toLocaleDateString("default", { month: "short", day: "numeric" });
  const e = end.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" });
  return `${s} – ${e}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function SummaryTab({ expenses, view, onViewChange }: { expenses: Expense[]; view: SummaryView; onViewChange: (v: SummaryView) => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [day, setDay] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [weekStart, setWeekStart] = useState(startOfWeek(now));
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = expenses.filter((e) => {
    const d = new Date(e.date + "T00:00:00");
    if (view === "daily") return sameDay(d, day);
    if (view === "weekly") {
      const ws = startOfWeek(d);
      return ws.getTime() === weekStart.getTime();
    }
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const byCategory: Record<string, { count: number; sum: number; items: Expense[] }> = {};
  for (const e of filtered) {
    if (!byCategory[e.category]) byCategory[e.category] = { count: 0, sum: 0, items: [] };
    byCategory[e.category].count++;
    byCategory[e.category].sum += e.amount;
    byCategory[e.category].items.push(e);
  }

  const catList = Object.entries(byCategory).sort((a, b) => b[1].sum - a[1].sum);

  function prev() {
    if (view === "daily") {
      setDay((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
    } else if (view === "weekly") {
      setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
    } else {
      if (month === 0) { setMonth(11); setYear((y) => y - 1); }
      else setMonth((m) => m - 1);
    }
  }
  function next() {
    if (view === "daily") {
      setDay((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
    } else if (view === "weekly") {
      setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
    } else {
      if (month === 11) { setMonth(0); setYear((y) => y + 1); }
      else setMonth((m) => m + 1);
    }
  }

  const periodLabel = view === "daily" ? dayLabel(day) : view === "weekly" ? weekLabel(weekStart) : monthLabel(year, month);
  const emptyLabel = view === "daily" ? "No expenses this day." : view === "weekly" ? "No expenses this week." : "No expenses this month.";

  return (
    <div className="flex flex-col px-5 py-5">
      {/* View toggle */}
      <div className="flex gap-4 pb-5 mb-5">
        {(["daily", "weekly", "monthly"] as SummaryView[]).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className="text-sm font-medium transition-opacity"
            style={{ color: view === v ? "#fff" : "rgba(255,255,255,0.25)" }}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex items-center justify-between pb-6 mb-6">
        <button onClick={prev} style={{ color: "rgba(255,255,255,0.3)" }} className="active:opacity-50">
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium" style={{ color: "#fff" }}>
          {periodLabel}
        </span>
        <button onClick={next} style={{ color: "rgba(255,255,255,0.3)" }} className="active:opacity-50">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Total */}
      <div className="flex items-baseline justify-between pb-6 mb-6">
        <span className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
          Total
        </span>
        <span className="text-3xl font-bold" style={{ color: "#fff" }}>
          {fmt(total)}
        </span>
      </div>

      {/* Category breakdown */}
      {catList.length === 0 ? (
        <p className="text-sm text-center mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>
          {emptyLabel}
        </p>
      ) : (
        <div className="flex flex-col">
          {catList.map(([name, { count, sum, items }]) => {
            const pct = total > 0 ? (sum / total) * 100 : 0;
            const isOpen = expanded === name;
            return (
              <div key={name} className="py-4">
                <button
                  onClick={() => setExpanded(isOpen ? null : name)}
                  className="w-full text-left active:opacity-60"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#fff" }}>
                        {name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {count} {count === 1 ? "expense" : "expenses"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "#fff" }}>
                      {fmt(sum)}
                    </span>
                  </div>
                  <div className="h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: "rgba(255,255,255,0.35)" }}
                    />
                  </div>
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-2 mt-3 pl-1">
                    {[...items].sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
                      <div key={e.id} className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                            {e.description || "—"}
                          </p>
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {e.date}
                          </p>
                        </div>
                        <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                          {fmt(e.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Category Tab ─────────────────────────────────────────────────────────────

function CategoryTab({
  categories,
  onAdd,
  onDelete,
}: {
  categories: Category[];
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return;
    onAdd(trimmed);
    setName("");
  }

  return (
    <div className="flex flex-col px-5 py-5">
      {/* Add form */}
      <div className="flex flex-col gap-3 pb-6 mb-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
          Add Category
        </p>
        <div className="flex items-center gap-4">
          <input
            style={{ background: "transparent", color: "#fff" }}
            className="flex-1 py-2 text-sm outline-none placeholder:opacity-30"
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <button
            onClick={submit}
            className="text-sm font-medium active:opacity-50"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Add
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col">
        {categories.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between py-4"
          >
            <span className="text-sm" style={{ color: "#fff" }}>
              {c.name}
            </span>
            <button
              onClick={() => onDelete(c.id)}
              style={{ color: "rgba(255,255,255,0.2)" }}
              className="active:opacity-50"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

type Tab = "expenses" | "summary" | "category" | "leaderboard";

export default function App() {
  const [tab, setTab] = useState<Tab>("expenses");
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('categories', DEFAULT_CATEGORIES);
  const [summaryView, setSummaryView] = useLocalStorage<SummaryView>('summaryView', 'monthly');
  const { session } = useSession();

  // When signed in, mirror local expenses to the cloud so friends' leaderboards
  // can read the totals. Debounced so rapid edits batch into one push.
  useEffect(() => {
    if (!session) return;
    const t = setTimeout(() => { pushAllExpenses(session.user.id, expenses); }, 600);
    return () => clearTimeout(t);
  }, [session, expenses]);

  function addExpense(e: Omit<Expense, "id">) {
    setExpenses((prev) => [{ ...e, id: "e" + Date.now() }, ...prev]);
  }
  function deleteExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }
  function addCategory(name: string) {
    setCategories((prev) => [...prev, { id: "c" + Date.now(), name }]);
  }
  function deleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "expenses", label: "Expenses", icon: <Receipt size={20} /> },
    { id: "summary", label: "Summary", icon: <BarChart2 size={20} /> },
    { id: "category", label: "Category", icon: <Tag size={20} /> },
    { id: "leaderboard", label: "Leaderboard", icon: <Trophy size={20} /> },
  ];

  return (
    <div
      className="size-full flex flex-col"
      style={{ fontFamily: "'Inter', sans-serif", background: BG, color: "#fff", paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Header */}
      <div className="px-5 pt-2">
        <span className="text-sm" style={{ color: "rgba(255,255,255,0.12)", fontFamily: "'Gill Sans MT Condensed', 'Gill Sans', sans-serif", fontStyle: "italic", transform: "rotate(20deg)", display: "inline-block" }}>$</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === "expenses" && (
          <ExpensesTab
            expenses={expenses}
            categories={categories}
            onAdd={addExpense}
            onDelete={deleteExpense}
          />
        )}
        {tab === "summary" && <SummaryTab expenses={expenses} view={summaryView} onViewChange={setSummaryView} />}
        {tab === "leaderboard" && <LeaderboardTab session={session} />}
        {tab === "category" && (
          <CategoryTab
            categories={categories}
            onAdd={addCategory}
            onDelete={deleteCategory}
          />
        )}
      </div>

      {/* Bottom tab bar */}
      <div
        className="shrink-0 fixed bottom-0 left-0 right-0 flex"
        style={{ background: BG }}
      >
        {tabs.map(({ id, label, icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-opacity"
              style={{ color: active ? "#fff" : "rgba(255,255,255,0.25)" }}
            >
              {icon}
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
