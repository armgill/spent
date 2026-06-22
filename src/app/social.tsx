import { useEffect, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { X, Check, LogOut, UserPlus, Users } from "lucide-react";
import { supabase } from "./supabase";

const BG = "#111111";

type Expense = { id: string; description: string; amount: number; category: string; date: string };
type Profile = { id: string; username: string; display_name: string | null };
type FriendTotal = { user_id: string; username: string; display_name: string | null; total: number };
type Friendship = {
  id: string;
  requester: string;
  addressee: string;
  status: "pending" | "accepted";
};

function fmt(n: number) {
  return "$" + n.toFixed(2);
}

// ── session hook ──────────────────────────────────────────────────────────────

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

// ── cloud sync: mirror local expenses up so totals exist for the leaderboard ──

export async function pushAllExpenses(userId: string, expenses: Expense[]) {
  // Upsert everything we have locally. Dedupe by id first — a duplicate id in a
  // single upsert batch makes Postgres reject the whole statement.
  if (expenses.length > 0) {
    const rows = [
      ...new Map(
        expenses.map((e) => [
          e.id,
          { id: e.id, user_id: userId, amount: e.amount, category: e.category, description: e.description, date: e.date },
        ])
      ).values(),
    ];
    await supabase.from("expenses").upsert(rows);
  }
  // ...then drop any cloud rows that no longer exist locally.
  const { data: cloud } = await supabase.from("expenses").select("id").eq("user_id", userId);
  const localIds = new Set(expenses.map((e) => e.id));
  const stale = (cloud ?? []).map((r) => r.id).filter((id) => !localIds.has(id));
  if (stale.length > 0) {
    await supabase.from("expenses").delete().in("id", stale);
  }
}

// ── auth + username screens ───────────────────────────────────────────────────

function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setBusy(false);
  }

  async function google() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    });
  }

  if (sent) {
    return (
      <p className="text-sm text-center mt-10" style={{ color: "rgba(255,255,255,0.5)" }}>
        Check your email to confirm your account, then sign in.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-10">
      <p className="text-xs uppercase tracking-widest text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
        {mode === "signin" ? "Sign in to compare" : "Create an account"}
      </p>

      <button
        onClick={google}
        className="w-full py-2.5 rounded-lg text-sm font-medium active:opacity-60"
        style={{ background: "rgba(255,255,255,0.9)", color: "#111" }}
      >
        Continue with Google
      </button>

      <div className="flex items-center justify-center my-1">
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>or</span>
      </div>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ background: "transparent", color: "#fff" }}
        className="w-full py-2 text-sm outline-none placeholder:opacity-30"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        style={{ background: "transparent", color: "#fff" }}
        className="w-full py-2 text-sm outline-none placeholder:opacity-30"
      />

      {error && <p className="text-xs" style={{ color: "rgba(255,80,80,0.8)" }}>{error}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="w-full py-2.5 rounded-lg text-sm font-medium active:opacity-60"
        style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
      >
        {busy ? "..." : mode === "signin" ? "Sign In" : "Sign Up"}
      </button>

      <button
        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
        className="text-xs"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {mode === "signin" ? "Sign up" : "Sign in"}
      </button>
    </div>
  );
}

function UsernameSetup({ userId, onDone }: { userId: string; onDone: (p: Profile) => void }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) {
      return setError("3–20 chars: letters, numbers, underscores.");
    }
    setBusy(true);
    // One username per account: if this user already has a profile, use it
    // rather than ever creating a second.
    const { data: existing } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (existing) {
      setBusy(false);
      onDone(existing as Profile);
      return;
    }
    const { error } = await supabase.from("profiles").insert({ id: userId, username: u, display_name: username.trim() });
    setBusy(false);
    if (error) {
      // 23505 here means the username is taken (the id-conflict case is handled above).
      setError(error.code === "23505" ? "That username is taken." : error.message);
      return;
    }
    onDone({ id: userId, username: u, display_name: username.trim() });
  }

  return (
    <div className="flex flex-col gap-4 pt-10">
      <p className="text-xs uppercase tracking-widest text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
        Pick a username
      </p>
      <input
        autoFocus
        placeholder="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        style={{ background: "transparent", color: "#fff" }}
        className="w-full py-2 text-sm outline-none placeholder:opacity-30"
      />
      {error && <p className="text-xs" style={{ color: "rgba(255,80,80,0.8)" }}>{error}</p>}
      <button
        onClick={save}
        disabled={busy}
        className="w-full py-2.5 rounded-lg text-sm font-medium active:opacity-60"
        style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
      >
        {busy ? "..." : "Continue"}
      </button>
    </div>
  );
}

// ── leaderboard (logged in) ───────────────────────────────────────────────────

type TimeRange = "week" | "month" | "year";
type SortOrder = "most" | "least";

