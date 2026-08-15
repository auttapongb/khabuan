"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { FloppyDisk } from "@phosphor-icons/react";
import { AppChrome } from "@/components/AppChrome";
import { VehicleSilhouette } from "@/components/VehicleSilhouette";
import { listVehicles, saveVehicle } from "@/lib/api";
import { tapHaptic } from "@/lib/haptic";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/lib/i18n/locale";
import type {
  Vehicle,
  VehicleClass,
  VehicleColor,
  VehicleIcon,
} from "@/lib/types";
import ui from "@/styles/ui.module.css";
import styles from "./vehicle.module.css";

const ICONS: { id: VehicleIcon; label: string }[] = [
  { id: "silhouette-coupe", label: "Coupe" },
  { id: "silhouette-sedan", label: "Sedan" },
  { id: "silhouette-suv", label: "SUV" },
  { id: "silhouette-gt", label: "GT" },
];

const COLORS: { id: VehicleColor; hex: string; label: string }[] = [
  { id: "black", hex: "#2a2d32", label: "Black" },
  { id: "silver", hex: "#c0c5cc", label: "Silver" },
  { id: "white", hex: "#eceff3", label: "White" },
  { id: "champagne", hex: "#06c755", label: "Champagne" },
  { id: "navy", hex: "#3a4a6b", label: "Navy" },
  { id: "red", hex: "#8b3a3a", label: "Red" },
];

const CLASSES: VehicleClass[] = [
  "coupe",
  "sedan",
  "suv",
  "gt",
  "convertible",
  "other",
];

export default function VehiclePage() {
  const { user, ready, demoLogin } = useAuth();
  const { t } = useLocale();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [icon, setIcon] = useState<VehicleIcon>("silhouette-gt");
  const [color, setColor] = useState<VehicleColor>("champagne");
  const [klass, setKlass] = useState<VehicleClass>("gt");

  useEffect(() => {
    if (!ready) return;
    const boot = async () => {
      if (!user) await demoLogin("member");
      void listVehicles()
        .then(setVehicles)
        .catch(() => setVehicles([]));
    };
    void boot();
  }, [ready, user, demoLogin]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) await demoLogin("member");
    const fd = new FormData(e.currentTarget);
    const vehicle = await saveVehicle({
      nickname: String(fd.get("nickname") || "My car"),
      class: klass,
      color,
      icon,
    });
    setVehicles(await listVehicles().catch(() => [vehicle]));
    tapHaptic();
    toast.success(t.vehicle.toast);
  };

  const colorHex = COLORS.find((c) => c.id === color)?.hex || "#06c755";

  return (
    <AppChrome title={t.nav.vehicle}>
      <form className={ui.panel} onSubmit={(e) => void onSubmit(e)}>
        <section className={ui.section}>
          <h2>{t.vehicle.title}</h2>
          <p className={ui.lede}>{t.vehicle.lede}</p>
        </section>

        <div className={styles.stage}>
          <motion.div
            key={`${icon}-${color}`}
            initial={{ opacity: 0.4, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={styles.preview}
            style={{ color: colorHex }}
          >
            <VehicleSilhouette icon={icon} color={colorHex} bare />
          </motion.div>
          <p className={styles.stageMeta}>
            {klass.toUpperCase()} · {color}
          </p>
        </div>

        <div className={ui.field}>
          <label htmlFor="nickname">{t.vehicle.nickname}</label>
          <input
            id="nickname"
            name="nickname"
            required
            defaultValue="Midnight GT"
          />
        </div>

        <div className={ui.field}>
          <span className={styles.legend}>{t.vehicle.class}</span>
          <RadioGroup
            value={klass}
            onValueChange={(v) => setKlass(v as VehicleClass)}
            className={styles.chipRow}
          >
            {CLASSES.map((c) => (
              <Radio.Root key={c} value={c} className={styles.chip}>
                {c}
              </Radio.Root>
            ))}
          </RadioGroup>
        </div>

        <section className={ui.section}>
          <h2>{t.vehicle.silhouette}</h2>
          <div className={ui.row}>
            {ICONS.map((i) => (
              <VehicleSilhouette
                key={i.id}
                icon={i.id}
                color={colorHex}
                label={i.label}
                selected={icon === i.id}
                onClick={() => setIcon(i.id)}
              />
            ))}
          </div>
        </section>

        <section className={ui.section}>
          <h2>{t.vehicle.paint}</h2>
          <RadioGroup
            value={color}
            onValueChange={(v) => setColor(v as VehicleColor)}
            className={styles.swatches}
            aria-label="Paint color"
          >
            {COLORS.map((c) => (
              <Radio.Root
                key={c.id}
                value={c.id}
                className={styles.swatch}
                style={{ background: c.hex }}
                aria-label={c.label}
                title={c.label}
              />
            ))}
          </RadioGroup>
        </section>

        <button type="submit" className={ui.btnPrimary}>
          <FloppyDisk size={18} weight="bold" />
          {t.vehicle.save}
        </button>

        {vehicles.length > 0 ? (
          <section className={ui.section}>
            <h2>{t.vehicle.saved}</h2>
            <ul className={ui.list}>
              {vehicles.map((v) => (
                <li key={v.id} className={ui.listItem}>
                  <span>
                    {v.nickname} · {v.class}
                  </span>
                  <VehicleSilhouette
                    icon={v.icon}
                    color={COLORS.find((c) => c.id === v.color)?.hex}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </form>
    </AppChrome>
  );
}
