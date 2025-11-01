import React from "react";

/**
 * Simple avatar with eyes and a mouth.
 * New: accepts `speaking` (boolean) to animate the mouth.
 */
export default function Avatar({
  role = "Pharmacist",
  speaking = false, // <-- new prop
  size = 160,
}) {
  const face = {
    position: "relative",
    width: size,
    height: size,
    borderRadius: "50%",
    background: "#f3f4f6",
    boxShadow: "inset 0 0 0 2px #e5e7eb",
  };

  const eye = (side) => ({
    position: "absolute",
    top: size * 0.38,
    [side]: size * 0.32,
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "#111",
  });

  // Mouth is a rounded bar that “opens” when speaking
  const mouthClass = speaking ? "mouth talking" : "mouth";

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <div style={face}>
        <div style={eye("left")} />
        <div style={eye("right")} />
        <div className={mouthClass} />
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: 16,
            fontSize: 12,
            background: "white",
            padding: "3px 6px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            color: "#4b5563",
          }}
        >
          {role}
        </div>
      </div>

      {/* Local styles for mouth animation */}
      <style>{`
        .mouth {
          position: absolute;
          left: 50%;
          bottom: ${Math.round(size * 0.27)}px;
          width: 36px;
          height: 8px;
          margin-left: -18px;
          background: #111;
          border-radius: 0 0 24px 24px / 0 0 16px 16px;
          transform-origin: center bottom;
        }
        .talking {
          animation: talk 180ms steps(2) infinite;
        }
        @keyframes talk {
          0%   { height: 6px;  border-radius: 0 0 18px 18px / 0 0 12px 12px; }
          100% { height: 28px; border-radius: 18px 18px 24px 24px / 12px 12px 16px 16px; }
        }
      `}</style>
    </div>
  );
}
