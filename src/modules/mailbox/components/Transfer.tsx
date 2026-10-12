import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  type MailboxDefinitions,
  type MailboxGiftStatusResponse,
} from "@idosgames/core";
import { useIDosGamesClient, useUserState } from "@idosgames/react";
import {
  bundleLines,
  Button,
  ConfirmPopup,
  outlined,
  panel,
  ResourceBadge,
  ResourceList,
  TextInput,
  Timer,
  useCatalog,
  useNow,
  useToast,
  v,
} from "@idosgames/react/ui";
import {
  afterFee,
  feePercent,
  newRequestID,
  transferEntries,
  transferOptions,
  type TransferInventory,
  type TransferOption,
} from "../model";
import { t } from "../i18n";
import { FriendChip } from "./FriendChip";
import { type Friend, friendName, words } from "../helpers";

export function Transfer({
  defs,
  friends,
  status,
  initialFriend,
  onSent,
  onDone,
}: {
  defs: MailboxDefinitions;
  friends: Friend[];
  status: MailboxGiftStatusResponse | null;
  initialFriend?: string;
  onSent: () => Promise<void>;
  onDone: () => void;
}): ReactNode {
  const client = useIDosGamesClient();
  const toast = useToast();
  const state = useUserState();
  const catalog = useCatalog();
  const [to, setTo] = useState<string | null>(
    initialFriend && friends.some((f) => f.UserID === initialFriend)
      ? initialFriend
      : null,
  );
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [ask, setAsk] = useState(false);
  // One key per attempt: a retry after a timeout reuses it, so the server never charges twice.
  const requestID = useRef(newRequestID());
  const options = useMemo(
    () =>
      transferOptions(
        defs.Gifts?.Transfer?.AllowedResources,
        state?.InventoryV2 as TransferInventory | undefined,
      ),
    [defs, state?.InventoryV2],
  );
  const entries = transferEntries(options, amounts);
  const friend = friends.find((f) => f.UserID === to) ?? null;
  const now = useNow(30_000);
  const fee = feePercent(defs.Gifts?.Transfer?.FeePercent);
  const receives = afterFee(entries, fee);
  const fixedFee = bundleLines(defs.Gifts?.Transfer?.FeeCost);

  const send = async () => {
    if (!to) return false;
    const res = await client.mailbox.sendTransfer(to, entries, {
      requestID: requestID.current,
      note: note.trim() || undefined,
    });
    if (!res.ok) {
      toast(words(res.error), "error");
      return false;
    }
    requestID.current = newRequestID();
    toast(t("transferSent"), "success");
    await onSent();
    onDone();
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
        {t("transferHint")}
      </div>
      {status?.Transfer ? (
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
            {t("leftInPeriod")}: {status.Transfer.RemainingInPeriod}
          </span>
          <Timer
            at={status.Transfer.ResetsAt}
            now={now}
            label={t("resetsIn")}
          />
        </div>
      ) : null}
      {fee > 0 || fixedFee.length > 0 ? (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            ...outlined,
            fontSize: 12,
          }}
        >
          {fee > 0 ? (
            <span>{t("commission").replace("{p}", String(fee))}</span>
          ) : null}
          {fixedFee.length > 0 ? (
            <>
              <span>{t("fixedFee")}:</span>
              <ResourceList lines={fixedFee} size={18} />
            </>
          ) : null}
        </div>
      ) : null}
      <div style={{ ...outlined, fontSize: 13 }}>{t("pickFriend")}</div>
      <div
        style={{ display: "grid", gap: 6, maxHeight: 180, overflowY: "auto" }}
      >
        {friends.map((f) => (
          <FriendChip
            key={f.UserID}
            friend={f}
            selected={to === f.UserID}
            onClick={() => setTo(f.UserID)}
          />
        ))}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {options.map((o) => (
          <TransferRow
            key={o.key}
            option={o}
            value={amounts[o.key] ?? 0}
            name={
              o.kind === "currency"
                ? catalog.currencyName(o.id)
                : catalog.itemName(o.id)
            }
            onChange={(n) => setAmounts((a) => ({ ...a, [o.key]: n }))}
          />
        ))}
      </div>
      <TextInput
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={120}
        placeholder={t("notePlaceholder")}
        style={{ padding: "10px 12px", fontSize: 14 }}
      />
      <Button
        tone="green"
        disabled={!to || entries.length === 0 || receives.length === 0}
        onClick={() =>
          entries.length === 0 ? toast(t("nothingToSend")) : setAsk(true)
        }
      >
        {t("sendTo")}
      </Button>
      {ask && friend ? (
        <ConfirmPopup
          title={t("transfer")}
          tone="gold"
          onClose={() => setAsk(false)}
          onConfirm={send}
        >
          <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
            <div style={{ ...outlined, fontSize: 14, textAlign: "center" }}>
              {t("transferAsk").replace("{name}", friendName(friend))}
            </div>
            <ResourceList
              lines={bundleLines({ Entries: entries })}
              size={28}
              gap={12}
            />
            {fee > 0 ? (
              <div style={{ display: "grid", justifyItems: "center", gap: 4 }}>
                <div style={{ ...outlined, fontSize: 12, color: v.textDim }}>
                  {t("friendGets")}
                </div>
                <ResourceList
                  lines={bundleLines({ Entries: receives })}
                  size={22}
                  gap={10}
                />
              </div>
            ) : null}
            {fixedFee.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  ...outlined,
                  fontSize: 12,
                  color: v.textDim,
                }}
              >
                {t("fixedFee")}: <ResourceList lines={fixedFee} size={18} />
              </div>
            ) : null}
          </div>
        </ConfirmPopup>
      ) : null}
    </div>
  );
}

function TransferRow({
  option,
  value,
  name,
  onChange,
}: {
  option: TransferOption;
  value: number;
  name: string;
  onChange: (n: number) => void;
}): ReactNode {
  const disabled = option.max <= 0;
  const set = (n: number) =>
    onChange(Math.max(0, Math.min(option.max, Math.floor(n) || 0)));
  return (
    <div
      style={{
        ...panel,
        padding: 8,
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <ResourceBadge
        line={{ kind: option.kind, id: option.id, amount: option.owned }}
        size={24}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...outlined, fontSize: 13 }}>{name}</div>
        <div style={{ ...outlined, fontSize: 11, color: v.textDim }}>
          {t("owned")}: {option.owned}
        </div>
      </div>
      <TextInput
        type="number"
        min={0}
        max={option.max}
        disabled={disabled}
        value={value || ""}
        placeholder="0"
        onChange={(e) => set(Number(e.target.value))}
        style={{ width: 80, padding: "6px 8px", textAlign: "center" }}
      />
      <Button
        size="sm"
        tone="grey"
        disabled={disabled}
        onClick={() => set(option.max)}
      >
        max
      </Button>
    </div>
  );
}
