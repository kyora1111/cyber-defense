import {
  type ModuleContext,
  type FeatureRegistry,
  type FeatureScreenProps,
} from "@idosgames/module-sdk";
import { useState, type ReactNode } from "react";
import { useIDosGamesClient, useUserState } from "@idosgames/react";
import { Button, Icon, Tabs } from "@idosgames/react/ui";
import { friendsBadge, type ProfileView } from "./model";
import { t } from "./i18n";
import { AddFriendPopup } from "./components/AddFriendPopup";
import { Inbox } from "./components/Inbox";
import { MyID } from "./components/MyID";
import { FriendList, Requests, Suggested } from "./components/lists";
import { PlayerCard } from "./components/players";

// Friends (Unity Runtime/UI/Friends): the friends list, requests (incoming and sent), suggestions
// and the notification inbox as tabs. A player card, adding by ID and the confirmations are popups.
// In "friends from idosgames.com only" mode the requests, suggestions and "Add" disappear.

type Tab = "friends" | "requests" | "suggested" | "inbox";

/** Keeps the badge: incoming requests (sent with the player state) + unread notifications. */
export function watchFriends(ctx: ModuleContext): void {
  const { client, features } = ctx;
  ctx.effect(() => {
    // Subscribed directly, not keyed on the state object: the cache patches the social counters in
    // place, and an effect that does not re-run leaves the badge lit after a request is answered.
    let unread = 0;
    const update = () =>
      features.setBadge(
        "friends",
        friendsBadge(
          client.data.user.state?.Social as
            { IncomingCount?: number } | undefined,
          unread,
        ),
      );
    const setUnread = (n: number) => {
      unread = n;
      update();
    };
    const load = () =>
      void client.social
        .getInboxUnread()
        .then((r) => r.ok && setUnread(Number(r.data.UnreadCount ?? 0)));
    update();
    ctx.every(5 * 60_000, load);
    const offs = [
      client.on("social:inboxBadge", (r) =>
        setUnread(Number(r.UnreadCount ?? 0)),
      ),
      client.on("user:anyUpdated", update),
    ];
    return () => {
      for (const off of offs) off();
    };
  });
}

export function makeFriendsScreen(features: FeatureRegistry) {
  return function FriendsScreen(_: FeatureScreenProps): ReactNode {
    const client = useIDosGamesClient();
    const state = useUserState();
    const [tab, setTab] = useState<Tab>("friends");
    const [adding, setAdding] = useState(false);
    const [card, setCard] = useState<ProfileView | null>(null);
    const [version, setVersion] = useState(0);
    const requestsAllowed = client.social.friendRequestsAllowed();
    const incoming = Number(
      (state?.Social as { IncomingCount?: number } | undefined)
        ?.IncomingCount ?? 0,
    );
    const refresh = () => setVersion((n) => n + 1);
    const tabs: Array<{ id: Tab; label: string; badge?: number }> = [
      { id: "friends", label: t("friends") },
      ...(requestsAllowed
        ? [
            { id: "requests" as const, label: t("requests"), badge: incoming },
            { id: "suggested" as const, label: t("suggested") },
          ]
        : []),
      { id: "inbox", label: t("inbox") },
    ];
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 12,
        }}
      >
        <MyID />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Tabs tabs={tabs} value={tab} onChange={setTab} />
          </div>
          {requestsAllowed ? (
            <Button
              tone="gold"
              size="sm"
              onClick={() => setAdding(true)}
              data-tutorial-anchor="friends:add"
            >
              <Icon glyph="plus" size={16} /> {t("add")}
            </Button>
          ) : null}
        </div>
        <div key={`${tab}:${version}`}>
          {tab === "friends" ? <FriendList onPick={setCard} /> : null}
          {tab === "requests" ? (
            <Requests onChange={refresh} onPick={setCard} />
          ) : null}
          {tab === "suggested" ? <Suggested onPick={setCard} /> : null}
          {tab === "inbox" ? <Inbox /> : null}
        </div>
        {adding ? (
          <AddFriendPopup onClose={() => setAdding(false)} onSent={refresh} />
        ) : null}
        {card ? (
          <PlayerCard
            player={card}
            features={features}
            onClose={() => setCard(null)}
            onChange={refresh}
          />
        ) : null}
      </div>
    );
  };
}
