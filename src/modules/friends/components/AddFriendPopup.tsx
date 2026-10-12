import { useState, type ReactNode } from "react";
import { useIDosGamesClient } from "@idosgames/react";
import {
  Button,
  errorText,
  outlined,
  Popup,
  TextInput,
  useToast,
  useUiKit,
  v,
} from "@idosgames/react/ui";
import { cleanUserID } from "../model";
import { t } from "../i18n";

export function AddFriendPopup({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: () => void;
}): ReactNode {
  const client = useIDosGamesClient();
  const toast = useToast();
  const kit = useUiKit();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const id = cleanUserID(value, client.auth.context?.userID);
  const send = async () => {
    if (!id) return;
    setBusy(true);
    const res = await client.social.sendFriendRequest(id);
    setBusy(false);
    if (!res.ok) return toast(errorText(res.error), "error");
    kit.play("notify");
    toast(t("sent"));
    onSent();
    onClose();
  };
  return (
    <Popup title={t("addFriend")} onClose={onClose} width={400}>
      <div style={{ display: "grid", gap: 10 }}>
        <TextInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("playerID")}
          autoFocus
          style={{ fontFamily: "monospace" }}
          onKeyDown={(e) => e.key === "Enter" && void send()}
        />
        {value && !id ? (
          <div style={{ ...outlined, fontSize: 12, color: v.red }}>
            {t("badID")}
          </div>
        ) : null}
        <Button
          tone="green"
          disabled={!id}
          busy={busy}
          onClick={() => void send()}
        >
          {t("send")}
        </Button>
      </div>
    </Popup>
  );
}
