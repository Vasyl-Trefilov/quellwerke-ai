import { useState } from "react";

const AnimatedBlobs = () => {
  const [blobs] = useState([
    { color: "rgba(213,0,249,0.4)", size: 300, top: "20%", left: "15%" },
    { color: "rgba(79,172,254,0.35)", size: 350, top: "60%", left: "70%" },
    { color: "rgba(255,138,101,0.3)", size: 280, top: "50%", left: "30%" },
  ]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 4, pointerEvents: "none" }}>
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            background: b.color,
            borderRadius: "50%",
            filter: "blur(100px)",
            animation: `blobFloat ${12 + i * 4}s ease-in-out infinite alternate`,
          }}
        ></div>
      ))}

      <style>{`
        @keyframes blobFloat {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(40px, -30px) scale(1.1); }
          100% { transform: translate(-20px, 20px) scale(0.95); }
        }
      `}</style>
    </div>
  );
};

export default AnimatedBlobs;