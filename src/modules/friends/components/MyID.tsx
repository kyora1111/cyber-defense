import { type ReactNode } from "react";
import { useIDosGamesClient } from "@idosgames/react";
import {
  Button,
  Icon,
  outlined,
  panel,
  useToast,
  v,
} from "@idosgames/react/ui";
import { t } from "../i18n";

export function MyID(): ReactNode {
  const client = useIDosGamesClient();
  const toast = useToast();
  const id = client.auth.context?.userID ?? "";
  const copy = () =>
    void navigator.clipboard?.writeText(id).then(() => toast(t("copied")));
  return (
    <div
      style={{
        ...panel,
        padding: 10,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ ...outlined, fontSize: 12, color: v.textDim }}>
        {t("yourID")}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "monospace",
          fontSize: 13,
        }}
      >
        {id}
      </span>
      <Button size="sm" tone="blue" onClick={copy}>
        <Icon glyph="copy" size={16} />
      </Button>
    </div>
  );
}
