import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useIDosGamesClient } from "@idosgames/react";
import {
  Button,
  Center,
  EmptyState,
  errorText,
  Icon,
  outlined,
  Spinner,
  useToast,
  useUiKit,
  v,
} from "@idosgames/react/ui";
import { sortByName, type ProfileView } from "../model";
import { t } from "../i18n";
import { PlayerRow } from "./players";

function useList(
  load: () => Promise<{
    ok: boolean;
    data?: { Friends?: ProfileView[] | null };
  }>,
): ProfileView[] | null {
  const [list, setList] = useState<ProfileView[] | null>(null);
  useEffect(() => {
    void load().then((r) =>
      setList(r.ok ? sortByName(r.data?.Friends ?? []) : []),
    );
  }, [load]);
  return list;
}

export function FriendList({
  onPick,
}: {
  onPick: (p: ProfileView) => void;
}): ReactNode {
  const client = useIDosGamesClient();
  const list = useList(
    useCallback(() => client.social.getFriendsList(), [client]),
  );
  if (!list)
    return (
      <Center>
        <Spinner />
      </Center>
    );
  if (list.length === 0)
    return <EmptyState glyph="friends" text={t("noFriends")} />;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {list.map((p, i) => (
        <PlayerRow key={p.UserID} player={p} index={i} onPick={onPick} />
      ))}
    </div>
  );
}

export function Requests({
  onChange,
  onPick,
}: {
  onChange: () => void;
  onPick: (p: ProfileView) => void;
}): ReactNode {
  const client = useIDosGamesClient();
  const toast = useToast();
  const kit = useUiKit();
  const incoming = useList(
    useCallback(() => client.social.getIncomingRequests(), [client]),
  );
  const outgoing = useList(
    useCallback(() => client.social.getOutgoingRequests(), [client]),
  );
  const [busy, setBusy] = useState<string | null>(null);
  if (!incoming || !outgoing)
    return (
      <Center>
        <Spinner />
      </Center>
    );
  if (incoming.length === 0 && outgoing.length === 0)
    return <EmptyState glyph="friends" text={t("noRequests")} />;
  const answer = async (id: string, yes: boolean) => {
    setBusy(id);
    const res = yes
      ? await client.social.acceptFriendRequest(id)
      : await client.social.declineFriendRequest(id);
    setBusy(null);
    if (!res.ok) return toast(errorText(res.error), "error");
    if (yes) kit.play("claim");
    onChange();
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {incoming.length > 0 ? (
        <div style={{ ...outlined, fontSize: 13, color: v.textDim }}>
          {t("incoming")}
        </div>
      ) : null}
      {incoming.map((p, i) => (
        <PlayerRow
          key={p.UserID}
          player={p}
          index={i}
          onPick={onPick}
          right={
            <div
              style={{ display: "flex", gap: 6 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="sm"
                tone="green"
                busy={busy === p.UserID}
                onClick={() => void answer(p.UserID, true)}
                data-tutorial-anchor="friends:accept"
              >
                {t("accept")}
              </Button>
              <Button
                size="sm"
                tone="grey"
                disabled={busy === p.UserID}
                onClick={() => void answer(p.UserID, false)}
              >
                ✕
              </Button>
            </div>
          }
        />
      ))}
      {outgoing.length > 0 ? (
        <div style={{ ...outlined, fontSize: 13, color: v.textDim }}>
          {t("outgoing")}
        </div>
      ) : null}
      {outgoing.map((p, i) => (
        <PlayerRow
          key={p.UserID}
          player={p}
          index={incoming.length + i}
          onPick={onPick}
          right={<Icon glyph="clock" size={20} />}
        />
      ))}
    </div>
  );
}

export function Suggested({
  onPick,
}: {
  onPick: (p: ProfileView) => void;
}): ReactNode {
  const client = useIDosGamesClient();
  const toast = useToast();
  const list = useList(
    useCallback(() => client.social.getRecommendedFriends(10), [client]),
  );
  const [sent, setSent] = useState<Set<string>>(new Set());
  if (!list)
    return (
      <Center>
        <Spinner />
      </Center>
    );
  if (list.length === 0)
    return <EmptyState glyph="friends" text={t("noSuggestions")} />;
  const add = async (id: string) => {
    const res = await client.social.sendFriendRequest(id);
    if (!res.ok) return toast(errorText(res.error), "error");
    setSent((s) => new Set(s).add(id));
    toast(t("sent"));
  };
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {list.map((p, i) => (
        <PlayerRow
          key={p.UserID}
          player={p}
          index={i}
          onPick={onPick}
          right={
            <span onClick={(e) => e.stopPropagation()}>
              {sent.has(p.UserID) ? (
                <Icon glyph="check" size={22} />
              ) : (
                <Button
                  size="sm"
                  tone="green"
                  onClick={() => void add(p.UserID)}
                >
                  {t("add")}
                </Button>
              )}
            </span>
          }
        />
      ))}
    </div>
  );
}
