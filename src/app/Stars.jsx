// Star rating icons (gold when filled, subtle outline when empty). Pure SVG,
// safe in both server and client components.
const STAR_PATH =
  "M12 2.6l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.8-5.4 2.8 1-6.1L3.2 9l6.1-.9z";

export function Star({ filled, className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.6}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

export default function Stars({ value = 0, size = "w-4 h-4", className = "" }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          filled={n <= value}
          className={`${size} ${n <= value ? "text-honey" : "text-brass/35"}`}
        />
      ))}
    </span>
  );
}