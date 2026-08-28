import type { ReactNode } from "react";

export interface DotFieldProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Ambient dot-grid texture (brand pattern) for cobalt hero fields.
 * The dots pick up currentColor, so set a text color on the wrapper.
 * Usable two ways: as a wrapper around content, or childless as an
 * absolutely positioned overlay layer.
 */
export function DotField({ className = "", children }: DotFieldProps) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="dot-grid pointer-events-none absolute inset-0 opacity-15"
        aria-hidden="true"
      />
      {children != null && <div className="relative">{children}</div>}
    </div>
  );
}
