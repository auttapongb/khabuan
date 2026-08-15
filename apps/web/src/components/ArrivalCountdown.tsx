"use client";

import { useEffect, useState } from "react";
import NumberFlow from "@number-flow/react";
import ui from "@/styles/ui.module.css";

type Props = {
  targetIso?: string;
};

export function ArrivalCountdown({ targetIso }: Props) {
  const [parts, setParts] = useState({
    h: 0,
    m: 0,
    s: 0,
    open: !targetIso,
  });

  useEffect(() => {
    if (!targetIso) {
      setParts({ h: 0, m: 0, s: 0, open: true });
      return;
    }
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) {
        setParts({ h: 0, m: 0, s: 0, open: true });
        return;
      }
      setParts({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        open: false,
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  if (parts.open) {
    return <p className={ui.countdown}>Window open</p>;
  }

  return (
    <p className={ui.countdown} aria-live="polite">
      <NumberFlow
        value={parts.h}
        format={{ minimumIntegerDigits: 2 }}
        isolate
      />
      <span className={ui.countdownSep}>:</span>
      <NumberFlow
        value={parts.m}
        format={{ minimumIntegerDigits: 2 }}
        isolate
      />
      <span className={ui.countdownSep}>:</span>
      <NumberFlow
        value={parts.s}
        format={{ minimumIntegerDigits: 2 }}
        isolate
      />
    </p>
  );
}
