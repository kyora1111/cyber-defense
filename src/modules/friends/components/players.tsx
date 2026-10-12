import { useState, type ReactNode } from "react";
import { type FeatureRegistry } from "@idosgames/module-sdk";
import { useIDosGamesClient } from "@idosgames/react";
import {
  Button,
  ConfirmPopup,
  errorText,
  formatAmount,
  Icon,
  outlined,
  panel,
  Popup,
  useStagger,
  useToast,
  v,
} from "@idosgames/react/ui";
import { canRemove, displayName, initial, type ProfileView } from "../model";
import { t } from "../i18n";

function Avatar({
  player,
  size = 44,
}: {
  player: ProfileView;
  size?: number;
}): ReactNode {
  const url = player.PublicData?.AvatarUrl;
  return (
    <div
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        borderRadius: "50%",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        background: `linear-gradient(180deg, ${v.blue}, ${v.blueDeep})`,
        border: `2px solid color-mix(in srgb, ${v.text} 60%, transparent)`,
        ...outlined,
        fontSize: size * 0.42,
      }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        initial(player)
      )}
    </div>
  );
}

export function PlayerRow({
  player,
  index,
  onPick,
  right,
}: {
  player: ProfileView;
  index: number;
  onPick?: (p: ProfileView) => void;
  right?: ReactNode;
}): ReactNode {
  const stagger = useStagger();
  return (
    <div
      onClick={onPick ? () => onPick(player) : undefined}
      style={{
        ...panel,
        padding: 10,
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: onPick ? "pointer" : undefined,
        ...stagger(index),
      }}
    >
      <Avatar player={player} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...outlined,
            fontSize: 15,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayName(player)}
        </div>
        <div style={{ ...outlined, fontSize: 12, color: v.textDim }}>
          {player.PublicData?.Level
            ? `${t("level")} ${player.PublicData.Level}`
            : ""}
          {player.PublicData?.Power
            ? ` · ${t("power")} ${formatAmount(player.PublicData.Power)}`
            : ""}
          {player.Source === "Platform" ? ` · ${t("platformFriend")}` : ""}
        </div>
      </div>
      {right}
    </div>
  );
}

export function PlayerCard({
  player,
  features,
  onClose,
  onChange,
}: {
  player: ProfileView;
  features: FeatureRegistry;
  onClose: () => void;
  onChange: () => void;
}): ReactNode {
  const client = useIDosGamesClient();
  const toast = useToast();
  const [ask, setAsk] = useState<"remove" | "block" | null>(null);
  const hasChat = !!features.get("chat");
  const hasMail = !!features.get("mailbox")?.available;
  const isFriend =
    !!player.Source ||
    (
      client.data.user.state?.Social?.Accepted as
        Array<{ UserID?: string }> | undefined
    )?.some((f) => f.UserID === player.UserID);
  return (
    <Popup title={displayName(player)} onClose={onClose} width={400}>
      <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
        <Avatar player={player} size={84} />
        <div
          style={{
            ...outlined,
            fontSize: 13,
            color: v.textDim,
            textAlign: "center",
          }}
        >
          {player.PublicData?.Level
            ? `${t("level")} ${player.PublicData.Level}`
            : ""}
          {player.PublicData?.Power
            ? ` · ${t("power")} ${formatAmount(player.PublicData.Power)}`
            : ""}
        </div>
        <div
          style={{ fontFamily: "monospace", fontSize: 11, color: v.textDim }}
        >
          {player.UserID}
        </div>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {hasChat && isFriend ? (
          <Button
            tone="blue"
            onClick={() => {
              // The chat opens in its own window — the card must not stay on top of it.
              onClose();
              features.open("chat", { userID: player.UserID });
            }}
          >
            <Icon glyph="chat" size={18} /> {t("message")}
          </Button>
        ) : null}
        {hasMail && isFriend ? (
          <Button
            tone="gold"
            onClick={() => {
              // Gifts and transfers live in the mailbox — it opens straight on this friend.
              onClose();
              features.open("mailbox", {
                friendUserID: player.UserID,
                friendName: displayName(player),
              });
            }}
          >
            <Icon glyph="gift" size={18} /> {t("gift")}
          </Button>
        ) : null}
        {isFriend && canRemove(player) ? (
          <Button tone="grey" onClick={() => setAsk("remove")}>
            {t("remove")}
          </Button>
        ) : null}
        <Button tone="red" onClick={() => setAsk("block")}>
          {t("block")}
        </Button>
      </div>
      {ask ? (
        <ConfirmPopup
          title={ask === "remove" ? t("remove") : t("block")}
          tone="red"
          onClose={() => setAsk(null)}
          onConfirm={async () => {
            const res =
              ask === "remove"
                ? await client.social.removeFriend(player.UserID)
                : await client.social.block("User", player.UserID);
            if (!res.ok) {
              toast(errorText(res.error), "error");
              return false;
            }
            if (ask === "block") toast(t("blocked"));
            onChange();
            onClose();
          }}
        >
          <div style={{ ...outlined, fontSize: 14, textAlign: "center" }}>
            {ask === "remove" ? t("removeAsk") : t("blockAsk")}
          </div>
        </ConfirmPopup>
      ) : null}
    </Popup>
  );
}
