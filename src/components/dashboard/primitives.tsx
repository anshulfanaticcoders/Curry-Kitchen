import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TdHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-ink/6 bg-white shadow-[0_10px_36px_rgba(7,7,7,0.05)]", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4 border-b border-ink/8 p-5", className)}>
      <div>
        <h2 className="font-display text-lg font-black tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm text-ink/55">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-black leading-tight tracking-tight">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/58">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "good" | "watch" | "neutral";
  icon?: ReactNode;
}) {
  const deltaTone =
    tone === "good" ? "text-leaf" : tone === "watch" ? "text-masala" : "text-ink/50";
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-ink/45">{label}</p>
        {icon ? <span className="text-saffron">{icon}</span> : null}
      </div>
      <p className="mt-4 font-display text-3xl font-black tracking-tight">{value}</p>
      {delta ? <p className={cn("mt-2 text-xs font-bold", deltaTone)}>{delta}</p> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid justify-items-center gap-3 px-5 py-10 text-center", className)}>
      <p className="font-display text-xl font-black">{title}</p>
      <p className="max-w-md text-sm leading-6 text-ink/55">{description}</p>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("grid gap-2", className)}>
      <span className="text-sm font-extrabold">{label}</span>
      {children}
      {hint ? <span className="text-xs font-medium text-ink/45">{hint}</span> : null}
    </label>
  );
}

const fieldBase =
  "w-full rounded-xl border border-ink/10 bg-frost px-4 font-medium text-ink outline-none transition placeholder:text-ink/35 focus:border-saffron focus:bg-white focus:ring-2 focus:ring-saffron/25";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-24 py-3", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "h-11 appearance-none pr-10", className)} {...props}>
      {children}
    </select>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full min-w-[640px] border-collapse text-left text-sm", className)}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-ink/8 bg-frost px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-ink/40",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("border-b border-ink/8 px-4 py-3.5 align-middle", className)} {...props}>
      {children}
    </td>
  );
}

export function IconButton({
  label,
  className,
  children,
  type = "button",
  ...props
}: {
  label: string;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "inline-grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
