import type { ReactNode } from "react";

/** The $ZDAY token: a gold coin with a struck "Z". */
export function ZdayIcon({ size }: { size: number }): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle
        cx="12"
        cy="12"
        r="10.5"
        fill="#f59e0b"
        stroke="#fde68a"
        strokeWidth="1.5"
      />
      <circle
        cx="12"
        cy="12"
        r="7.6"
        fill="none"
        stroke="#b45309"
        strokeWidth="1"
      />
      <path
        d="M8.2 8h7.6l-7.6 8h7.6M7 12h10"
        fill="none"
        stroke="#451a03"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
