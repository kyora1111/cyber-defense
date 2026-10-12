import {
  type ModuleContext,
  type FeatureRegistry,
  type FeatureScreenProps,
} from "@idosgames/module-sdk";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  type MailboxDefinitions,
  type MailboxLetter,
  type MailboxPendingReward,
} from "@idosgames/core";
import { useIDosGamesClient } from "@idosgames/react";
import {
  Button,
  Center,
  configSection,
  ConfirmPopup,
  EmptyState,
  grantedBy,
  Icon,
  outlined,
  pickLanguage,
  Spinner,
  Tabs,
  useCelebrate,
  useNow,
  useStagger,
  useToast,
  v,
} from "@idosgames/react/ui";
import { claimableCount, letterState, mailBadge, mergePages } from "./model";
import { t } from "./i18n";
import { GiftsPopup } from "./components/GiftsPopup";
import { LetterPopup } from "./components/LetterPopup";
import { LetterRow, PendingRow } from "./components/LetterRows";
import { type MailboxArgs, type Tab, words } from "./helpers";

// Mailbox (Unity V2/Runtime/UI/Mailbox): letters newest first by category, a letter opened in a
// popup, "Claim" / "Claim all", missed rewards of other systems on top, and "Send gifts" — a free
// daily gift to friends and a transfer of own resources. Everything the server decides (expiry,
// limits, friendship) comes back as its codes; the screen only words them.

/** How often the badge re-reads the counters while the game is on screen. */
const MAIL_POLL_MS = 2 * 60_000;

/**
 * Badge on login, on coming back to the tab and every few minutes; mailbox actions refresh it
 * themselves.
 */
export function watchMailbox(ctx: ModuleContext): void {
  const { client, features } = ctx;
  ctx.effect(() => {
    const off = client.on("mailbox:countersChanged", (c) =>
      features.setBadge("mailbox", mailBadge(c)),
    );
    // The badge comes from the read's own answer, not only from the event: the counters usually
    // arrive WITH the login (before this watcher subscribed), and a read the central cache answers
    // emits nothing.
    const load = () =>
      void client.mailbox
        .getUnreadCount()
        .then((r) => r.ok && features.setBadge("mailbox", mailBadge(r.data)));
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    // Letters also come while the player stays in the game (a friend's gift, a leaderboard prize):
    // look now and then, or the badge waited for the next tab switch.
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, MAIL_POLL_MS);
    return () => {
      off();
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  });
}

export function makeMailboxScreen(features: FeatureRegistry) {
  return function MailboxScreen({ args }: FeatureScreenProps): ReactNode {
    const client = useIDosGamesClient();
    const defs = configSection<MailboxDefinitions>(client, "Mailbox");
    if (defs?.Enabled !== true)
      return <EmptyState glyph="gift" text={t("disabled")} />;
    return (
      <Mailbox
        features={features}
        defs={defs}
        args={(args ?? {}) as MailboxArgs}
      />
    );
  };
}

