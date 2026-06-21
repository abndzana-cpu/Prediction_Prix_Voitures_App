import { useEffect, useState } from "react";
import api from "../api";
import { IconHistory, IconStar, IconTrash, IconCar } from "../icons";

export default function History() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    api.getHistory().then(setItems).catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const clearAll = async () => {
    if (!confirm("Vider tout l'historique des estimations ?")) return;
    await api.clearHistory();
    load();
  };

  return (
    <div className="main">
      <div className="page-header">
        <div>
          <p className="eyebrow">Journal de bord</p>
          <h1 className="page-title">Historique des estimations</h1>
          <p className="page-desc">Toutes les fiches générées par le modèle, classées de la plus récente à la plus ancienne.</p>
        </div>
        {items && items.length > 0 && (
          <button className="btn-secondary" onClick={clearAll}>
            <IconTrash width={13} height={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
            Vider l'historique
          </button>
        )}
      </div>

      {error && <div className="error-banner" style={{ gridColumn: "unset", display: "block" }}>{error}</div>}

      {!items ? (
        <p className="page-desc">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <IconHistory width={34} height={34} />
            <p style={{ margin: 0 }}>Aucune estimation pour le moment.</p>
            <p style={{ margin: 0, fontSize: 12.5 }}>Lance ta première estimation depuis l'onglet « Estimer un prix ».</p>
          </div>
        </div>
      ) : (
        <div className="history-list">
          {items.map((it) => (
            <div className="history-row" key={it.id}>
              {it.image_path ? (
                <img className="history-thumb" src={api.imageUrl(it.image_path)} alt="" />
              ) : (
                <div className="history-thumb-placeholder"><IconCar width={22} height={22} /></div>
              )}
              <div className="history-main">
                <b>{it.year} {it.make} {it.input?.model_label || it.input?.vehicle_style || ""}</b>
                <div className="history-meta">
                  {new Date(it.created_at).toLocaleString("fr-FR")} · {it.input?.engine_hp} HP · {it.input?.vehicle_style}
                </div>
              </div>
              <div className="history-price">
                ${Number(it.predicted_price).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
              </div>
              <div className="history-rating">
                {[1, 2, 3, 4, 5].map((v) => (
                  <IconStar key={v} filled={it.rating && v <= it.rating} className={it.rating && v <= it.rating ? "on" : ""} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}