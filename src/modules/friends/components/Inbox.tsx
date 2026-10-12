import { useEffect, useState, type ReactNode } from "react";
import { useIDosGamesClient } from "@idosgames/react";
import {
  Center,
  EmptyState,
  Icon,
  outlined,
  panel,
  Spinner,
  useStagger,
  v,
} from "@idosgames/react/ui";
import { actorsText, inboxKind, type InboxKind } from "../model";
import { t } from "../i18n";

type InboxItem = {
  Id: string;
  Verb?: string | null;
  Count?: number | null;
  LastActors?: Array<{ DisplayName?: string | null } | null> | null;
  Payload?: { Title?: string | null } | null;
  OccurredAt?: string | null;
};

const VERB_TEXT: Record<InboxKind, Parameters<typeof t>[0]> = {
  attack: "vAttack",
  raid: "vRaid",
  friend: "vFriend",
  sale: "vSale",
  follow: "vFollow",
  like: "vLike",
  comment: "vComment",
  reply: "vReply",
  other: "vOther",
};

const VERB_GLYPH: Record<
  InboxKind,
  "swords" | "flame" | "friends" | "coin" | "user" | "heart" | "chat"
> = {
  attack: "swords",
  raid: "flame",
  friend: "friends",
  sale: "coin",
  follow: "user",
  like: "heart",
  comment: "chat",
  reply: "chat",
  other: "chat",
};

export function Inbox(): ReactNode {
  const client = useIDosGamesClient();
  const stagger = useStagger();
  const [items, setItems] = useState<InboxItem[] | null>(null);
  useEffect(() => {
    void client.social.getInbox({ limit: 30 }).then((r) => {
      setItems(r.ok ? ((r.data.Items ?? []) as InboxItem[]) : []);
      // Opening the news marks them seen (once, not per page).
      if (r.ok) void client.social.markInboxSeen();
    });
  }, [client]);
  if (!items)
    return (
      <Center>
        <Spinner />
      </Center>
    );
  if (items.length === 0)
    return <EmptyState glyph="bell" text={t("noInbox")} />;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((it, i) => {
        const kind = inboxKind(it.Verb);
        return (
          <div
            key={it.Id}
            style={{
              ...panel,
              padding: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              ...stagger(i),
            }}
          >
            <Icon glyph={VERB_GLYPH[kind]} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...outlined, fontSize: 14 }}>
                {actorsText(
                  it.LastActors,
                  it.Count,
                  t("someone"),
                  t("and"),
                  t("more"),
                )}{" "}
                {t(VERB_TEXT[kind])}
                {it.Payload?.Title ? ` · ${it.Payload.Title}` : ""}
              </div>
              {it.OccurredAt ? (
                <div style={{ fontSize: 11, color: v.textDim }}>
                  {new Date(it.OccurredAt).toLocaleString()}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
