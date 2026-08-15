"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MlMap, Marker } from "maplibre-gl";
import * as turf from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LatLng, ParticipantLocation } from "@/lib/types";
import { freshnessLabel } from "@/lib/geo";
import { isPlottable } from "@/lib/roster";
import { loadMcGMapStyle } from "@/lib/map-style";
import styles from "./ConvoyMap.module.css";

type Trail = { id: string; path: LatLng[] };

type Props = {
  destination: LatLng;
  destinationLabel?: string;
  participants: ParticipantLocation[];
  selfId?: string;
  geofenceMeters?: number;
  trails?: Trail[];
  recenterLabel?: string;
};

export function ConvoyMap({
  destination,
  destinationLabel,
  participants,
  selfId,
  geofenceMeters = 150,
  trails = [],
  recenterLabel = "Recenter",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<globalThis.Map<string, Marker>>(
    new globalThis.Map(),
  );
  const fittedKey = useRef("");
  const [ready, setReady] = useState(false);
  const destKey = `${destination.lat},${destination.lng}`;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    const container = containerRef.current;

    void loadMcGMapStyle().then((style) => {
      if (cancelled || !container) return;
      const map = new maplibregl.Map({
        container,
        style,
        center: [destination.lng, destination.lat],
        zoom: 13,
        attributionControl: false,
      });
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-left",
      );
      map.on("load", () => {
        addOverlayLayers(map, destination, geofenceMeters, trails);
        setReady(true);
      });
      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Destination identity is enough; overlays update in the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map?.isStyleLoaded()) return;
    upsertOverlay(map, destination, geofenceMeters, trails);
  }, [destination, geofenceMeters, trails, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const seen = new Set<string>();
    seen.add("dest");

    let dest = markersRef.current.get("dest");
    if (!dest) {
      const destEl = document.createElement("div");
      destEl.className = styles.destMarker;
      destEl.title = destinationLabel || "Destination";
      dest = new maplibregl.Marker({ element: destEl })
        .setLngLat([destination.lng, destination.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 16 }).setText(
            destinationLabel || "Destination",
          ),
        )
        .addTo(map);
      markersRef.current.set("dest", dest);
    } else {
      dest.setLngLat([destination.lng, destination.lat]);
    }

    for (const p of participants) {
      if (!isPlottable(p, destination)) continue;
      seen.add(p.userId);
      const heading = Number.isFinite(p.heading) ? (p.heading as number) : 0;
      let marker = markersRef.current.get(p.userId);
      if (!marker) {
        const el = document.createElement("div");
        el.className = markerClass(p, selfId);
        el.innerHTML = markerHtml(p, heading);
        marker = new maplibregl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .addTo(map);
        markersRef.current.set(p.userId, marker);
      } else {
        marker.setLngLat([p.lng, p.lat]);
        const el = marker.getElement();
        el.className = markerClass(p, selfId);
        el.innerHTML = markerHtml(p, heading);
      }
    }

    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    const nearby = participants.filter((p) => isPlottable(p, destination));
    const fitKey = nearby.map((p) => p.userId).sort().join("|");
    if (fitKey && fitKey !== fittedKey.current) {
      fittedKey.current = fitKey;
      const bounds = new maplibregl.LngLatBounds(
        [destination.lng, destination.lat],
        [destination.lng, destination.lat],
      );
      for (const p of nearby) bounds.extend([p.lng, p.lat]);
      map.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 700 });
    }
  }, [participants, destination, destinationLabel, selfId, ready]);

  const recenter = () => {
    const map = mapRef.current;
    if (!map) return;
    const nearby = participants.filter((p) => isPlottable(p, destination));
    const bounds = new maplibregl.LngLatBounds(
      [destination.lng, destination.lat],
      [destination.lng, destination.lat],
    );
    for (const p of nearby) bounds.extend([p.lng, p.lat]);
    map.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 700 });
  };

  return (
    <>
      <div ref={containerRef} className={styles.map} role="presentation" />
      <button
        type="button"
        className={styles.recenter}
        onClick={recenter}
        aria-label="Recenter convoy"
      >
        {recenterLabel}
      </button>
    </>
  );
}

function markerClass(p: ParticipantLocation, selfId?: string): string {
  return `${styles.carMarker} ${styles[p.freshness]}${
    p.userId === selfId ? ` ${styles.self}` : ""
  }`;
}

function markerHtml(p: ParticipantLocation, heading: number): string {
  return `<span class="${styles.pinWrap}" style="transform:rotate(${heading}deg)"><span class="${styles.needle}"></span></span><span class="${styles.label}">${escapeHtml(
    p.displayName.split(" ")[0],
  )} · ${freshnessLabel(p.freshness)}</span>`;
}

function addOverlayLayers(
  map: MlMap,
  destination: LatLng,
  geofenceMeters: number,
  trails: Trail[],
): void {
  if (!map.getSource("mcg-geofence")) {
    map.addSource("mcg-geofence", {
      type: "geojson",
      data: geofenceData(destination, geofenceMeters),
    });
    map.addLayer({
      id: "mcg-geofence-fill",
      type: "fill",
      source: "mcg-geofence",
      paint: {
        "fill-color": "#d4b978",
        "fill-opacity": 0.08,
      },
    });
    map.addLayer({
      id: "mcg-geofence-line",
      type: "line",
      source: "mcg-geofence",
      paint: {
        "line-color": "#e4cfa0",
        "line-width": 1.2,
        "line-opacity": 0.55,
        "line-dasharray": [2, 2],
      },
    });
  }
  if (!map.getSource("mcg-trails")) {
    map.addSource("mcg-trails", {
      type: "geojson",
      data: trailsData(trails),
    });
    map.addLayer({
      id: "mcg-trails",
      type: "line",
      source: "mcg-trails",
      paint: {
        "line-color": "#d4b978",
        "line-width": 2,
        "line-opacity": 0.5,
      },
    });
  }
}

function upsertOverlay(
  map: MlMap,
  destination: LatLng,
  geofenceMeters: number,
  trails: Trail[],
): void {
  const fence = map.getSource("mcg-geofence") as maplibregl.GeoJSONSource | undefined;
  fence?.setData(geofenceData(destination, geofenceMeters) as never);
  const trailSrc = map.getSource("mcg-trails") as maplibregl.GeoJSONSource | undefined;
  trailSrc?.setData(trailsData(trails) as never);
}

function geofenceData(destination: LatLng, meters: number) {
  return turf.circle([destination.lng, destination.lat], meters / 1000, {
    steps: 64,
    units: "kilometers",
  });
}

function trailsData(trails: Trail[]) {
  return {
    type: "FeatureCollection" as const,
    features: trails.map((t) => ({
      type: "Feature" as const,
      properties: { id: t.id },
      geometry: {
        type: "LineString" as const,
        coordinates: t.path.map((p) => [p.lng, p.lat]),
      },
    })),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