function rangeStart(range: TimeRange): string {
  const d = new Date();
  if (range === "week") d.setDate(d.getDate() - 7);
  else if (range === "month") d.setMonth(d.getMonth() - 1);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

function PodiumBlock({ rank, entry, isMe, height, medalColor }: {
  rank: number; entry: FriendTotal; isMe: boolean; height: number; medalColor: string;
}) {
  const name = entry.display_name || entry.username;
  return (
    <div className="flex flex-col items-center" style={{ width: "30%" }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-1"
        style={{ background: isMe ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.09)", color: isMe ? "#fff" : "rgba(255,255,255,0.6)" }}>
        {initials(name)}
      </div>
      <p className="text-xs font-medium mb-0.5 text-center truncate w-full px-1" style={{ color: isMe ? "#fff" : "rgba(255,255,255,0.75)" }}>
        {isMe ? "You" : name}
      </p>
      <p className="text-[10px] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>{fmt(entry.total)}</p>
      <div className="w-full rounded-t-lg flex flex-col items-center" style={{ height, background: "rgba(255,255,255,0.07)" }}>
        <div className="w-[3px] rounded-full" style={{ height: 18, background: medalColor, opacity: 0.7 }} />
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: `radial-gradient(circle at 35% 35%, ${medalColor}, ${medalColor}99)`, color: "#111", boxShadow: `0 2px 8px ${medalColor}55` }}>
          {rank}
        </div>
      </div>
    </div>
  );
}

function Leaderboard({ profile, onSignOut, refreshKey }: { profile: Profile; onSignOut: () => void; refreshKey: number }) {
  const [range, setRange] = useState<TimeRange>("month");
  const [order, setOrder] = useState<SortOrder>("least");
  const [totals, setTotals] = useState<FriendTotal[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addMsg, setAddMsg] = useState("");
  const [showFriends, setShowFriends] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: t } = await supabase.rpc("get_friend_totals", { range_start: rangeStart(range) });
    setTotals((t as FriendTotal[]) ?? []);
    const { data: f } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester.eq.${profile.id},addressee.eq.${profile.id}`);
    setFriendships((f as Friendship[]) ?? []);
    const ids = new Set<string>();
    (f as Friendship[] ?? []).forEach((fr) => { ids.add(fr.requester); ids.add(fr.addressee); });
    if (ids.size > 0) {
      const { data: ps } = await supabase.from("profiles").select("*").in("id", [...ids]);
      const map: Record<string, Profile> = {};
      (ps as Profile[] ?? []).forEach((p) => { map[p.id] = p; });
      setProfiles(map);
    }
  }, [range, profile.id]);

  useEffect(() => { load(); }, [load, refreshKey]);

  async function addFriend() {
    setAddMsg("");
    const u = addName.trim().toLowerCase();
    if (!u) return;
    if (u === profile.username) return setAddMsg("That's you.");
    const { data: found } = await supabase.from("profiles").select("id").eq("username", u).maybeSingle();
    if (!found) return setAddMsg("No user with that username.");
    const { error } = await supabase.from("friendships").insert({ requester: profile.id, addressee: found.id, status: "pending" });
    if (error) setAddMsg(error.code === "23505" ? "Request already exists." : error.message);
    else { setAddMsg("Request sent!"); setAddName(""); load(); }
  }

  async function accept(id: string) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    load();
  }
  async function remove(id: string) {
    await supabase.from("friendships").delete().eq("id", id);
    setConfirmId(null);
    load();
  }

  const incoming = friendships.filter((f) => f.addressee === profile.id && f.status === "pending");
  const accepted = friendships
    .filter((f) => f.status === "accepted")
    .map((f) => ({ friendshipId: f.id, profile: profiles[f.requester === profile.id ? f.addressee : f.requester] }));

  const sorted = [...totals].sort((a, b) => order === "most" ? b.total - a.total : a.total - b.total);
  const showPodium = sorted.length >= 2;
  const top3 = sorted.slice(0, 3);
  const listEntries = showPodium ? sorted.slice(3) : sorted;
  const listRankOffset = showPodium ? 4 : 1;
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as FriendTotal[];
  const podiumCfg = [
    { height: 90, color: "#C0C0C0", rank: 2 },
    { height: 120, color: "#FFD700", rank: 1 },
    { height: 70, color: "#CD7F32", rank: 3 },
  ];

  return (
    <div className="flex flex-col px-5 py-5 pb-36">
      {/* header row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium" style={{ color: "#fff" }}>@{profile.username}</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setShowFriends((v) => !v); setConfirmId(null); }}
            className="relative active:opacity-50"
            style={{ color: showFriends ? "#fff" : "rgba(255,255,255,0.3)" }}
          >
            <Users size={16} />
            {incoming.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: "rgba(120,220,120,0.9)" }} />
            )}
          </button>
          <button onClick={onSignOut} style={{ color: "rgba(255,255,255,0.3)" }} className="active:opacity-50"><LogOut size={16} /></button>
        </div>
      </div>

      {showFriends ? (
        /* ── Friends management ── */
        <div className="flex flex-col">
          {incoming.length > 0 && (
            <div className="flex flex-col gap-2 mb-6">
              <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>Requests</p>
              {incoming.map((f) => {
                const p = profiles[f.requester];
                return (
                  <div key={f.id} className="flex items-center justify-between py-1">
                    <span className="text-sm" style={{ color: "#fff" }}>{p ? (p.display_name || p.username) : "…"}</span>
                    <div className="flex gap-3">
                      <button onClick={() => accept(f.id)} style={{ color: "rgba(120,220,120,0.9)" }}><Check size={16} /></button>
                      <button onClick={() => remove(f.id)} style={{ color: "rgba(255,255,255,0.3)" }}><X size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Friends</p>
          {accepted.length === 0 ? (
            <p className="text-sm py-2" style={{ color: "rgba(255,255,255,0.3)" }}>No friends yet. Add some below.</p>
          ) : (
            accepted.map(({ friendshipId, profile: p }) => (
              <div key={friendshipId} className="flex items-center justify-between py-3">
                <span className="text-sm" style={{ color: "#fff" }}>{p ? (p.display_name || p.username) : "…"}</span>
                {confirmId === friendshipId ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Remove?</span>
                    <button onClick={() => remove(friendshipId)} className="text-xs font-medium" style={{ color: "rgba(255,90,90,0.9)" }}>Yes</button>
                    <button onClick={() => setConfirmId(null)} className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmId(friendshipId)} style={{ color: "rgba(255,255,255,0.25)" }} className="active:opacity-50"><X size={16} /></button>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
      <>
      {/* time + sort */}
      <div className="flex gap-4 mb-3">
        {(["week", "month", "year"] as TimeRange[]).map((r) => (
          <button key={r} onClick={() => setRange(r)} className="text-sm font-medium"
            style={{ color: range === r ? "#fff" : "rgba(255,255,255,0.25)" }}>
            {r[0].toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex gap-4 mb-8 pb-4">
        {(["most", "least"] as SortOrder[]).map((o) => (
          <button key={o} onClick={() => setOrder(o)} className="text-sm font-medium"
            style={{ color: order === o ? "#fff" : "rgba(255,255,255,0.25)" }}>
            {o === "most" ? "Most Spent" : "Least Spent"}
          </button>
        ))}
      </div>

      {showPodium && (
        <div className="flex items-end justify-center gap-2 mb-8">
          {podiumOrder.map((entry, i) => (
            <PodiumBlock key={entry.user_id} rank={podiumCfg[i].rank} entry={entry}
              isMe={entry.user_id === profile.id} height={podiumCfg[i].height} medalColor={podiumCfg[i].color} />
          ))}
        </div>
      )}
      {listEntries.length > 0 && (
        <div className="flex flex-col">
          {listEntries.map((entry, i, arr) => {
            const isMe = entry.user_id === profile.id;
            const name = entry.display_name || entry.username;
            return (
              <div key={entry.user_id} className="flex items-center gap-4 py-3.5">
                <span className="text-sm w-5 shrink-0 text-right" style={{ color: "rgba(255,255,255,0.2)" }}>{i + listRankOffset}</span>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: isMe ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)", color: isMe ? "#fff" : "rgba(255,255,255,0.4)" }}>
                  {initials(name)}
                </div>
                <span className="flex-1 text-sm" style={{ color: isMe ? "#fff" : "rgba(255,255,255,0.6)" }}>{isMe ? "You" : name}</span>
                <span className="text-sm font-medium" style={{ color: isMe ? "#fff" : "rgba(255,255,255,0.4)" }}>{fmt(entry.total)}</span>
              </div>
            );
          })}
        </div>
      )}
      {sorted.length <= 1 && (
        <p className="text-xs text-center mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>
          Add friends to see how you compare.
        </p>
      )}
      </>
      )}

      {/* add friend */}
      <div className="fixed bottom-16 left-0 right-0 px-5 py-4" style={{ background: BG }}>
        {showAdd ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <input autoFocus placeholder="Friend's username" value={addName}
                onChange={(e) => setAddName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFriend()}
                style={{ background: "transparent", color: "#fff" }}
                className="flex-1 py-1.5 text-sm outline-none placeholder:opacity-30" />
              <button onClick={addFriend} className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>Send</button>
              <button onClick={() => { setShowAdd(false); setAddMsg(""); }} style={{ color: "rgba(255,255,255,0.25)" }}><X size={15} /></button>
            </div>
            {addMsg && <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{addMsg}</p>}
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
            <UserPlus size={15} /> Add Friend
          </button>
        )}
      </div>
    </div>
  );
}

// ── exported tab ──────────────────────────────────────────────────────────────

export function LeaderboardTab({ session, refreshKey }: { session: Session | null; refreshKey: number }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!session) { setProfile(null); setChecking(false); return; }
    setChecking(true);
    supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle().then(({ data }) => {
      setProfile((data as Profile) ?? null);
      setChecking(false);
    });
  }, [session]);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  if (!session) {
    return <div className="px-5"><AuthForm /></div>;
  }
  if (checking) {
    return <p className="text-sm text-center mt-10" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</p>;
  }
  if (!profile) {
    return <div className="px-5"><UsernameSetup userId={session.user.id} onDone={setProfile} /></div>;
  }
  return <Leaderboard profile={profile} onSignOut={signOut} refreshKey={refreshKey} />;
}
