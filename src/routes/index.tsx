import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import heroDrop from "@/assets/hero-drop.jpg";
import palestineFlag from "@/assets/palestine-flag.png";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Qatra-e-Karam — Every Drop Counts. Every Bottle Gives Hope." },
      {
        name: "description",
        content:
          "Rs. 5 from every Qatra-e-Karam water bottle is donated for humanitarian support. View every verified donation receipt, publicly.",
      },
      { property: "og:title", content: "Qatra-e-Karam — Transparent Donations" },
      {
        property: "og:description",
        content: "Scan. Sip. See where your Rs. 5 goes. Every receipt published.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,700;9..144,900&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: HomePage,
});

export type Receipt = {
  id: string;
  receiptId: string;
  date: string;
  rawDate: string;
  amount: number;
  org: string;
  note: string;
  fileUrl: string | null;
  fileType: string | null;
};

const FRONT_PAGE_COUNT = 3;

const fmtPKR = (n: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtMonth = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

async function fetchReceipts(): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from("receipts")
    .select("id, receipt_id, org_name, amount, receipt_date, note, file_url, file_type")
    .order("receipt_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const paths = (data ?? []).filter((r) => r.file_url).map((r) => r.file_url as string);
  const signedMap = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from("receipts")
      .createSignedUrls(paths, 60 * 60 * 24 * 7); // 7 days
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
    });
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    receiptId: r.receipt_id,
    date: fmtMonth(r.receipt_date),
    rawDate: r.receipt_date,
    amount: Number(r.amount),
    org: r.org_name,
    note: r.note ?? "",
    fileUrl: r.file_url ? signedMap.get(r.file_url) ?? null : null,
    fileType: r.file_type,
  }));
}

function HomePage() {
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: fetchReceipts,
  });

  const totalRaised = useMemo(
    () => receipts.reduce((s, r) => s + r.amount, 0),
    [receipts],
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero
        totalRaised={totalRaised}
        bottles={Math.round(totalRaised / 5)}
        receiptCount={receipts.length}
      />
      <AboutSection />
      <ReceiptsSection receipts={receipts} total={totalRaised} loading={isLoading} />
      <TransparencySection />
      <ContactSection />
      <SiteFooter />
      <ReceiptLightboxBridge receipts={receipts} />
    </main>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-ink-foreground">
            <DropIcon className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Qatra<span className="text-leaf">-e-</span>Karam
          </span>
        </a>
        <nav className="hidden gap-7 text-sm font-medium text-muted-foreground md:flex">
          <a href="#about" className="hover:text-foreground">About</a>
          <a href="#receipts" className="hover:text-foreground">Receipts</a>
          
          <a href="#contact" className="hover:text-foreground">Contact</a>
        </nav>
        <a
          href="#receipts"
          className="rounded-full bg-leaf px-4 py-2 text-xs font-semibold text-leaf-foreground shadow-soft transition hover:opacity-90"
        >
          See Receipts
        </a>
      </div>
      <div className="h-[3px] flag-stripe" aria-hidden />
    </header>
  );
}

