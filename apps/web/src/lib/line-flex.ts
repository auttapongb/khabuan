import type { Locale } from "./i18n/strings";
import type { RouteBriefing } from "./briefing";

export type FlexShareInput = {
  url: string;
  title: string;
  destination: string;
  meeting: string;
  timeLabel: string;
  briefing: RouteBriefing;
  locale: Locale;
};

type FlexText = {
  type: "text";
  text: string;
  size?: string;
  weight?: string;
  color?: string;
  wrap?: boolean;
  margin?: string;
  flex?: number;
};

type FlexBox = {
  type: "box";
  layout: "vertical" | "baseline";
  spacing?: string;
  margin?: string;
  contents: Array<FlexText | FlexBox | FlexButton>;
};

type FlexButton = {
  type: "button";
  style: "primary" | "link";
  height?: string;
  color?: string;
  action: { type: "uri"; label: string; uri: string };
};

export type FlexMessage = {
  type: "flex";
  altText: string;
  contents: {
    type: "bubble";
    size: "mega";
    header: FlexBox;
    body: FlexBox;
    footer: FlexBox;
    styles: {
      header: { backgroundColor: string };
      body: { backgroundColor: string };
      footer: { backgroundColor: string };
    };
  };
};

function brandMark(th: boolean) {
  return th ? "นำขบวน" : "KHABUAN";
}

function row(label: string, value: string): FlexBox {
  return {
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      {
        type: "text",
        text: label,
        color: "#8A8070",
        size: "sm",
        flex: 2,
        wrap: true,
      },
      {
        type: "text",
        text: value,
        color: "#F0E4C4",
        size: "sm",
        flex: 5,
        wrap: true,
      },
    ],
  };
}

/** Single bubble only — LINE shareTargetPicker rejects carousels. */
export function buildInviteFlex(input: FlexShareInput): FlexMessage {
  const th = input.locale === "th";
  const alt = th
    ? `เชิญร่วมขบวน · ${input.title}`
    : `Convoy invite · ${input.title}`;

  return {
    type: "flex",
    altText: alt,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: brandMark(th),
            color: "#D4B978",
            size: "xs",
            weight: "bold",
          },
          {
            type: "text",
            text: input.title,
            color: "#F4EFE4",
            size: "xl",
            weight: "bold",
            wrap: true,
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          row(th ? "จุดนัดพบ" : "Meet", input.meeting),
          row(th ? "จุดหมาย" : "Arrive", input.destination),
          row(th ? "เป้าถึง" : "Target", input.timeLabel),
          row(th ? "ด่าน" : "Toll", input.briefing.toll),
          {
            type: "text",
            text: th
              ? "ไม่โหลดแอป · ข้าถามแทนหัวขบวน · ไม่แข่งความเร็ว"
              : "No download. I’ll ask so the lead doesn’t have to. No racing.",
            size: "xs",
            color: "#C97A7A",
            wrap: true,
            margin: "lg",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "md",
            color: "#D4B978",
            action: {
              type: "uri",
              label: th ? "เปิดคำเชิญ" : "Open invite",
              uri: input.url,
            },
          },
        ],
      },
      styles: {
        header: { backgroundColor: "#121416" },
        body: { backgroundColor: "#0A0B0C" },
        footer: { backgroundColor: "#0A0B0C" },
      },
    },
  };
}

/** Group status — counts only. Never names who is late. */
export function buildStatusFlex(input: {
  url: string;
  title: string;
  liveCount: number;
  total: number;
  leadLive: boolean;
  locale: Locale;
}): FlexMessage {
  const th = input.locale === "th";
  return {
    type: "flex",
    altText: th
      ? `สถานะขบวน · ${input.liveCount}/${input.total} แชร์ตำแหน่ง`
      : `Convoy status · ${input.liveCount}/${input.total} sharing`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: brandMark(th),
            color: "#D4B978",
            size: "xs",
            weight: "bold",
          },
          {
            type: "text",
            text: input.title,
            color: "#F4EFE4",
            size: "xl",
            weight: "bold",
            wrap: true,
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          row(
            th ? "แชร์ตำแหน่ง" : "Sharing",
            `${input.liveCount} / ${input.total}`,
          ),
          row(
            th ? "รถนำ" : "Lead",
            input.leadLive
              ? th
                ? "ไลฟ์"
                : "Live"
              : th
                ? "ยังไม่แชร์"
                : "Not sharing",
          ),
          {
            type: "text",
            text: th
              ? "ข้าถามแทนหัวขบวน — ไม่ระบุชื่อคนมาสาย"
              : "I’ll ask so the lead doesn’t have to. No names.",
            size: "xs",
            color: "#8A8070",
            wrap: true,
            margin: "lg",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "md",
            color: "#D4B978",
            action: {
              type: "uri",
              label: th ? "เปิดแผนที่ไลฟ์" : "Open live map",
              uri: input.url,
            },
          },
        ],
      },
      styles: {
        header: { backgroundColor: "#121416" },
        body: { backgroundColor: "#0A0B0C" },
        footer: { backgroundColor: "#0A0B0C" },
      },
    },
  };
}

