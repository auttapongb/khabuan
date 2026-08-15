"use client";

import { Switch } from "@base-ui/react/switch";
import styles from "./LuxurySwitch.module.css";

type Props = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
};

export function LuxurySwitch({ checked, onCheckedChange, label }: Props) {
  return (
    <label className={styles.row}>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={styles.root}
      >
        <Switch.Thumb className={styles.thumb} />
      </Switch.Root>
      <span>{label}</span>
    </label>
  );
}
