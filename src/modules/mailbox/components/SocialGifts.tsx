import { useState, type ReactNode } from "react";
import {
  type MailboxDefinitions,
  type MailboxGiftStatusResponse,
} from "@idosgames/core";
import { useIDosGamesClient } from "@idosgames/react";
import {
  bundleLines,
  Button,
  Card,
  outlined,
  ResourceList,
  Timer,
  useNow,
  useToast,
  v,
} from "@idosgames/react/ui";
import { t } from "../i18n";
import { FriendChip } from "./FriendChip";
import { type Friend, words } from "../helpers";

export function SocialGifts({
  gifts,
  friends,
  status,
  initialFriend,
  onSent,
}: {
  gifts: Array<
    [
      string,
      NonNullable<NonNullable<MailboxDefinitions["Gifts"]>["Social"]>[string],
    ]
  >;
  friends: Friend[];
  status: MailboxGiftStatusResponse | null;
  initialFriend?: string;
  onSent: () => Promise<void>;
}): ReactNode {
  const client = useIDosGamesClient();
  const toast = useToast();
  const [giftID, setGiftID] = useState(gifts[0]?.[0] ?? "");
  const [picked, setPicked] = useState<Set<string>>(
    () =>
      new Set(
        initialFriend && friends.some((f) => f.UserID === initialFriend)
          ? [initialFriend]
          : [],
      ),
  );
  const [busy, setBusy] = useState(false);
  const now = useNow(30_000);
  const mine = status?.Social?.[giftID];
  const sentTo = new Set(mine?.SentTo ?? []);
  const open = friends.filter((f) => !sentTo.has(f.UserID));
  const gift = gifts.find(([id]) => id === giftID)?.[1];
  const price = bundleLines(gift?.Cost);

  const send = async (ids: string[]) => {
    if (ids.length === 0) return;
    setBusy(true);
    const res = await client.mailbox.sendGift(giftID, ids);
    setBusy(false);
    if (!res.ok) return toast(words(res.error), "error");
    if (res.data.Sent.length > 0) toast(t("giftSent"), "success");
    if (res.data.Failed.length > 0)
      toast(`${t("someFailed")}: ${words(res.data.Failed[0]?.Error)}`, "error");
    setPicked(new Set());
    await onSent();
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          ...outlined,
          fontSize: 13,
          color: v.textDim,
          textAlign: "center",
        }}
      >
        {t("giftHint")}
      </div>
      {gifts.length > 1 ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {gifts.map(([id, g]) => (
            <Card
              key={id}
              highlight={id === giftID}
              onClick={() => {
                setGiftID(id);
                setPicked(new Set());
              }}
              style={{ padding: 8 }}
            >
              <ResourceList lines={bundleLines(g?.Grant)} size={24} />
            </Card>
          ))}
        </div>
      ) : gift ? (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ResourceList lines={bundleLines(gift.Grant)} size={30} gap={12} />
        </div>
      ) : null}
      {price.length > 0 ? (
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            justifyContent: "center",
            ...outlined,
            fontSize: 12,
          }}
        >
          {t("pricePerFriend")}: <ResourceList lines={price} size={18} />
        </div>
      ) : null}
      {mine ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            ...outlined,
            fontSize: 12,
            color: v.textDim,
          }}
        >
          <span>
            {t("leftInPeriod")}: {mine.RemainingInPeriod}
          </span>
          <Timer at={mine.ResetsAt} now={now} label={t("resetsIn")} />
        </div>
      ) : null}
      <div
        style={{ display: "grid", gap: 6, maxHeight: 280, overflowY: "auto" }}
      >
        {friends.map((f) => (
          <FriendChip
            key={f.UserID}
            friend={f}
            done={sentTo.has(f.UserID)}
            selected={picked.has(f.UserID)}
            onClick={() =>
              setPicked((s) => {
                const next = new Set(s);
                if (next.has(f.UserID)) next.delete(f.UserID);
                else next.add(f.UserID);
                return next;
              })
            }
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          tone="green"
          busy={busy}
          disabled={picked.size === 0}
          onClick={() => void send([...picked])}
          style={{ flex: 1 }}
        >
          {t("sendTo")}
          {picked.size > 0 ? ` · ${picked.size}` : ""}
        </Button>
        <Button
          tone="gold"
          attract={open.length > 0}
          busy={busy}
          disabled={open.length === 0}
          onClick={() => void send(open.map((f) => f.UserID))}
          style={{ flex: 1 }}
        >
          {t("toEveryone")}
        </Button>
      </div>
    </div>
  );
}
