export type ParkingLot = {
  id?: string | number;
  name?: string;
  free?: number;
  total?: number;
  conf?: number;
  status?: string;
};

type Props = {
  lot?: ParkingLot;
  onClick?: (lot: ParkingLot) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeStatus(status?: string) {
  return String(status ?? "").trim().toLowerCase();
}

export default function ParkingCard({ lot, onClick }: Props) {
  if (!lot) return null;

  const {
    name = "Unknown Parking",
    free = 0,
    total = 0,
    conf = 0,
    status = "unknown",
  } = lot;

  const s = normalizeStatus(status);

  const pct = total > 0 ? clamp(Math.round((free / total) * 100), 0, 100) : 0;

  const isAvailable = s === "available" || s === "open";
  const isBusy = s === "busy" || s === "full";
  const isClosed = s === "closed";

  const statusLabel = isAvailable
    ? "Available"
    : isBusy
    ? "Busy"
    : isClosed
    ? "Closed"
    : "Unknown";

  const theme = isAvailable
    ? {
        ring: "ring-emerald-500/25",
        chip:
          "bg-emerald-500/10 text-emerald-700 ring-emerald-600/25 " +
          "dark:bg-emerald-500/12 dark:text-emerald-200 dark:ring-emerald-500/25",
        bar: "bg-emerald-500",
        glow:
          "radial-gradient(700px circle at 20% 0%, rgba(16,185,129,0.18), transparent 45%)",
        dot: "text-emerald-500 dark:text-emerald-300",
      }
    : isBusy
    ? {
        ring: "ring-amber-500/25",
        chip:
          "bg-amber-500/10 text-amber-800 ring-amber-600/25 " +
          "dark:bg-amber-500/12 dark:text-amber-200 dark:ring-amber-500/25",
        bar: "bg-amber-500",
        glow:
          "radial-gradient(700px circle at 20% 0%, rgba(245,158,11,0.16), transparent 45%)",
        dot: "text-amber-500 dark:text-amber-300",
      }
    : isClosed
    ? {
        ring: "ring-rose-500/25",
        chip:
          "bg-rose-500/10 text-rose-800 ring-rose-600/25 " +
          "dark:bg-rose-500/12 dark:text-rose-200 dark:ring-rose-500/25",
        bar: "bg-rose-500",
        glow:
          "radial-gradient(700px circle at 20% 0%, rgba(244,63,94,0.16), transparent 45%)",
        dot: "text-rose-500 dark:text-rose-300",
      }
    : {
        ring: "ring-sky-500/20",
        chip:
          "bg-sky-500/10 text-sky-800 ring-sky-600/20 " +
          "dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/20",
        bar: "bg-sky-500",
        glow:
          "radial-gradient(700px circle at 20% 0%, rgba(56,189,248,0.14), transparent 45%)",
        dot: "text-sky-500 dark:text-sky-300",
      };

  const handleClick = () => onClick?.(lot);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={[
        "group relative overflow-hidden rounded-2xl",
        "glass-effect",
        "p-5 shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-2xl",
        "border border-border",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        "ring-1",
        theme.ring,
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: theme.glow }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-lg leading-none ${theme.dot}`}>●</span>
            <h3 className="truncate text-base font-semibold text-foreground">
              {name}
            </h3>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-black/5 px-2.5 py-1 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
              <span className="opacity-70">Free</span>{" "}
              <span className="font-semibold text-foreground">{free}</span>
            </span>

            <span className="rounded-full bg-black/5 px-2.5 py-1 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
              <span className="opacity-70">Total</span>{" "}
              <span className="font-semibold text-foreground">{total}</span>
            </span>

            <span className="rounded-full bg-black/5 px-2.5 py-1 ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
              <span className="opacity-70">Conf</span>{" "}
              <span className="font-semibold text-foreground">{conf}%</span>
            </span>
          </div>
        </div>

        <span
          className={[
            "shrink-0 inline-flex items-center rounded-full px-3 py-1",
            "text-[11px] font-semibold ring-1",
            theme.chip,
          ].join(" ")}
        >
          {statusLabel}
        </span>
      </div>

      <div className="relative mt-4">
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Availability</span>
          <span className="font-semibold text-foreground/80">{pct}%</span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }}>
            <div className={`h-full w-full ${theme.bar}`} />
          </div>
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Click to open dashboard</span>
        <span className="opacity-0 transition-opacity group-hover:opacity-100">
          Enter ↵
        </span>
      </div>
    </div>
  );
}