function Mailbox({
  features,
  defs,
  args,
}: {
  features: FeatureRegistry;
  defs: MailboxDefinitions;
  args: MailboxArgs;
}): ReactNode {
  const client = useIDosGamesClient();
  const toast = useToast();
  const celebrate = useCelebrate();
  const stagger = useStagger();
  const now = useNow(30_000);
  const [tab, setTab] = useState<Tab>("all");
  const [letters, setLetters] = useState<MailboxLetter[] | null>(null);
  const [pending, setPending] = useState<MailboxPendingReward[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyAll, setBusyAll] = useState(false);
  const [opened, setOpened] = useState<MailboxLetter | null>(null);
  const [askClean, setAskClean] = useState(false);
  const [gifts, setGifts] = useState<MailboxArgs | null>(
    args.friendUserID || args.mode ? args : null,
  );

  const category = tab === "all" ? undefined : tab;
  // Letters in the language the screen speaks: the game's own locale when it has localization
  // tables, else the kit's language — otherwise a Russian screen showed English letters.
  const language = client.localization.locale ?? pickLanguage();
  const load = useCallback(async () => {
    const res = await client.mailbox.getMessages({ category, language });
    if (!res.ok) {
      toast(words(res.error), "error");
      setLetters([]);
      return;
    }
    setLetters(res.data.Messages);
    setPending(res.data.PendingRewards ?? []);
    setCursor(res.data.NextCursor ?? null);
  }, [client, category, language]);
  useEffect(() => {
    setLetters(null);
    void load();
  }, [load]);

  const more = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    const res = await client.mailbox.getMessages({
      category,
      cursor,
      language,
    });
    setLoadingMore(false);
    if (!res.ok) return toast(words(res.error), "error");
    setLetters((shown) => mergePages(shown ?? [], res.data.Messages));
    setCursor(res.data.NextCursor ?? null);
  };

  const claimAll = async () => {
    setBusyAll(true);
    const res = await client.mailbox.claimAll();
    setBusyAll(false);
    if (!res.ok) return toast(words(res.error), "error");
    const got = grantedBy(res.data);
    if (got.length > 0) celebrate(got);
    if (res.data.Failed.length > 0)
      toast(words(res.data.Failed[0]?.Error), "error");
    await load();
  };

  const cleanRead = async () => {
    const res = await client.mailbox.deleteMessages("allRead");
    if (!res.ok) {
      toast(words(res.error), "error");
      return false;
    }
    toast(t("deleted"));
    await load();
  };

  const giftsOn =
    Object.values(defs.Gifts?.Social ?? {}).some(
      (g) => g && g.Enabled !== false,
    ) || defs.Gifts?.Transfer?.Enabled === true;
  const shownPending = tab === "all" || tab === "Reward" ? pending : [];
  const toClaim = letters ? claimableCount(letters, shownPending, now) : 0;
  const hasRead = (letters ?? []).some(
    (l) => l.ReadAt && letterState(l, now) !== "claimable",
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: 10,
      }}
    >
      <Tabs<Tab>
        tabs={[
          { id: "all", label: t("tabAll") },
          { id: "Reward", label: t("tabReward"), glyph: "chest" },
          { id: "Gift", label: t("tabGift"), glyph: "gift" },
          { id: "System", label: t("tabSystem"), glyph: "bell" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {toClaim > 1 ? (
          <Button
            tone="green"
            attract
            busy={busyAll}
            onClick={() => void claimAll()}
            style={{ flex: 1 }}
          >
            {t("claimAll")} · {toClaim}
          </Button>
        ) : null}
        {giftsOn ? (
          <Button
            tone="gold"
            onClick={() => setGifts({})}
            style={{ flex: 1 }}
            data-tutorial-anchor="mailbox:gifts"
          >
            <Icon glyph="gift" size={18} /> {t("sendGifts")}
          </Button>
        ) : null}
      </div>

      {letters === null ? (
        <Center>
          <Spinner />
        </Center>
      ) : (
        <>
          {shownPending.length > 0 ? (
            <div style={{ ...outlined, fontSize: 13, color: v.textDim }}>
              {t("waiting")}
            </div>
          ) : null}
          {shownPending.map((p, i) => (
            <PendingRow
              key={p.MessageID}
              reward={p}
              onClaimed={load}
              style={stagger(i)}
            />
          ))}
          {letters.length === 0 && shownPending.length === 0 ? (
            <EmptyState
              glyph="gift"
              text={tab === "all" ? t("empty") : t("emptyTab")}
            />
          ) : null}
          {letters.map((l, i) => (
            <LetterRow
              key={l.MessageID}
              letter={l}
              now={now}
              onOpen={() => setOpened(l)}
              onClaimed={load}
              style={stagger(i + shownPending.length)}
            />
          ))}
          {cursor ? (
            <Button
              tone="grey"
              size="sm"
              busy={loadingMore}
              onClick={() => void more()}
            >
              {t("more")}
            </Button>
          ) : null}
          {hasRead ? (
            <Button tone="grey" size="sm" onClick={() => setAskClean(true)}>
              <Icon glyph="trash" size={16} /> {t("deleteRead")}
            </Button>
          ) : null}
        </>
      )}

      {opened ? (
        <LetterPopup
          letter={opened}
          features={features}
          onClose={() => setOpened(null)}
          onRead={(id, readAt) =>
            setLetters((shown) =>
              (shown ?? []).map((l) =>
                l.MessageID === id ? { ...l, ReadAt: readAt } : l,
              ),
            )
          }
          onChanged={load}
        />
      ) : null}
      {askClean ? (
        <ConfirmPopup
          title={t("deleteRead")}
          tone="red"
          onClose={() => setAskClean(false)}
          onConfirm={cleanRead}
        >
          <div style={{ ...outlined, fontSize: 14, textAlign: "center" }}>
            {t("deleteReadAsk")}
          </div>
        </ConfirmPopup>
      ) : null}
      {gifts ? (
        <GiftsPopup
          defs={defs}
          initial={gifts}
          onClose={() => setGifts(null)}
        />
      ) : null}
    </div>
  );
}
