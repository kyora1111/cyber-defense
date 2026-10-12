import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { type MailboxLetter, type MailboxPendingReward } from "@idosgames/core";
import { useIDosGamesClient } from "@idosgames/react";
import {
  Button,
  type Glyph,
  grantedBy,
  grantLines,
  Icon,
  isGlyph,
  outlined,
  panel,
  ResourceList,
  Timer,
  useCelebrate,
  useToast,
  useUiKit,
  v,
} from "@idosgames/react/ui";
import { expiresSoon, letterState, letterText } from "../model";
import { builtInText, t } from "../i18n";
import { CATEGORY_GLYPH, MODULE_GLYPH, words } from "../helpers";

function LetterIcon({
  icon,
  fallback,
  size = 34,
}: {
  icon: string | null | undefined;
  fallback: Glyph;
  size?: number;
}): ReactNode {
  const glyph =
    icon && (isGlyph(icon) || !/^https?:/i.test(icon)) ? icon : null;
  if (icon && /^https?:/i.test(icon))
    return (
      <img
        src={icon}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          objectFit: "cover",
        }}
      />
    );
  return <Icon glyph={glyph ?? fallback} size={size} />;
}

export function LetterRow({
  letter,
  now,
  onOpen,
  onClaimed,
  style,
}: {
  letter: MailboxLetter;
  now: number;
  onOpen: () => void;
  onClaimed: () => Promise<void>;
  style: CSSProperties;
}): ReactNode {
  const client = useIDosGamesClient();
  const toast = useToast();
  const celebrate = useCelebrate();
  const kit = useUiKit();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const state = letterState(letter, now);
  const text = letterText(letter, builtInText);
  const unread = !letter.ReadAt;
  const reward = grantLines(letter.Rewards);

  const claim = async () => {
    setBusy(true);
    const res = await client.mailbox.claimReward(letter.MessageID);
    setBusy(false);
    if (!res.ok) return toast(words(res.error), "error");
    kit.play("claim");
    kit.fx.burst(ref.current);
    const got = grantedBy(res.data);
    celebrate(got.length > 0 ? got : reward);
    await onClaimed();
  };

  return (
    <div
      ref={ref}
      onClick={onOpen}
      className="idos-press"
      style={{
        ...panel,
        padding: 10,
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        border: state === "claimable" ? `2px solid ${v.gold}` : panel.border,
        opacity: state === "claimed" || state === "expired" ? 0.6 : 1,
        ...style,
      }}
    >
      <div style={{ position: "relative" }}>
        <LetterIcon
          icon={letter.Icon}
          fallback={CATEGORY_GLYPH[letter.Category]}
        />
        {unread ? (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 10,
              height: 10,
              borderRadius: 5,
              background: v.red,
            }}
          />
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 3 }}>
        <div
          style={{
            ...outlined,
            fontSize: 15,
            fontWeight: unread ? 800 : 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {text.subject || t("title")}
        </div>
        <div
          style={{
            ...outlined,
            fontSize: 12,
            color: v.textDim,
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {letter.SenderName ? <span>{letter.SenderName}</span> : null}
          <span>{new Date(letter.SentAt).toLocaleDateString()}</span>
          {state === "claimable" && expiresSoon(letter, now) ? (
            <Timer at={letter.ExpiresAt} now={now} label={t("expiresIn")} />
          ) : null}
        </div>
        {reward.length > 0 ? <ResourceList lines={reward} size={20} /> : null}
      </div>
      {state === "claimable" ? (
        <Button
          size="sm"
          tone="green"
          attract
          busy={busy}
          onClick={(e) => {
            e.stopPropagation();
            void claim();
          }}
        >
          {t("claim")}
        </Button>
      ) : state === "claimed" ? (
        <Icon glyph="check" size={22} />
      ) : state === "expired" ? (
        <Icon glyph="clock" size={22} />
      ) : null}
    </div>
  );
}

export function PendingRow({
  reward,
  onClaimed,
  style,
}: {
  reward: MailboxPendingReward;
  onClaimed: () => Promise<void>;
  style: CSSProperties;
}): ReactNode {
  const client = useIDosGamesClient();
  const toast = useToast();
  const celebrate = useCelebrate();
  const kit = useUiKit();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const text = letterText(reward, builtInText);
  const lines = grantLines(reward.Rewards);
  const claim = async () => {
    setBusy(true);
    const res = await client.mailbox.claimReward(reward.MessageID);
    setBusy(false);
    if (!res.ok) return toast(words(res.error), "error");
    kit.play("claim");
    kit.fx.burst(ref.current);
    const got = grantedBy(res.data);
    celebrate(got.length > 0 ? got : lines);
    await onClaimed();
  };
  return (
    <div
      ref={ref}
      style={{
        ...panel,
        padding: 10,
        display: "flex",
        alignItems: "center",
        gap: 10,
        border: `2px solid ${v.gold}`,
        ...style,
      }}
    >
      <Icon glyph={MODULE_GLYPH[reward.Module] ?? "chest"} size={34} />
      <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 3 }}>
        <div style={{ ...outlined, fontSize: 15 }}>{text.subject}</div>
        {text.body ? (
          <div style={{ ...outlined, fontSize: 12, color: v.textDim }}>
            {text.body}
          </div>
        ) : null}
        {lines.length > 0 ? <ResourceList lines={lines} size={20} /> : null}
      </div>
      <Button
        size="sm"
        tone="green"
        attract
        busy={busy}
        onClick={() => void claim()}
      >
        {t("claim")}
      </Button>
    </div>
  );
}
