"use client";

import { motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import type { BadgeAward } from "@/lib/types";
import styles from "./BadgeChip.module.css";

type Props = {
  badge: BadgeAward;
};

export function BadgeChip({ badge }: Props) {
  return (
    <motion.article
      className={`${styles.chip} ${styles[badge.badge] || ""}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <header>
        <h3>{badge.label}</h3>
        <span>
          +<NumberFlow value={badge.points} />
        </span>
      </header>
      <p>{badge.reason}</p>
      {badge.private ? <em>Private</em> : null}
    </motion.article>
  );
}
