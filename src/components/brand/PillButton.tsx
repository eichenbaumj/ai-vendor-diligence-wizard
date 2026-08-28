import type { MouseEventHandler, ReactNode } from "react";
import { Link } from "react-router-dom";

export type PillButtonVariant = "primary" | "inverse" | "ghost";
export type PillButtonSize = "md" | "lg";

export interface PillButtonProps {
  to?: string;
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  variant?: PillButtonVariant;
  size?: PillButtonSize;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-pill font-sans font-bold no-underline transition-[background-color,color,opacity] duration-150 select-none";

const SIZES: Record<PillButtonSize, string> = {
  md: "px-6 py-2.5 text-base",
  lg: "px-8 py-3.5 text-lg",
};

const VARIANTS: Record<PillButtonVariant, string> = {
  primary: "bg-brand-cobalt text-white hover:bg-brand-cobalt-deep",
  inverse: "bg-white text-brand-cobalt hover:bg-brand-cobalt-50",
  ghost:
    "border-[1.5px] border-current bg-transparent text-current hover:opacity-75",
};

/**
 * The one button of the design system. Pill radius, three variants:
 * primary (cobalt on light fields), inverse (white on cobalt fields),
 * ghost (outlined, inherits the field's text color so it works on any tone).
 */
export function PillButton({
  to,
  href,
  onClick,
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  className = "",
  children,
}: PillButtonProps) {
  const classes = `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`;

  if (to && !disabled) {
    return (
      <Link to={to} onClick={onClick} className={classes}>
        {children}
      </Link>
    );
  }
  if (href && !disabled) {
    return (
      <a href={href} onClick={onClick} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${classes} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}
