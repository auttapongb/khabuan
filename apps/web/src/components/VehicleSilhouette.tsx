import type { VehicleIcon } from "@/lib/types";
import styles from "./VehicleSilhouette.module.css";

const PATHS: Record<VehicleIcon, string> = {
  "silhouette-coupe":
    "M6 28 L12 18 L22 16 L34 18 L42 28 L38 28 L36 24 L14 24 L12 28 Z M14 30 a3 3 0 1 0 0.1 0 M34 30 a3 3 0 1 0 0.1 0",
  "silhouette-sedan":
    "M4 28 L10 20 L18 16 L30 16 L38 20 L44 28 L40 28 L38 24 L12 24 L10 28 Z M12 30 a3 3 0 1 0 0.1 0 M36 30 a3 3 0 1 0 0.1 0",
  "silhouette-suv":
    "M5 28 L10 18 L16 14 L32 14 L40 18 L44 28 L39 28 L37 24 L13 24 L11 28 Z M13 30 a3.2 3.2 0 1 0 0.1 0 M35 30 a3.2 3.2 0 1 0 0.1 0",
  "silhouette-gt":
    "M5 29 L14 17 L24 14 L36 17 L44 29 L38 29 L35 24 L15 24 L12 29 Z M14 31 a3 3 0 1 0 0.1 0 M34 31 a3 3 0 1 0 0.1 0",
};

type Props = {
  icon: VehicleIcon;
  color?: string;
  selected?: boolean;
  onClick?: () => void;
  label?: string;
  bare?: boolean;
};

export function VehicleSilhouette({
  icon,
  color = "#e4cfa0",
  selected,
  onClick,
  label,
  bare,
}: Props) {
  if (onClick) {
    return (
      <button
        type="button"
        className={`${styles.wrap} ${selected ? styles.selected : ""}`}
        onClick={onClick}
        aria-pressed={selected}
      >
        <svg viewBox="0 0 48 40" className={styles.svg} aria-hidden>
          <path d={PATHS[icon]} fill={color} />
        </svg>
        {label ? <span>{label}</span> : null}
      </button>
    );
  }

  const svg = (
    <svg viewBox="0 0 48 40" className={styles.svg} aria-hidden>
      <path d={PATHS[icon]} fill={color} />
    </svg>
  );

  if (bare) return svg;

  return (
    <div className={`${styles.wrap} ${selected ? styles.selected : ""}`}>
      {svg}
      {label ? <span>{label}</span> : null}
    </div>
  );
}