function Hero({
  totalRaised,
  bottles,
  receiptCount,
}: {
  totalRaised: number;
  bottles: number;
  receiptCount: number;
}) {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img
          src={heroDrop}
          alt=""
          width={1920}
          height={1080}
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-16 pb-20 md:grid-cols-[1.2fr_0.8fr] md:gap-14 md:pt-24 md:pb-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-blood" />
            Rs. 5 from every bottle · 100% published
          </span>
          <h1 className="mt-5 text-balance font-display text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Every drop counts.<br />
            <span className="text-leaf">Every bottle</span> gives hope.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Rs. 5 from every Qatra-e-Karam bottle is donated for humanitarian
            support. Every receipt, every rupee — published below for the world
            to verify.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#receipts"
              className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-ink-foreground shadow-soft transition hover:translate-y-[-1px] hover:opacity-95"
            >
              View donation receipts
            </a>
          </div>
        </div>

        <aside className="relative">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Total donated (lifetime)
            </p>
            <p className="mt-2 font-display text-4xl font-black text-leaf md:text-5xl">
              {fmtPKR(totalRaised)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              From <span className="font-semibold text-foreground">{bottles.toLocaleString()}</span> bottles drunk with intention.
            </p>

            <div className="my-6 h-px bg-border" />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <Stat label="Receipts published" value={`${receiptCount}`} />
              <Stat label="Rupees per bottle" value="Rs. 5" accent />
            </div>
          </div>
          <div className="absolute -top-4 -right-3 rounded-full bg-blood px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blood-foreground shadow-soft">
            Live
          </div>
        </aside>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className={`font-display text-2xl font-bold ${accent ? "text-blood" : "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function AboutSection() {
  return (
    <section id="about" className="border-y border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:py-24">
        <div>
          <SectionLabel>About</SectionLabel>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">
            Transparent giving, by design.
          </h2>
        </div>
        <div className="space-y-5 text-base leading-relaxed text-muted-foreground md:text-lg">
          <p>
            We believe charity should never be a black box. Every bottle you
            drink contributes directly to verified donations — and every donation
            is published here, on this page, with the receipt.
          </p>
          <p>
            No middlemen pitches. No glossy reports. Just the receipts, the
            dates, and the organizations doing the work on the ground.
          </p>
        </div>
      </div>
    </section>
  );
}

function ReceiptsSection({
  receipts,
  total,
  loading,
}: {
  receipts: Receipt[];
  total: number;
  loading: boolean;
}) {
  return (
    <section id="receipts" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <SectionLabel>Donation Receipts</SectionLabel>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
            Every rupee, on the record.
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Click any card to open the full receipt. All amounts in Pakistani Rupees.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-5 py-3 text-sm shadow-soft">
          <span className="text-muted-foreground">Total verified · </span>
          <span className="font-display text-lg font-bold text-leaf">{fmtPKR(total)}</span>
        </div>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-muted-foreground">Loading receipts…</p>
      ) : receipts.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <p className="font-display text-lg font-bold">No receipts published yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            New receipts will appear here as soon as they're uploaded.
          </p>
        </div>
      ) : (
        <ReceiptsGrid receipts={receipts} />
      )}
    </section>
  );
}

function ReceiptsGrid({ receipts }: { receipts: Receipt[] }) {
  const [showAll, setShowAll] = useState(false);
  const hasMore = receipts.length > FRONT_PAGE_COUNT;
  const visible = showAll ? receipts : receipts.slice(0, FRONT_PAGE_COUNT);

  return (
    <>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((r, i) => (
          <div key={r.id} className="relative">
            {i === 0 && (
              <span className="absolute -top-2 -left-2 z-10 rounded-full bg-blood px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-blood-foreground shadow-soft">
                Latest
              </span>
            )}
            <ReceiptCard receipt={r} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="rounded-full border border-leaf/40 bg-leaf/10 px-6 py-3 text-sm font-semibold text-leaf transition hover:bg-leaf hover:text-leaf-foreground"
          >
            {showAll
              ? "Show latest only"
              : `View older receipts (${receipts.length - FRONT_PAGE_COUNT})`}
          </button>
        </div>
      )}
    </>
  );
}

function ReceiptCard({ receipt }: { receipt: Receipt }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:shadow-card">
      <button
        type="button"
        data-receipt-open={receipt.id}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-muted text-left"
        aria-label={`Open receipt ${receipt.receiptId}`}
      >
        <ReceiptThumb receipt={receipt} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <span className="absolute bottom-3 right-3 rounded-full bg-card/95 px-3 py-1 text-[11px] font-semibold text-foreground opacity-0 shadow-soft transition group-hover:opacity-100">
          View full →
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-leaf/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-leaf">
            {receipt.receiptId}
          </span>
          <span className="text-xs text-muted-foreground">{receipt.date}</span>
        </div>
        <p className="font-display text-2xl font-bold text-foreground">
          {fmtPKR(receipt.amount)}
        </p>
        <p className="text-sm font-medium text-foreground">{receipt.org}</p>
        {receipt.note && <p className="text-sm text-muted-foreground">{receipt.note}</p>}
      </div>
    </article>
  );
}

function ReceiptThumb({ receipt }: { receipt: Receipt }) {
  const isImage = receipt.fileType?.startsWith("image/") && receipt.fileUrl;
  const isPdf = receipt.fileType === "application/pdf" && receipt.fileUrl;

  if (isImage) {
    return (
      <img
        src={receipt.fileUrl!}
        alt={`Receipt ${receipt.receiptId} from ${receipt.org}`}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }
  if (isPdf) {
    return (
      <div className="grid h-full w-full place-items-center bg-cream text-ink">
        <div className="text-center">
          <p className="font-display text-3xl font-black">PDF</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest">Receipt</p>
        </div>
      </div>
    );
  }
  return <ReceiptArtwork receipt={receipt} />;
}

function ReceiptArtwork({ receipt }: { receipt: Receipt }) {
  return (
    <div className="relative h-full w-full bg-cream p-5">
      <div className="absolute inset-3 rounded-lg border border-dashed border-border bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blood" />
            <span className="h-2 w-2 rounded-full bg-leaf" />
            <span className="h-2 w-2 rounded-full bg-ink" />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">{receipt.receiptId}</span>
        </div>
        <p className="mt-3 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Donation Receipt
        </p>
        <p className="mt-1 font-display text-lg font-black text-ink leading-tight">
          {receipt.org}
        </p>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Amount</p>
            <p className="font-display text-base font-bold text-leaf">{fmtPKR(receipt.amount)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Date</p>
            <p className="text-[11px] font-semibold text-foreground">{receipt.date}</p>
          </div>
        </div>
      </div>
    </div>
  );
}


function TransparencySection() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-20 text-center md:py-24">
      <SectionLabel center>Our Promise</SectionLabel>
      <p className="mt-6 text-balance font-display text-2xl font-bold leading-snug text-foreground md:text-4xl">
        "100% transparency is our promise. Every rupee is tracked and shown publicly."
      </p>
      <div className="mx-auto mt-8 h-1 w-24 flag-stripe rounded-full" />
    </section>
  );
}

function ContactSection() {
  const whatsapp = "https://wa.me/923000000000";
  const email = "hello@qatra-e-karam.org";
  const instagram = "https://instagram.com/qatraekaram";

  return (
    <section id="contact" className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:items-center">
          <div>
            <SectionLabel>Contact</SectionLabel>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
              Questions? Reach the team.
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              We answer every message. Suggest an NGO, request a receipt copy, or
              partner with us.
            </p>
          </div>
          <div className="grid gap-3">
            <ContactRow
              href={whatsapp}
              label="WhatsApp"
              value="+92 300 0000000"
              icon={<WhatsAppIcon />}
              tone="leaf"
            />
            <ContactRow
              href={`mailto:${email}`}
              label="Email"
              value={email}
              icon={<MailIcon />}
            />
            <ContactRow
              href={instagram}
              label="Instagram"
              value="@qatraekaram"
              icon={<InstagramIcon />}
              tone="blood"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactRow({
  href,
  label,
  value,
  icon,
  tone = "ink",
}: {
  href: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "ink" | "leaf" | "blood";
}) {
  const toneClass =
    tone === "leaf"
      ? "bg-leaf text-leaf-foreground"
      : tone === "blood"
      ? "bg-blood text-blood-foreground"
      : "bg-ink text-ink-foreground";
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:translate-y-[-1px] hover:shadow-card"
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${toneClass}`}>
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="truncate font-medium text-foreground">{value}</span>
      </span>
      <span className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground">
        →
      </span>
    </a>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="h-[3px] flag-stripe" aria-hidden />
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground md:flex-row">
        <p>
          © {new Date().getFullYear()} Qatra-e-Karam · Every drop, accounted for.
        </p>
        <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground">
          Admin
        </Link>
      </div>
    </footer>
  );
}

