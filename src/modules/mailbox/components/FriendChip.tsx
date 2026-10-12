import { type ReactNode } from "react";
import { Icon, outlined, panel, v } from "@idosgames/react/ui";
import { type Friend, friendName } from "../helpers";

export function FriendChip({
  friend,
  selected,
  done,
  onClick,
}: {
  friend: Friend;
  selected: boolean;
  done?: boolean;
  onClick?: () => void;
}): ReactNode {
  return (
    <div
      onClick={done ? undefined : onClick}
      className={done ? undefined : "idos-press"}
      style={{
        ...panel,
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: done ? "default" : "pointer",
        border: selected ? `2px solid ${v.gold}` : panel.border,
        opacity: done ? 0.55 : 1,
      }}
    >
      {friend.PublicData?.AvatarUrl ? (
        <img
          src={friend.PublicData.AvatarUrl}
          alt=""
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            objectFit: "cover",
          }}
        />
      ) : (
        <Icon glyph="user" size={26} />
      )}
      <span
        style={{
          ...outlined,
          fontSize: 14,
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {friendName(friend)}
      </span>
      {done ? (
        <Icon glyph="check" size={18} />
      ) : selected ? (
        <Icon glyph="gift" size={18} />
      ) : null}
    </div>
  );
}
