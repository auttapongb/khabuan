import type { StyleSpecification } from "maplibre-gl";

const OPENFREE_LIGHT = "https://tiles.openfreemap.org/styles/liberty";
const CARTO_FALLBACK =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const ROAD = {
  minor: "#f0f1f2",
  major: "#e2e5e7",
  motorway: "#d8dbde",
  casing: "rgba(23, 25, 27, 0.10)",
};

let cached: Promise<StyleSpecification | string> | null = null;

export function loadMcGMapStyle(): Promise<StyleSpecification | string> {
  if (!cached) cached = fetchMcGStyle();
  return cached;
}

async function fetchMcGStyle(): Promise<StyleSpecification | string> {
  try {
    const res = await fetch(OPENFREE_LIGHT);
    if (!res.ok) return CARTO_FALLBACK;
    const style = (await res.json()) as StyleSpecification;
    applyGreenLight(style);
    return style;
  } catch {
    return CARTO_FALLBACK;
  }
}

function applyGreenLight(style: StyleSpecification): void {
  const set = (id: string, paint: Record<string, unknown>) => {
    const layer = style.layers?.find((l) => "id" in l && l.id === id);
    if (!layer || !("paint" in layer) || !layer.paint) return;
    Object.assign(layer.paint, paint);
  };

  set("background", { "background-color": "#fbfbfa" });
  set("water", { "fill-color": "#dcebf5" });
  set("waterway", { "line-color": "#c9dde8" });
  set("landuse_residential", { "fill-color": "#f0f1f2" });
  set("landuse_park", { "fill-color": "#e7f5ec" });
  set("landcover_wood", { "fill-color": "#e3efe6" });
  set("building", {
    "fill-color": "#e9ebec",
    "fill-outline-color": "rgba(23, 25, 27, 0.08)",
  });
  set("highway_path", { "line-color": "#f4f5f6" });
  set("highway_minor", { "line-color": ROAD.minor });
  set("highway_major_inner", { "line-color": ROAD.major });
  set("highway_major_subtle", { "line-color": ROAD.major });
  set("highway_major_casing", { "line-color": ROAD.casing });
  set("highway_motorway_inner", { "line-color": ROAD.motorway });
  set("highway_motorway_subtle", { "line-color": ROAD.motorway });
  set("highway_motorway_casing", { "line-color": ROAD.casing });
  set("boundary_state", { "line-color": "rgba(23, 25, 27, 0.12)" });
  set("boundary_country_z0-4", { "line-color": "rgba(23, 25, 27, 0.18)" });
  set("boundary_country_z5-", { "line-color": "rgba(23, 25, 27, 0.18)" });

  for (const layer of style.layers ?? []) {
    if (layer.type !== "symbol" || !("paint" in layer) || !layer.paint) continue;
    const paint = layer.paint as Record<string, unknown>;
    if ("text-color" in paint) paint["text-color"] = "#6b737a";
    if ("text-halo-color" in paint) paint["text-halo-color"] = "#ffffff";
  }
}