function SectionLabel({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-leaf ${
        center ? "justify-center" : ""
      }`}
    >
      <span className="h-px w-6 bg-leaf" />
      {children}
    </span>
  );
}

/* --- Lightbox --- */

function ReceiptLightboxBridge({ receipts }: { receipts: Receipt[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest<HTMLElement>("[data-receipt-open]");
      if (!btn) return;
      e.preventDefault();
      setOpenId(btn.getAttribute("data-receipt-open"));
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    if (openId) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  const receipt = receipts.find((r) => r.id === openId);
  if (!receipt) return null;

  const isImage = receipt.fileType?.startsWith("image/") && receipt.fileUrl;
  const isPdf = receipt.fileType === "application/pdf" && receipt.fileUrl;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 backdrop-blur-sm"
      onClick={() => setOpenId(null)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-cream shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpenId(null)}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-card text-foreground shadow-soft transition hover:bg-muted"
        >
          ✕
        </button>
        <div className="w-full bg-muted">
          {isImage ? (
            <img
              src={receipt.fileUrl!}
              alt={`Receipt ${receipt.receiptId}`}
              className="max-h-[70vh] w-full object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={receipt.fileUrl!}
              title={`Receipt ${receipt.receiptId}`}
              className="h-[70vh] w-full bg-cream"
            />
          ) : (
            <div className="aspect-[4/5] w-full">
              <ReceiptArtwork receipt={receipt} />
            </div>
          )}
        </div>
        <div className="border-t border-border bg-card p-5">
          <p className="font-display text-xl font-bold">{receipt.org}</p>
          {receipt.note && <p className="text-sm text-muted-foreground">{receipt.note}</p>}
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{receipt.date} · {receipt.receiptId}</span>
            <span className="font-display text-lg font-bold text-leaf">
              {fmtPKR(receipt.amount)}
            </span>
          </div>
          {receipt.fileUrl && (
            <a
              href={receipt.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-leaf hover:underline"
            >
              Open original file ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* --- Icons --- */

function DropIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2s7 8.5 7 13a7 7 0 1 1-14 0c0-4.5 7-13 7-13Z" />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
      <path d="M20 3.5A11 11 0 0 0 3 17l-1 5 5.2-1A11 11 0 1 0 20 3.5Zm-8 18a9 9 0 0 1-4.6-1.3l-.3-.2-3.1.6.6-3-.2-.3A9 9 0 1 1 12 21.5Zm5-6.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2s-.8.9-1 1.1c-.2.2-.4.2-.7.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5 0-.2 0-.4 0-.6l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.8c.1.2 2 3 4.7 4.1.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.2-.6-.3Z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}
