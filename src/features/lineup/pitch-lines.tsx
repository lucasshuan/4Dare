/** The chalk lines of a pitch seen side on, faint on the slate; fills its board. */
export function PitchLines() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 572 372"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <g
        fill="none"
        stroke="rgba(238,242,230,0.16)"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <rect x="14" y="14" width="544" height="344" rx="6" />
        <path d="M286 14v344" />
        <circle cx="286" cy="186" r="40" />
        <path d="M14 120h44v132H14M558 120h-44v132h44" />
      </g>
    </svg>
  );
}
