import Chatbot from './ChatBot'

function App() {

  return (
    <div style={{ 
      height: "100vh", 
      maxHeight: window.innerHeight,
      display: "flex", 
      position: "relative",
      justifyContent: "center", 
      alignItems: "center", 
      overflowY: "hidden"
      }}>
      <div style={{
          background: "linear-gradient(135deg, #0f172a, #1e293b)", 
          zIndex: 2,
          opacity: 1,
          height: "100vh", 
          display: "flex", 
          top: 0,
          position: "fixed",
          justifyContent: "center", 
          alignItems: "center", 
          width: "100%"
        }}>
        <div style={{
          zIndex: 2,
          top: "calc(15% - 2px)",
          position: "absolute",
          display: "flex",
          width: "calc(80% + 4px)",
          height: "calc(80% + 4px)",
          maxHeight: window.innerHeight * 0.86,
          borderRadius: "calc(1.5rem + 2px)",
          overflow: "hidden",
          background: "linear-gradient(135deg, #65ffeaff, #d500f9)"
        }}>

        </div>
        <div style={{
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
          background: "linear-gradient(135deg, #000000, #030303)"
        }}>      
          <Chatbot />
        </div>
      </div>
    </div>
  )
}

export default App
