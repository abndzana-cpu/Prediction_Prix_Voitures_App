import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Sidebar from "./components/Sidebar";
import Predict from "./pages/Predict";
import History from "./pages/History";
import Stats from "./pages/Stats";
import api from "./api";

export default function App() {
  const [options, setOptions] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getOptions().then(setOptions).catch((e) => setError(e.message));
  }, []);

  return (
    <AuthProvider>
      <div className="app-shell">
        <Sidebar modelInfo={options} />
        <div>
          {error && (
            <div className="main">
              <div className="error-banner" style={{ gridColumn: "unset", display: "block" }}>
                Impossible de joindre l'API Flask ({error}). Vérifie que le serveur tourne sur le port 5000.
              </div>
            </div>
          )}
          <Routes>
            <Route path="/" element={<Predict options={options} />} />
            <Route path="/historique" element={<History />} />
            <Route path="/statistiques" element={<Stats modelInfo={options} />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}
