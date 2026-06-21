import { useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import api from "../api";

const COLORS = ["#ff7a3c", "#2f6fed", "#b9810f", "#d23a56", "#8b919c"];

function ChartTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#ffffff", border: "1px solid #d9dfe9", borderRadius: 7, padding: "8px 11px", fontSize: 12, fontFamily: "JetBrains Mono, monospace", boxShadow: "0 10px 24px -14px rgba(28,33,40,0.3)" }}>
      <div style={{ color: "#8b919c", marginBottom: 3 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#1c2128" }}>{p.name}: {p.value}{suffix}</div>
      ))}
    </div>
  );
}

export default function Stats({ modelInfo }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats().then(setStats);
  }, []);

  const ratingData = stats
    ? [1, 2, 3, 4, 5].map((n) => ({ stars: `${n}★`, count: stats.rating_distribution[String(n)] }))
    : [];

  return (
    <div className="main">
      <div className="page-header">
        <div>
          <p className="eyebrow">Tableau de bord</p>
          <h1 className="page-title">Statistiques d'usage</h1>
          <p className="page-desc">Vue d'ensemble de l'activité de l'IA : volume d'estimations, prix moyens par marque et satisfaction utilisateurs.</p>
        </div>
      </div>

      {!stats ? (
        <p className="page-desc">Chargement…</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="kpi-card">
              <div className="kpi-label">Estimations totales</div>
              <div className="kpi-value accent">{stats.total_predictions}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Prix moyen estimé</div>
              <div className="kpi-value teal">${Math.round(stats.average_price).toLocaleString("fr-FR")}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Note moyenne</div>
              <div className="kpi-value gold">{stats.average_rating ? `${stats.average_rating} / 5` : "—"}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Précision du modèle (R²)</div>
              <div className="kpi-value">{modelInfo?.metrics ? modelInfo.metrics.R2.toFixed(3) : "—"}</div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="panel panel-pad">
              <p className="section-title"><span className="swatch" />Prix moyen par marque (top 10)</p>
              {stats.price_by_make.length === 0 ? (
                <p className="page-desc">Pas encore de données.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.price_by_make} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e8f0" vertical={false} />
                    <XAxis dataKey="make" tick={{ fill: "#8b919c", fontSize: 11 }} axisLine={{ stroke: "#d9dfe9" }} tickLine={false} />
                    <YAxis tick={{ fill: "#8b919c", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,122,60,0.06)" }} />
                    <Bar dataKey="average_price" name="Prix moyen" fill="#ff7a3c" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="panel panel-pad">
              <p className="section-title"><span className="swatch" style={{ background: "var(--gold)" }} />Répartition des notes</p>
              {stats.rating_count === 0 ? (
                <p className="page-desc">Aucune note pour l'instant.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={ratingData} dataKey="count" nameKey="stars" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {ratingData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="panel panel-pad">
            <p className="section-title"><span className="swatch" style={{ background: "var(--accent-2)" }} />Estimations dans le temps</p>
            {stats.predictions_over_time.length === 0 ? (
              <p className="page-desc">Pas encore de données.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.predictions_over_time} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#8b919c", fontSize: 11 }} axisLine={{ stroke: "#d9dfe9" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "#8b919c", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="count" name="Estimations" stroke="#2f6fed" strokeWidth={2.5} dot={{ fill: "#2f6fed", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}