export function buildBriefFlex(input: {
  url: string;
  title: string;
  meeting: string;
  destination: string;
  toll: string;
  locale: Locale;
}): FlexMessage {
  const th = input.locale === "th";
  return {
    type: "flex",
    altText: th
      ? `บรีฟขบวน · ${input.title} · ${input.toll}`
      : `Convoy brief · ${input.title} · ${input.toll}`,
    contents: bubble(
      th ? "บรีฟขบวน" : "Convoy brief",
      [
        row(th ? "จุดนัดพบ" : "Meet", input.meeting),
        row(th ? "จุดหมาย" : "Arrive", input.destination),
        row(th ? "ด่าน" : "Toll", input.toll),
        note(
          th
            ? "ในกรุ๊ปพิมพ์ #ขบวน เมื่ออยากรู้สถานะ — ข้าไม่อ่านแชท"
            : "Type #ขบวน in the group for status — I don’t read chat.",
        ),
      ],
      th ? "เปิดล็อบบี้" : "Open lobby",
      input.url,
      th,
    ),
  };
}

export function buildRemindFlex(input: {
  url: string;
  title: string;
  timeLabel: string;
  locale: Locale;
}): FlexMessage {
  const th = input.locale === "th";
  return {
    type: "flex",
    altText: th
      ? `เตือนขบวน · ${input.title} · เป้าถึง ${input.timeLabel}`
      : `Convoy reminder · ${input.title} · target ${input.timeLabel}`,
    contents: bubble(
      th ? "ใกล้เป้าถึง" : "Target approaching",
      [
        row(th ? "ทริป" : "Trip", input.title),
        row(th ? "เป้าถึง" : "Target", input.timeLabel),
        note(
          th
            ? "ข้าเตือนแทนหัวขบวน — เปิดแชร์ตอนออก ไม่ต้องพิมพ์ถึงไหนแล้ว"
            : "I’ll remind so the lead doesn’t have to. Share when we roll.",
        ),
      ],
      th ? "เปิดขบวน" : "Open convoy",
      input.url,
      th,
    ),
  };
}

/** Closed-trip recap — counts only. Never names who was late. */
export function buildRecapFlex(input: {
  url: string;
  title: string;
  arrived: number;
  total: number;
  onTimePct: number;
  locale: Locale;
}): FlexMessage {
  const th = input.locale === "th";
  return {
    type: "flex",
    altText: th
      ? `สรุปขบวน · ${input.title} · ${input.arrived}/${input.total} ถึง`
      : `Convoy recap · ${input.title} · ${input.arrived}/${input.total} arrived`,
    contents: bubble(
      input.title,
      [
        row(th ? "ยืนยันถึง" : "Arrived", `${input.arrived} / ${input.total}`),
        row(th ? "ตรงเวลา" : "On time", `${input.onTimePct}%`),
        note(
          th
            ? "กรุ๊ปเงียบ ข้าถามแทน · ไม่ระบุชื่อ · ไม่แข่งความเร็ว"
            : "The group stayed quiet. I asked instead. No names. No racing.",
        ),
      ],
      th ? "ดูสรุป" : "View summary",
      input.url,
      th,
    ),
  };
}

function note(text: string): FlexText {
  return {
    type: "text",
    text,
    size: "xs",
    color: "#8A8070",
    wrap: true,
    margin: "lg",
  };
}

function bubble(
  title: string,
  body: Array<FlexText | FlexBox>,
  label: string,
  uri: string,
  th = true,
): FlexMessage["contents"] {
  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: brandMark(th),
          color: "#D4B978",
          size: "xs",
          weight: "bold",
        },
        {
          type: "text",
          text: title,
          color: "#F4EFE4",
          size: "xl",
          weight: "bold",
          wrap: true,
          margin: "sm",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: body,
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "md",
          color: "#D4B978",
          action: { type: "uri", label, uri },
        },
      ],
    },
    styles: {
      header: { backgroundColor: "#121416" },
      body: { backgroundColor: "#0A0B0C" },
      footer: { backgroundColor: "#0A0B0C" },
    },
  };
}
