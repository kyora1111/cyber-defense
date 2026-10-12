import {
  memo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { Packet } from "../game/state";
import { t } from "../i18n";

// Data packets falling over the board — the match's income. The layer lies over the cells and over
// everything that moves on them, and lets taps through; only the packets themselves take them.

interface Pop {
  id: number;
  x: number;
  y: number;
  value: number;
}

export const PacketLayer = memo(function PacketLayer({
  packets,
  onCollect,
}: {
  packets: readonly Packet[];
  onCollect: (packet: Packet) => void;
}): ReactNode {
  const layer = useRef<HTMLDivElement>(null);
  const [pops, setPops] = useState<Pop[]>([]);

  const collect = (packet: Packet, event: PointerEvent<HTMLDivElement>) => {
    // The packet is caught mid-fall, so "+25" rises from where the pointer met it — its landing
    // spot may still be far below.
    const box = layer.current?.getBoundingClientRect();
    if (box && box.width > 0 && box.height > 0) {
      const pop: Pop = {
        id: packet.id,
        x: ((event.clientX - box.left) / box.width) * 100,
        y: ((event.clientY - box.top) / box.height) * 100,
        value: packet.value,
      };
      setPops((list) => [...list, pop]);
    }
    onCollect(packet);
  };

  return (
    <div ref={layer} className="cd-packets">
      {packets.map((packet) => (
        <div
          key={packet.id}
          role="button"
          aria-label={t("collectPacket")}
          className="cd-data cd-packet"
          data-packet={packet.id}
          style={
            {
              left: `${packet.x}%`,
              "--cd-land": `${packet.landY}%`,
            } as CSSProperties
          }
          // Pointer-down, not click: a click needs press and release on the same element, and
          // the packet moves between the two.
          onPointerDown={(event) => collect(packet, event)}
        >
          <span>
            01
            <br />
            10
          </span>
        </div>
      ))}
      {pops.map((pop) => (
        <span
          key={pop.id}
          className="cd-pop"
          style={{ left: `${pop.x}%`, top: `${pop.y}%` }}
          onAnimationEnd={() =>
            setPops((list) => list.filter((p) => p.id !== pop.id))
          }
        >
          +{pop.value}
        </span>
      ))}
    </div>
  );
});
