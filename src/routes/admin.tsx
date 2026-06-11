import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin · Qatra-e-Karam" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/" className="font-display text-lg font-bold">
            Qatra<span className="text-leaf">-e-</span>Karam
          </Link>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Admin
          </span>
        </div>
        <div className="h-[3px] flag-stripe" aria-hidden />
      </header>

      {session ? <AdminAuthed userEmail={session.user.email ?? ""} /> : <SignInForm />}
    </main>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <h1 className="font-display text-3xl font-bold">Admin sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Restricted area. Only authorized admins can upload receipts.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            autoComplete="email"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            autoComplete="current-password"
          />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-leaf px-6 py-3 text-sm font-semibold text-leaf-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <Styles />
    </div>
  );
}

function AdminAuthed({ userEmail }: { userEmail: string }) {
  const qc = useQueryClient();
  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["admin-receipts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .order("receipt_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  async function signOut() {
    await supabase.auth.signOut();
    qc.clear();
  }

  if (roleLoading) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center text-muted-foreground">
        Checking permissions…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Not authorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You're signed in as <span className="text-foreground">{userEmail}</span>, but this
          account doesn't have admin access. Ask the project owner to grant you the
          <code className="mx-1 rounded bg-card px-1.5 py-0.5 text-xs">admin</code>
          role.
        </p>
        <button
          onClick={signOut}
          className="mt-6 rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold hover:bg-muted"
        >
          Sign out
        </button>
        <Styles />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Manage receipts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {userEmail}
          </p>
        </div>
        <button
          onClick={signOut}
          className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted"
        >
          Sign out
        </button>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <UploadForm />
        <ReceiptList receipts={receipts} loading={isLoading} />
      </div>
      <Styles />
    </div>
  );
}

function UploadForm() {
  const qc = useQueryClient();
  const [receiptId, setReceiptId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptDate, setReceiptDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      let filePath: string | null = null;
      let fileType: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        filePath = `${Date.now()}-${receiptId.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("receipts")
          .upload(filePath, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        fileType = file.type;
      }

      const { error } = await supabase.from("receipts").insert({
        receipt_id: receiptId.trim(),
        org_name: orgName.trim(),
        amount: Number(amount),
        receipt_date: receiptDate,
        note: note.trim() || null,
        file_url: filePath,
        file_type: fileType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSuccess(`Receipt ${receiptId} added.`);
      setError(null);
      setReceiptId("");
      setOrgName("");
      setAmount("");
      setNote("");
      setFile(null);
      const fileInput = document.getElementById("receipt-file") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      qc.invalidateQueries({ queryKey: ["admin-receipts"] });
      qc.invalidateQueries({ queryKey: ["receipts"] });
    },
    onError: (e: Error) => {
      setError(e.message);
      setSuccess(null);
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!receiptId.trim() || !orgName.trim() || !amount || !receiptDate) {
      setError("Please fill all required fields.");
      return;
    }
    if (Number(amount) < 0) {
      setError("Amount must be positive.");
      return;
    }
    mutation.mutate();
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-display text-xl font-bold">Add a new receipt</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Totals and the public page update automatically.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Receipt ID *">
          <input
            value={receiptId}
            onChange={(e) => setReceiptId(e.target.value)}
            placeholder="QK-2026-04"
            className="input"
            required
          />
        </Field>
        <Field label="Organization *">
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Al-Khidmat Foundation"
            className="input"
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount (PKR) *">
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25000"
              className="input"
              required
            />
          </Field>
          <Field label="Date *">
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="input"
              required
            />
          </Field>
        </div>
        <Field label="Note (optional)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ration packs for displaced families"
            className="input min-h-[80px]"
            rows={3}
          />
        </Field>
        <Field label="Receipt file (image or PDF, optional)">
          <input
            id="receipt-file"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-leaf file:px-4 file:py-2 file:text-xs file:font-semibold file:text-leaf-foreground"
          />
        </Field>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-leaf">{success}</p>}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-full bg-leaf px-6 py-3 text-sm font-semibold text-leaf-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : "Publish receipt"}
        </button>
      </form>
    </section>
  );
}

type AdminReceipt = {
  id: string;
  receipt_id: string;
  org_name: string;
  amount: number;
  receipt_date: string;
  note: string | null;
  file_url: string | null;
};

function ReceiptList({
  receipts,
  loading,
}: {
  receipts: AdminReceipt[];
  loading: boolean;
}) {
  const qc = useQueryClient();
  const total = receipts.reduce((s, r) => s + Number(r.amount), 0);

  const del = useMutation({
    mutationFn: async (r: AdminReceipt) => {
      if (r.file_url) {
        await supabase.storage.from("receipts").remove([r.file_url]);
      }
      const { error } = await supabase.from("receipts").delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-receipts"] });
      qc.invalidateQueries({ queryKey: ["receipts"] });
    },
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Published receipts</h2>
        <span className="text-sm text-muted-foreground">
          Total ·{" "}
          <span className="font-display font-bold text-leaf">
            Rs. {total.toLocaleString("en-PK")}
          </span>
        </span>
      </div>

      <div className="mt-4 divide-y divide-border">
        {loading ? (
          <p className="py-6 text-sm text-muted-foreground">Loading…</p>
        ) : receipts.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No receipts yet. Add one to the left.
          </p>
        ) : (
          receipts.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-leaf">
                    {r.receipt_id}
                  </span>
                  <span className="text-xs text-muted-foreground">{r.receipt_date}</span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold">{r.org_name}</p>
                <p className="text-sm font-bold text-foreground">
                  Rs. {Number(r.amount).toLocaleString("en-PK")}
                </p>
                {r.note && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{r.note}</p>
                )}
              </div>
              <button
                onClick={() => {
                  if (confirm(`Delete receipt ${r.receipt_id}?`)) del.mutate(r);
                }}
                disabled={del.isPending}
                className="shrink-0 rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Styles() {
  return (
    <style>{`
      .input {
        width: 100%;
        border-radius: 0.75rem;
        border: 1px solid var(--border);
        background: var(--background);
        color: var(--foreground);
        padding: 0.65rem 0.85rem;
        font-size: 0.9rem;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .input:focus {
        border-color: var(--leaf);
        box-shadow: 0 0 0 3px oklch(0.62 0.18 145 / 0.18);
      }
    `}</style>
  );
}
