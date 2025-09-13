import { useState } from "react";
import Chatbot from "./ChatBot";
import AnimatedBlobs from "./backgrounds/AnimatedBlobs";
import ThreeBack from "./backgrounds/ThreeBack";
import TestBack from "./backgrounds/TestBack";
import QWSpace from "./backgrounds/QWSpace";
import NeonCubes from "./backgrounds/NeonCubes";
import Rain from "./backgrounds/Rain";
import BlackHole from "./backgrounds/BlackHole";
import Mountains from "./backgrounds/Mountains";

const App = () => {
  const [currentBack, setCurrentBack] = useState("threeSpace");

  const renderBackground = () => {
    switch (currentBack) {
      case "threeSpace":
        return <ThreeBack />;
      case "blobs":
        return <AnimatedBlobs />;
      case "qwSpace":
        return <QWSpace />;
      case "neonCubes":
        return <NeonCubes />;
      case "rain":
        return <Rain />;
      case "blackHole":
        return <BlackHole />;
      // case "mountains":
      //   return <Mountains />;
      // case "test":
      //   return <TestBack />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        maxHeight: window.innerHeight,
        display: "flex",
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
        overflowY: "hidden",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #000000, #030303)",
          zIndex: 2,
          opacity: 1,
          height: "100vh",
          display: "flex",
          top: 0,
          position: "fixed",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* outer glowing border */}
        {/* <div
          style={{
            zIndex: 2,
            top: "calc(15% - 2px)",
            position: "absolute",
            display: "flex",
            width: "calc(80% + 4px)",
            height: "calc(80% + 4px)",
            maxHeight: window.innerHeight * 0.86,
            borderRadius: "calc(1.5rem + 2px)",
            overflow: "hidden",
            background: "linear-gradient(135deg, #65ffeaff, #d500f9)",
          }}
        ></div>
        <div
          style={{
            zIndex: 3,
            top: "calc(15%)",
            position: "absolute",
            display: "flex",
            width: "calc(80%)",
            height: "calc(80%)",
            maxHeight: window.innerHeight * 0.86,
            borderRadius: "calc(1.5rem)",
            overflow: "hidden",
            boxShadow: "0 8px 40px rgba(255, 64, 129, 0.3)",
            background: "linear-gradient(135deg, #000000, #030303)",
          }}
        ></div> */}
        {/* Backgrounds */}
        {renderBackground()}

        {/* chatbot container */}
        {/* <div
          style={{
            zIndex: 4, // 4 for animation over chatbot, 3 to have UI over anim
            top: "calc(15%)",
            position: "absolute",
            display: "flex",
            width: "calc(80%)",
            height: "calc(80%)",
            maxHeight: window.innerHeight * 0.86,
            borderRadius: "calc(1.5rem)",
            overflow: "hidden",
            boxShadow: "0 8px 40px rgba(255, 64, 129, 0.3)",
            // background: "linear-gradient(135deg, #000000, #030303)",
          }}
        >
          <Chatbot />
        </div> */}

        {/* Buttons to switch backgrounds */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            zIndex: 10,
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            onClick={() => setCurrentBack("threeSpace")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: currentBack === "threeSpace" ? "#65ffeaff" : "#333",
              color: currentBack === "threeSpace" ? "#000" : "#fff",
              fontWeight: "bold",
            }}
          >
            Stars
          </button>
          <button
            onClick={() => setCurrentBack("qwSpace")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: currentBack === "qwSpace" ? "#65ffeaff" : "#333",
              color: currentBack === "qwSpace" ? "#000" : "#fff",
              fontWeight: "bold",
            }}
          >
            QWSpace
          </button>
          <button
            onClick={() => setCurrentBack("blobs")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: currentBack === "blobs" ? "#d500f9" : "#333",
              color: currentBack === "blobs" ? "#000" : "#fff",
              fontWeight: "bold",
            }}
          >
            Blobs
          </button>
          <button
            onClick={() => setCurrentBack("neonCubes")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: currentBack === "neonCubes" ? "#d500f9" : "#333",
              color: currentBack === "neonCubes" ? "#000" : "#fff",
              fontWeight: "bold",
            }}
          >
            NeonCubes
          </button>
          <button
            onClick={() => setCurrentBack("rain")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: currentBack === "rain" ? "#d500f9" : "#333",
              color: currentBack === "rain" ? "#000" : "#fff",
              fontWeight: "bold",
            }}
          >
            Rain
          </button>
          <button
            onClick={() => setCurrentBack("blackHole")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: currentBack === "blackHole" ? "#d500f9" : "#333",
              color: currentBack === "blackHole" ? "#000" : "#fff",
              fontWeight: "bold",
            }}
          >
            Uranus
          </button>
          {/* <button
            onClick={() => setCurrentBack("mountains")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: currentBack === "mountains" ? "#d500f9" : "#333",
              color: currentBack === "mountains" ? "#000" : "#fff",
              fontWeight: "bold",
            }}
          >
            Mountains
          </button>
          <button
            onClick={() => setCurrentBack("test")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: currentBack === "test" ? "#d500f9" : "#333",
              color: currentBack === "test" ? "#000" : "#fff",
              fontWeight: "bold",
            }}
          >
            Test
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default App;
