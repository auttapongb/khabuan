import type { StyleSpecification } from "maplibre-gl";

const OPENFREE_DARK = "https://tiles.openfreemap.org/styles/dark";
const CARTO_FALLBACK =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const ROAD = {
  minor: "#2a261c",
  major: "#3d3628",
  motorway: "#5a4e38",
  casing: "rgba(212, 185, 120, 0.22)",
};

let cached: Promise<StyleSpecification | string> | null = null;

export function loadMcGMapStyle(): Promise<StyleSpecification | string> {
  if (!cached) cached = fetchMcGStyle();
  return cached;
}

async function fetchMcGStyle(): Promise<StyleSpecification | string> {
  try {
    const res = await fetch(OPENFREE_DARK);
    if (!res.ok) return CARTO_FALLBACK;
    const style = (await res.json()) as StyleSpecification;
    applyChampagneGraphite(style);
    return style;
  } catch {
    return CARTO_FALLBACK;
  }
}

function applyChampagneGraphite(style: StyleSpecification): void {
  const set = (id: string, paint: Record<string, unknown>) => {
    const layer = style.layers?.find((l) => "id" in l && l.id === id);
    if (!layer || !("paint" in layer) || !layer.paint) return;
    Object.assign(layer.paint, paint);
  };

  set("background", { "background-color": "#0a0b0c" });
  set("water", { "fill-color": "#10141a" });
  set("waterway", { "line-color": "#161b22" });
  set("landuse_residential", { "fill-color": "#121416" });
  set("landuse_park", { "fill-color": "#141812" });
  set("landcover_wood", { "fill-color": "#161a14" });
  set("building", {
    "fill-color": "#16181c",
    "fill-outline-color": "rgba(212, 185, 120, 0.12)",
  });
  set("highway_path", { "line-color": "#242018" });
  set("highway_minor", { "line-color": ROAD.minor });
  set("highway_major_inner", { "line-color": ROAD.major });
  set("highway_major_subtle", { "line-color": ROAD.major });
  set("highway_major_casing", { "line-color": ROAD.casing });
  set("highway_motorway_inner", { "line-color": ROAD.motorway });
  set("highway_motorway_subtle", { "line-color": ROAD.motorway });
  set("highway_motorway_casing", { "line-color": ROAD.casing });
  set("boundary_state", { "line-color": "rgba(228, 207, 160, 0.18)" });
  set("boundary_country_z0-4", { "line-color": "rgba(228, 207, 160, 0.28)" });
  set("boundary_country_z5-", { "line-color": "rgba(228, 207, 160, 0.28)" });

  for (const layer of style.layers ?? []) {
    if (layer.type !== "symbol" || !("paint" in layer) || !layer.paint) continue;
    const paint = layer.paint as Record<string, unknown>;
    if ("text-color" in paint) paint["text-color"] = "#c9b88a";
    if ("text-halo-color" in paint) paint["text-halo-color"] = "#0a0b0c";
  }
}
