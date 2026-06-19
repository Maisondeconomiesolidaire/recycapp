import { forwardRef } from "react";
import { cn } from "../../lib/cn";

function formatFrPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ");
}

export const PhoneInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function PhoneInput({ onChange, className, ...rest }, ref) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatFrPhone(e.target.value);
    e.target.value = formatted;
    onChange?.(e);
  }

  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 select-none text-base leading-none">
        🇫🇷
      </span>
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        onChange={handleChange}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border bg-input/40 pl-10 pr-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/45",
          className,
        )}
        {...rest}
      />
    </div>
  );
});
