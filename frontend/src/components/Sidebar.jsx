import { useState } from "react";
import { NavLink } from "react-router-dom";
import { IconCar, IconGauge, IconHistory, IconChart, IconUser } from "../icons";
import { useAuth } from "../AuthContext";
import LoginModal from "./LoginModal";

export default function Sidebar({ modelInfo }) {
  const { user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">AI</div>
        <div className="brand-text">
          <span className="brand-title">Estimateur Auto</span>
          <span className="brand-sub">FICHE TECHNIQUE IA</span>
        </div>
      </div>

      <p className="nav-eyebrow">Atelier</p>
      <nav className="nav">
        <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <IconCar /> Estimer un prix
        </NavLink>
        <NavLink to="/historique" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <IconHistory /> Historique
        </NavLink>
        <NavLink to="/statistiques" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <IconChart /> Statistiques
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="model-badge">
          <div className="model-badge-row">
            <span><span className="dot-live" /> &nbsp;Modèle actif</span>
            <b>{modelInfo?.best_model_name || "…"}</b>
          </div>
          <div className="model-badge-row">
            <span><IconGauge width={12} height={12} style={{ verticalAlign: "-2px" }} /> &nbsp;Précision R²</span>
            <b>{modelInfo?.metrics ? modelInfo.metrics.R2.toFixed(3) : "…"}</b>
          </div>
        </div>

        {user ? (
          <button className="auth-btn" onClick={logout}>
            <span className="auth-avatar">{user.name?.[0]?.toUpperCase() || "U"}</span>
            <span style={{ flex: 1, textAlign: "left" }}>{user.name}</span>
          </button>
        ) : (
          <button className="auth-btn" onClick={() => setShowLogin(true)}>
            <IconUser width={16} height={16} />
            Connexion
          </button>
        )}
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </aside>
  );
}
