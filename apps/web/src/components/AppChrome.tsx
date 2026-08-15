"use client";

import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { SafetyBanner } from "./SafetyBanner";
import { PageMotion } from "./PageMotion";
import { LocaleToggle } from "./LocaleToggle";
import { useLocale } from "@/lib/i18n/locale";
import styles from "./AppChrome.module.css";

type Props = {
  children: React.ReactNode;
  showSafety?: boolean;
  bare?: boolean;
  title?: string;
};

export function AppChrome({
  children,
  showSafety = true,
  bare = false,
  title,
}: Props) {
  const { t } = useLocale();
  const hideTitle =
    !title ||
    title === t.nav.vehicle ||
    title === t.nav.admin ||
    title === "Vehicle" ||
    title === "Admin";

  return (
    <div className={`${styles.shell} ${bare ? styles.bare : ""}`}>
      {!bare ? (
        <header className={styles.header}>
          <Link href="/" className={styles.home}>
            <BrandMark size="nav" />
          </Link>
          {!hideTitle ? <span className={styles.title}>{title}</span> : null}
          <nav className={styles.nav}>
            <Link href="/vehicle">{t.nav.vehicle}</Link>
            <Link href="/admin">{t.nav.admin}</Link>
            <LocaleToggle />
          </nav>
        </header>
      ) : null}
      {showSafety ? (
        <div className={styles.safety}>
          <SafetyBanner />
        </div>
      ) : null}
      <main className={styles.main}>
        <PageMotion>{children}</PageMotion>
      </main>
    </div>
  );
}
