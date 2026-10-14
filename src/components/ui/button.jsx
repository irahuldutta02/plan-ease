import { cn } from "@/lib/cn";

const variants = {
  primary:
    "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110 active:brightness-95",
  secondary: "bg-muted text-foreground hover:brightness-95",
  outline:
    "border border-foreground/25 bg-transparent text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  danger: "bg-danger text-white hover:brightness-110",
};

const sizes = {
  md: "min-h-11 px-5 text-base",
  lg: "min-h-14 px-6 text-base",
  icon: "size-11",
};

/** Class names for anything that should look like a button (e.g. a Link). */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

/** Button with a 44px minimum touch target. */
export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
}
