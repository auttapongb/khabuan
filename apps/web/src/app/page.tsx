"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ChatTeardrop,
  EnvelopeSimple,
  FlagCheckered,
  MapTrifold,
} from "@phosphor-icons/react";
import { BrandMark } from "@/components/BrandMark";
import { LocaleToggle } from "@/components/LocaleToggle";
import { SafetyBanner } from "@/components/SafetyBanner";
import { SocialProof } from "@/components/SocialProof";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/lib/i18n/locale";
import ui from "@/styles/ui.module.css";

export default function LandingPage() {
  const router = useRouter();
  const { ready, demoLogin, user, isDemo } = useAuth();
  const { t } = useLocale();

  const ritual = [
    { icon: EnvelopeSimple, title: t.ritual.invite, copy: t.ritual.inviteCopy },
    { icon: ChatTeardrop, title: t.ritual.ask, copy: t.ritual.askCopy },
    { icon: MapTrifold, title: t.ritual.convoy, copy: t.ritual.convoyCopy },
    { icon: FlagCheckered, title: t.ritual.arrive, copy: t.ritual.arriveCopy },
  ];

  const enter = async (role: "organizer" | "member") => {
    await demoLogin(role);
    if (role === "organizer") router.push("/trips/new");
    else router.push("/invite/demo-invite-mcg");
  };

  return (
    <div className={ui.heroLanding}>
      <div className={ui.landingLang}>
        <LocaleToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <BrandMark size="hero" subtitle={t.brand.subtitle} />
      </motion.div>
      <motion.div
        className={ui.heroCopy}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.45 }}
      >
        <SafetyBanner />
        <p className={ui.lede}>{t.brand.lede}</p>
        <SocialProof />
        <div className={ui.ritual} aria-label={t.ritual.label}>
          {ritual.map(({ icon: Icon, title, copy }) => (
            <div key={title} className={ui.ritualItem}>
              <Icon className={ui.ritualIcon} size={20} weight="duotone" />
              <strong>{title}</strong>
              <span>{copy}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <div className={ui.ctaGroup}>
        {!ready ? (
          <p className={ui.note}>{t.cta.preparing}</p>
        ) : user && !isDemo ? (
          <button
            type="button"
            className={ui.btnPrimary}
            onClick={() => router.push("/trips/new")}
          >
            {t.cta.continueAs} {user.displayName}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={ui.btnPrimary}
              onClick={() => enter("organizer")}
            >
              {t.cta.organizer}
            </button>
            <button
              type="button"
              className={ui.btnGhost}
              onClick={() => enter("member")}
            >
              {t.cta.member}
            </button>
          </>
        )}
        <p className={ui.note}>{t.brand.demoNote}</p>
      </div>
    </div>
  );
}
