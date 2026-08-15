"use client";

import { useLocale } from "@/lib/i18n/locale";
import ui from "@/styles/ui.module.css";

export function SocialProof() {
  const { t } = useLocale();
  const quotes = [
    { text: t.social.q1, src: t.social.s1 },
    { text: t.social.q2, src: t.social.s2 },
    { text: t.social.q3, src: t.social.s3 },
  ];
  return (
    <aside className={ui.socialProof} aria-label={t.social.label}>
      {quotes.map((q) => (
        <figure key={q.src}>
          <blockquote>{q.text}</blockquote>
          <figcaption>{q.src}</figcaption>
        </figure>
      ))}
    </aside>
  );
}
