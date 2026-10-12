import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  type MailboxDefinitions,
  type MailboxGiftStatusResponse,
} from "@idosgames/core";
import { useIDosGamesClient } from "@idosgames/react";
import { Center, EmptyState, Popup, Spinner, Tabs } from "@idosgames/react/ui";
import { t } from "../i18n";
import { SocialGifts } from "./SocialGifts";
import { Transfer } from "./Transfer";
import { type Friend, type MailboxArgs, friendName } from "../helpers";

export function GiftsPopup({
  defs,
  initial,
  onClose,
}: {
  defs: MailboxDefinitions;
  initial: MailboxArgs;
  onClose: () => void;
}): ReactNode {
  const client = useIDosGamesClient();
  const social = Object.entries(defs.Gifts?.Social ?? {}).filter(
    ([, g]) => g && g.Enabled !== false,
  );
  const transferOn = defs.Gifts?.Transfer?.Enabled === true;
  const [mode, setMode] = useState<"gift" | "transfer">(
    initial.mode === "transfer" && transferOn
      ? "transfer"
      : social.length > 0
        ? "gift"
        : "transfer",
  );
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [status, setStatus] = useState<MailboxGiftStatusResponse | null>(null);

  const refresh = useCallback(async () => {
    const s = await client.mailbox.getGiftStatus();
    if (s.ok) setStatus(s.data);
  }, [client]);
  useEffect(() => {
    void client.social.getFriendsList().then((r) => {
      const list = (r.ok ? (r.data.Friends ?? []) : []) as Friend[];
      setFriends(
        [...list].sort((a, b) => friendName(a).localeCompare(friendName(b))),
      );
    });
    void refresh();
  }, [client, refresh]);

  return (
    <Popup title={t("sendGifts")} onClose={onClose} width={460}>
      <Tabs<"gift" | "transfer">
        tabs={[
          ...(social.length > 0
            ? [{ id: "gift" as const, label: t("gift"), glyph: "gift" }]
            : []),
          ...(transferOn
            ? [{ id: "transfer" as const, label: t("transfer"), glyph: "bag" }]
            : []),
        ]}
        value={mode}
        onChange={setMode}
      />
      {friends === null ? (
        <Center minHeight={160}>
          <Spinner />
        </Center>
      ) : friends.length === 0 ? (
        <EmptyState glyph="friends" text={t("noFriends")} />
      ) : mode === "gift" ? (
        <SocialGifts
          gifts={social}
          friends={friends}
          status={status}
          initialFriend={initial.friendUserID}
          onSent={refresh}
        />
      ) : (
        <Transfer
          defs={defs}
          friends={friends}
          status={status}
          initialFriend={initial.friendUserID}
          onSent={refresh}
          onDone={onClose}
        />
      )}
    </Popup>
  );
}
