import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../AuthContext";
import { IconX } from "../icons";

function LoginModalContent({ onClose }) {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    login(email, mode === "signup" ? name : undefined);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Fermer">
          <IconX width={18} height={18} />
        </button>
        <p className="modal-title">{mode === "login" ? "Connexion" : "Créer un compte"}</p>
        <p className="modal-sub">
          Connecte-toi pour sauvegarder ton historique d'estimations et tes notes.
        </p>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <div className="modal-field">
              <label htmlFor="name">Nom</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton nom" />
            </div>
          )}
          <div className="modal-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@example.com" />
          </div>
          <div className="modal-field">
            <label htmlFor="password">Mot de passe</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn-primary" style={{ gridColumn: "unset", flex: 1 }}>
              {mode === "login" ? "Se connecter" : "S'inscrire"}
            </button>
          </div>
        </form>
        <p className="modal-sub" style={{ marginTop: 14, marginBottom: 0, textAlign: "center" }}>
          {mode === "login" ? (
            <>Pas de compte ? <a onClick={() => setMode("signup")} style={{ color: "var(--accent)", cursor: "pointer" }}>S'inscrire</a></>
          ) : (
            <>Déjà inscrit ? <a onClick={() => setMode("login")} style={{ color: "var(--accent)", cursor: "pointer" }}>Se connecter</a></>
          )}
        </p>
      </div>
    </div>
  );
}

export default function LoginModal({ onClose }) {
  // Portail : la modale est montée directement sous <body>, hors de la
  // hiérarchie DOM du carrousel (qui utilise mask-image + animation et peut
  // créer sa propre couche d'empilement dans certains navigateurs). Ainsi
  // elle reste toujours au-dessus de tout, peu importe l'endroit du site
  // d'où elle est ouverte.
  return createPortal(<LoginModalContent onClose={onClose} />, document.body);
}