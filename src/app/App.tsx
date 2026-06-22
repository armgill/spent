import { useState } from "react";
import { Receipt, BarChart2, Tag, X, ChevronLeft, ChevronRight, Plus, Trash2, Trophy } from "lucide-react";
import { useLocalStorage } from "./useLocalStorage";

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
      <div className="pt-2 pb-6 flex flex-col items-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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
      <div className="flex flex-col gap-3 py-6 mb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <input
          style={{ background: "transparent", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.12)" }}
          className="w-full py-2 text-sm outline-none placeholder:opacity-30"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="flex gap-4">
          <select
            style={{ background: BG, color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.12)" }}
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
            style={{ background: "transparent", color: "rgba(255,255,255,0.5)", borderBottom: "1px solid rgba(255,255,255,0.12)" }}
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
                style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
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

  const byCategory: Record<string, { count: number; sum: number }> = {};
  for (const e of filtered) {
    if (!byCategory[e.category]) byCategory[e.category] = { count: 0, sum: 0 };
    byCategory[e.category].count++;
    byCategory[e.category].sum += e.amount;
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
      <div className="flex gap-4 pb-5 mb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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
      <div className="flex items-center justify-between pb-6 mb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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
      <div className="flex items-baseline justify-between pb-6 mb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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
          {catList.map(([name, { count, sum }], i, arr) => {
            const pct = total > 0 ? (sum / total) * 100 : 0;
            return (
              <div
                key={name}
                className="py-4"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
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
      <div className="flex flex-col gap-3 pb-6 mb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
          Add Category
        </p>
        <div className="flex items-center gap-4">
          <input
            style={{ background: "transparent", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.12)" }}
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
        {categories.map((c, i, arr) => (
          <div
            key={c.id}
            className="flex items-center justify-between py-4"
            style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
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

// ─── Leaderboard Tab ──────────────────────────────────────────────────────────

const LEADERBOARD_USERS = [
  { id: "u1", name: "Jordan", avatar: "J", total: 312.45 },
  { id: "u2", name: "Alex", avatar: "A", total: 278.10 },
  { id: "u3", name: "Sam", avatar: "S", total: 245.60 },
  { id: "u4", name: "Morgan", avatar: "M", total: 198.30 },
  { id: "u5", name: "Riley", avatar: "R", total: 154.75 },
  { id: "u6", name: "Casey", avatar: "C", total: 120.00 },
  { id: "u7", name: "Taylor", avatar: "T", total: 89.50 },
];

type SortOrder = "most" | "least";
type TimeRange = "week" | "month" | "year";

function PodiumBlock({
  rank,
  user,
  isMe,
  height,
  medalColor,
  medalLabel,
}: {
  rank: number;
  user: { name: string; avatar: string; total: number };
  isMe: boolean;
  height: number;
  medalColor: string;
  medalLabel: string;
}) {
  return (
    <div className="flex flex-col items-center" style={{ width: "30%" }}>
      {/* Avatar + name above podium */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-1"
        style={{
          background: isMe ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.09)",
          color: isMe ? "#fff" : "rgba(255,255,255,0.6)",
        }}
      >
        {user.avatar}
      </div>
      <p className="text-xs font-medium mb-0.5 text-center truncate w-full px-1" style={{ color: isMe ? "#fff" : "rgba(255,255,255,0.75)" }}>
        {user.name}
      </p>
      <p className="text-[10px] mb-2 text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
        {fmt(user.total)}
      </p>
      {/* Podium block */}
      <div
        className="w-full rounded-t-lg flex flex-col items-center justify-start relative"
        style={{ height, background: "rgba(255,255,255,0.07)" }}
      >
        {/* Ribbon */}
        <div className="w-[3px] rounded-full" style={{ height: 18, background: medalColor, opacity: 0.7 }} />
        {/* Medal */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${medalColor}, ${medalColor}99)`,
            color: "#111",
            boxShadow: `0 2px 8px ${medalColor}55`,
          }}
        >
          {rank}
        </div>
      </div>
    </div>
  );
}

function LeaderboardTab({ expenses }: { expenses: Expense[] }) {
  const [order, setOrder] = useState<SortOrder>("most");
  const [range, setRange] = useState<TimeRange>("month");
  const [showAdd, setShowAdd] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friends, setFriends] = useState<typeof LEADERBOARD_USERS>([...LEADERBOARD_USERS]);

  const now = new Date();
  const cutoff = new Date(now);
  if (range === "week") cutoff.setDate(now.getDate() - 7);
  else if (range === "month") cutoff.setMonth(now.getMonth() - 1);
  else cutoff.setFullYear(now.getFullYear() - 1);

  const myTotal = expenses
    .filter((e) => new Date(e.date) >= cutoff)
    .reduce((s, e) => s + e.amount, 0);

  const rangeMultiplier = range === "week" ? 0.25 : range === "month" ? 1 : 12;
  const scaled = friends.map((u) => ({ ...u, total: +(u.total * rangeMultiplier).toFixed(2) }));
  const myEntry = { id: "me", name: "You", avatar: "Y", total: myTotal };
  const all = [...scaled, myEntry].sort((a, b) =>
    order === "most" ? b.total - a.total : a.total - b.total
  );

  const top3 = all.slice(0, 3);
  const rest = all.slice(3);

  // Podium order: 2nd left, 1st centre, 3rd right
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumConfig = [
    { height: 90, medalColor: "#C0C0C0", medalLabel: "SILVER" },
    { height: 120, medalColor: "#FFD700", medalLabel: "GOLD" },
    { height: 70, medalColor: "#CD7F32", medalLabel: "BRONZE" },
  ];
  const podiumRanks = [2, 1, 3];

  function addFriend() {
    const t = friendName.trim();
    if (!t) return;
    setFriends((prev) => [...prev, { id: "f" + Date.now(), name: t, avatar: t[0].toUpperCase(), total: Math.round(Math.random() * 300 + 50) }]);
    setFriendName("");
    setShowAdd(false);
  }

  return (
    <div className="flex flex-col px-5 py-5 pb-36">
      {/* Time range row */}
      <div className="flex gap-4 mb-3">
        {(["week", "month", "year"] as TimeRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className="text-sm font-medium transition-opacity"
            style={{ color: range === r ? "#fff" : "rgba(255,255,255,0.25)" }}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>

      {/* Sort row */}
      <div className="flex gap-4 mb-8" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "16px" }}>
        {(["most", "least"] as SortOrder[]).map((o) => (
          <button
            key={o}
            onClick={() => setOrder(o)}
            className="text-sm font-medium transition-opacity"
            style={{ color: order === o ? "#fff" : "rgba(255,255,255,0.25)" }}
          >
            {o === "most" ? "Most Spent" : "Least Spent"}
          </button>
        ))}
      </div>

      {/* Podium */}
      {top3.length >= 2 && (
        <div className="flex items-end justify-center gap-2 mb-8">
          {podiumOrder.map((user, i) => {
            if (!user) return null;
            const cfg = podiumConfig[i];
            const rank = podiumRanks[i];
            const isMe = user.id === "me";
            return (
              <PodiumBlock
                key={user.id}
                rank={rank}
                user={user}
                isMe={isMe}
                height={cfg.height}
                medalColor={cfg.medalColor}
                medalLabel={cfg.medalLabel}
              />
            );
          })}
        </div>
      )}

      {/* 4th+ list */}
      {rest.length > 0 && (
        <div className="flex flex-col">
          {rest.map((user, i, arr) => {
            const isMe = user.id === "me";
            const rank = i + 4;
            return (
              <div
                key={user.id}
                className="flex items-center gap-4 py-3.5"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
              >
                <span className="text-sm w-5 shrink-0 text-right" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {rank}
                </span>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: isMe ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)",
                    color: isMe ? "#fff" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {user.avatar}
                </div>
                <span className="flex-1 text-sm" style={{ color: isMe ? "#fff" : "rgba(255,255,255,0.6)" }}>
                  {user.name}
                </span>
                <span className="text-sm font-medium" style={{ color: isMe ? "#fff" : "rgba(255,255,255,0.4)" }}>
                  {fmt(user.total)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Add friend */}
      <div className="fixed bottom-16 left-0 right-0 px-5 py-4" style={{ background: BG, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {showAdd ? (
          <div className="flex items-center gap-3">
            <input
              autoFocus
              style={{ background: "transparent", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.2)" }}
              className="flex-1 py-1.5 text-sm outline-none placeholder:opacity-30"
              placeholder="Friend's name"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFriend()}
            />
            <button onClick={addFriend} className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Add</button>
            <button onClick={() => setShowAdd(false)} style={{ color: "rgba(255,255,255,0.25)" }}><X size={15} /></button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <Plus size={15} />
            Add Friend
          </button>
        )}
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
        {tab === "leaderboard" && <LeaderboardTab expenses={expenses} />}
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
        style={{ background: BG, borderTop: "1px solid rgba(255,255,255,0.06)" }}
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
