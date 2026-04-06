import { useEffect, useMemo } from "react";

const parts = [
  "leg_back",
  "arm_back",
  "leg_front",
  "body",
  "arm_front",
  "head",
];

const walkFrames = [
  "walk_00",
  "walk_01",
  "walk_02",
  "walk_03",
  "walk_04",
  "walk_05",
  "walk_06",
  "walk_05",
  "walk_04",
  "walk_03",
  "walk_02",
  "walk_01",
];

export default function AvatarRenderer({
  x = 0,
  y = 0,
  scale = 0.22,
  walking = false,
  facing = "right",
  stepPhase = 0,
  gender = "man",
}) {
  const width = 512 * scale;
  const height = 1024 * scale;

  const currentFrameFolder = walking
    ? walkFrames[stepPhase % walkFrames.length]
    : "idle";

  const srcMap = useMemo(() => {
    const map = {};
    for (const part of parts) {
      map[part] = `/assets/avatar/${gender}/base/side/${currentFrameFolder}/${part}.png`;
    }
    return map;
  }, [gender, currentFrameFolder]);

  useEffect(() => {
    const allFrames = ["idle", ...new Set(walkFrames)];

    for (const frame of allFrames) {
      for (const part of parts) {
        const img = new Image();
        img.src = `/assets/avatar/${gender}/base/side/${frame}/${part}.png`;
      }
    }
  }, [gender]);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          transform: facing === "left" ? "scaleX(-1)" : "scaleX(1)",
          transformOrigin: "center center",
        }}
      >
        {parts.map((part) => (
          <img
            key={part}
            src={srcMap[part]}
            alt=""
            draggable="false"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width,
              height,
              pointerEvents: "none",
              userSelect: "none",
              display: "block",
            }}
          />
        ))}
      </div>
    </div>
  );
}