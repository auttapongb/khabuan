"use client";

import { Bell, Hash, Notebook, Path } from "@phosphor-icons/react";
import { useLocale } from "@/lib/i18n/locale";
import ui from "@/styles/ui.module.css";

type Props = {
  onStatus: () => void;
  onBrief: () => void;
  onLog: () => void;
  onRemind: () => void;
};

export function RichMenu({ onStatus, onBrief, onLog, onRemind }: Props) {
  const { t } = useLocale();
  const items = [
    { icon: Hash, label: t.steward.menuStatus, onClick: onStatus },
    { icon: Path, label: t.steward.menuBrief, onClick: onBrief },
    { icon: Notebook, label: t.steward.menuLog, onClick: onLog },
    { icon: Bell, label: t.steward.menuRemind, onClick: onRemind },
  ];
  return (
    <nav className={ui.richMenu} aria-label="LINE rich menu">
      {items.map(({ icon: Icon, label, onClick }) => (
        <button type="button" key={label} onClick={onClick}>
          <Icon size={18} weight="duotone" />
          {label}
        </button>
      ))}
    </nav>
  );
}
