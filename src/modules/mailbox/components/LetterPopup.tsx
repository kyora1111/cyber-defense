import { useEffect, useState, type ReactNode } from "react";
import { type MailboxLetter } from "@idosgames/core";
import { type FeatureRegistry } from "@idosgames/module-sdk";
import { useIDosGamesClient } from "@idosgames/react";
import {
  Button,
  ConfirmPopup,
  grantedBy,
  grantLines,
  Icon,
  outlined,
  panel,
  Popup,
  ResourceList,
  Timer,
  useCelebrate,
  useNow,
  useToast,
  useUiKit,
  v,
} from "@idosgames/react/ui";
import { letterState, letterText } from "../model";
import { builtInText, t } from "../i18n";
import { words } from "../helpers";

export function LetterPopup({
  letter,
  features,
  onClose,
  onRead,
  onChanged,
}: {
  letter: MailboxLetter;
  features: FeatureRegistry;
  onClose: () => void;
  onRead: (id: string, readAt: string) => void;
  onChanged: () => Promise<void>;
}): ReactNode {
  const client = useIDosGamesClient();
  const toast = useToast();
  const celebrate = useCelebrate();
  const kit = useUiKit();
  const now = useNow(30_000);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<"decline" | null>(null);
  const [claimedNow, setClaimedNow] = useState(false);
  const text = letterText(letter, builtInText);
  const reward = grantLines(letter.Rewards);
  const state = claimedNow ? "claimed" : letterState(letter, now);

  // Opening a letter reads it — once, and only an unread one.
  useEffect(() => {
    if (letter.ReadAt) return;
    void client.mailbox.readMessages([letter.MessageID]).then((r) => {
      if (r.ok) onRead(letter.MessageID, new Date().toISOString());
    });
  }, [letter.MessageID]);

  const claim = async () => {
    setBusy(true);
    const res = await client.mailbox.claimReward(letter.MessageID);
    setBusy(false);
    if (!res.ok) return toast(words(res.error), "error");
    kit.play("claim");
    const got = grantedBy(res.data);
    celebrate(got.length > 0 ? got : reward);
    setClaimedNow(true);
    await onChanged();
  };
  const remove = async (force: boolean) => {
    const res = await client.mailbox.deleteMessages([letter.MessageID], {
      force,
    });
    if (!res.ok) {
      toast(words(res.error), "error");
      return false;
    }
    toast(force ? t("declined") : t("deleted"));
    await onChanged();
    onClose();
  };
  const link = letter.Link;
  const follow = () => {
    if (link?.FeatureID) {
      onClose();
      features.open(link.FeatureID, link.Args ?? undefined);
    } else if (link?.Url && /^https:\/\//i.test(link.Url)) {
      window.open(link.Url, "_blank", "noopener,noreferrer");
    }
  };
  const canFollow =
    (!!link?.FeatureID && !!features.get(link.FeatureID)?.available) ||
    (!!link?.Url && /^https:\/\//i.test(link.Url));

  return (
    <Popup title={text.subject || t("title")} onClose={onClose} width={440}>
      {letter.Banner && /^https?:/i.test(letter.Banner) ? (
        <img
          src={letter.Banner}
          alt=""
          style={{
            width: "100%",
            borderRadius: 10,
            objectFit: "cover",
            maxHeight: 180,
          }}
        />
      ) : null}
      {letter.SenderName ? (
        <div style={{ ...outlined, fontSize: 12, color: v.textDim }}>
          {t("from")}: {letter.SenderName} ·{" "}
          {new Date(letter.SentAt).toLocaleString()}
        </div>
      ) : null}
      {text.body ? (
        <div
          style={{
            ...outlined,
            fontSize: 14,
            whiteSpace: "pre-wrap",
            lineHeight: 1.4,
          }}
        >
          {text.body}
        </div>
      ) : null}
      {letter.SenderNote ? (
        <div
          style={{
            ...panel,
            padding: 10,
            ...outlined,
            fontSize: 13,
            fontStyle: "italic",
          }}
        >
          «{letter.SenderNote}»
        </div>
      ) : null}
      {reward.length > 0 ? (
        <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
          <ResourceList lines={reward} size={34} gap={12} />
          {state === "claimable" && letter.ExpiresAt ? (
            <Timer at={letter.ExpiresAt} now={now} label={t("expiresIn")} />
          ) : null}
        </div>
      ) : null}
      <div style={{ display: "grid", gap: 8 }}>
        {state === "claimable" ? (
          <Button tone="green" attract busy={busy} onClick={() => void claim()}>
            {t("claim")}
          </Button>
        ) : state === "claimed" ? (
          <div style={{ ...outlined, textAlign: "center", color: v.green }}>
            <Icon glyph="check" size={18} /> {t("claimed")}
          </div>
        ) : state === "expired" ? (
          <div style={{ ...outlined, textAlign: "center", color: v.textDim }}>
            {t("expired")}
          </div>
        ) : null}
        {canFollow ? (
          <Button tone="blue" onClick={follow}>
            {link?.Label || t("open")}
          </Button>
        ) : null}
        {state === "claimable" && letter.IsTransfer ? (
          <Button tone="grey" onClick={() => setAsk("decline")}>
            {t("decline")}
          </Button>
        ) : state !== "claimable" ? (
          <Button tone="grey" size="sm" onClick={() => void remove(false)}>
            <Icon glyph="trash" size={16} /> {t("delete")}
          </Button>
        ) : null}
      </div>
      {ask ? (
        <ConfirmPopup
          title={t("decline")}
          tone="red"
          onClose={() => setAsk(null)}
          onConfirm={() => remove(true)}
        >
          <div style={{ ...outlined, fontSize: 14, textAlign: "center" }}>
            {t("declineAsk")}
          </div>
        </ConfirmPopup>
      ) : null}
    </Popup>
  );
}

// ── Gifts ──────────────────────────────────────────────────────────────────
