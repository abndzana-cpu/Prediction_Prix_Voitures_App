import { useEffect, useState } from "react";
import api from "../api";
import RatingStars from "../components/RatingStars";
import CarCarousel from "../components/CarCarousel";
import { IconGauge, IconUpload, IconCar } from "../icons";

const DEFAULTS = {
  make: "",
  model_label: "",
  year: 2018,
  engine_hp: 200,
  engine_cylinders: 4,
  number_of_doors: 4,
  highway_mpg: 30,
  city_mpg: 22,
  popularity: 1300,
  engine_fuel_type: "regular unleaded",
  transmission_type: "AUTOMATIC",
  driven_wheels: "front wheel drive",
  vehicle_size: "Midsize",
  vehicle_style: "Sedan",
  is_luxury: false,
  is_performance: false,
};

function formatPrice(value) {
  const parts = value.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export default function Predict({ options }) {
  const [form, setForm] = useState(DEFAULTS);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    if (options && !form.make) {
      setForm((f) => ({ ...f, make: options.make_options[0] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  const update = (key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  // Pour les champs numériques : autorise la saisie libre pendant la frappe,
  // et ne corrige (clamp) dans la plage autorisée qu'à la sortie du champ (onBlur).
  const updateNumber = (key) => (e) => {
    const raw = e.target.value;
    setForm((f) => ({ ...f, [key]: raw }));
  };

  const clampNumber = (key, min, max, isInt = false) => () => {
    setForm((f) => {
      const num = isInt ? parseInt(f[key], 10) : parseFloat(f[key]);
      return { ...f, [key]: clamp(num, min, max) };
    });
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setResult(null);
    setRated(false);
    try {
      let image_path = null;
      if (imageFile) {
        const up = await api.uploadImage(imageFile);
        image_path = up.image_path;
      }
      const payload = { ...form, image_path };
      const res = await api.predict(payload);
      setResult({ ...res, form: { ...form }, image_path });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (value) => {
    if (!result) return;
    try {
      await api.feedback(result.id, value);
      setRated(true);
    } catch {
      /* silent */
    }
  };

  if (!options) {
    return <div className="main"><p className="page-desc">Chargement du modèle…</p></div>;
  }

  const cat = options.categorical_options;
  const [intPart, centPart] = result ? formatPrice(result.predicted_price) : ["", ""];

  const yearMin = options.year_range.min;
  const yearMax = 2026;
  const popMax = Math.round(options.numeric_ranges.Popularity.max);

  return (
    <div className="main">
      <div className="page-header">
        <div>
          <p className="eyebrow">MACHINE LEARNING</p>
          <h1 className="page-title">Estimer le prix d'une voiture</h1>
          <p className="page-desc">
            Renseigne les caractéristiques techniques du véhicule. Le modèle, entraîné sur
            {" "}{options.metrics ? "11 900+ véhicules" : "le jeu de données"}, calcule une estimation
            du MSRP en quelques millisecondes.
          </p>
        </div>
      </div>

      <CarCarousel />

      <div className="predict-grid">
        <div className="panel panel-pad">
          <p className="section-title"><span className="swatch" />Caractéristiques du véhicule</p>
          <form className="form-grid" onSubmit={submit}>
            <div className="field">
              <label htmlFor="make">Marque</label>
              <select id="make" value={form.make} onChange={update("make")}>
                {options.make_options.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="model_label">Modèle (libre, indicatif)</label>
              <input id="model_label" type="text" placeholder="ex. Série 3" value={form.model_label} onChange={update("model_label")} />
            </div>

            <div className="field">
              <label htmlFor="year">Année</label>
              <input
                id="year"
                type="number"
                min={yearMin}
                max={yearMax}
                step={1}
                value={form.year}
                onChange={updateNumber("year")}
                onBlur={clampNumber("year", yearMin, yearMax, true)}
              />
              <span className="range-hint">Plage acceptée : {yearMin} – {yearMax}</span>
            </div>
            <div className="field">
              <label htmlFor="popularity">Popularité</label>
              <input
                id="popularity"
                type="number"
                min={2}
                max={popMax}
                step={1}
                value={form.popularity}
                onChange={updateNumber("popularity")}
                onBlur={clampNumber("popularity", 2, popMax, true)}
              />
              <span className="range-hint">Plage acceptée : 2 – {popMax}</span>
            </div>

            <div className="field">
              <label htmlFor="engine_hp">Puissance (HP)</label>
              <input
                id="engine_hp"
                type="number"
                min={55}
                max={650}
                step={1}
                value={form.engine_hp}
                onChange={updateNumber("engine_hp")}
                onBlur={clampNumber("engine_hp", 55, 650, true)}
              />
              <span className="range-hint">Plage acceptée : 55 – 650 HP</span>
            </div>
            <div className="field">
              <label htmlFor="engine_cylinders">Cylindres</label>
              <input
                id="engine_cylinders"
                type="number"
                min={0}
                max={16}
                step={1}
                value={form.engine_cylinders}
                onChange={updateNumber("engine_cylinders")}
                onBlur={clampNumber("engine_cylinders", 0, 16, true)}
              />
              <span className="range-hint">Plage acceptée : 0 – 16</span>
            </div>

            <div className="field">
              <label htmlFor="city_mpg">Conso. ville (mpg)</label>
              <input
                id="city_mpg"
                type="number"
                min={7}
                max={60}
                step={1}
                value={form.city_mpg}
                onChange={updateNumber("city_mpg")}
                onBlur={clampNumber("city_mpg", 7, 60, true)}
              />
              <span className="range-hint">Plage acceptée : 7 – 60 mpg</span>
            </div>
            <div className="field">
              <label htmlFor="highway_mpg">Conso. autoroute (mpg)</label>
              <input
                id="highway_mpg"
                type="number"
                min={10}
                max={70}
                step={1}
                value={form.highway_mpg}
                onChange={updateNumber("highway_mpg")}
                onBlur={clampNumber("highway_mpg", 10, 70, true)}
              />
              <span className="range-hint">Plage acceptée : 10 – 70 mpg</span>
            </div>

            <div className="field">
              <label htmlFor="number_of_doors">Portes</label>
              <select id="number_of_doors" value={form.number_of_doors} onChange={update("number_of_doors")}>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="vehicle_size">Gabarit</label>
              <select id="vehicle_size" value={form.vehicle_size} onChange={update("vehicle_size")}>
                {cat["Vehicle Size"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="field">
              <label htmlFor="vehicle_style">Carrosserie</label>
              <select id="vehicle_style" value={form.vehicle_style} onChange={update("vehicle_style")}>
                {cat["Vehicle Style"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="driven_wheels">Roues motrices</label>
              <select id="driven_wheels" value={form.driven_wheels} onChange={update("driven_wheels")}>
                {cat["Driven_Wheels"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="field">
              <label htmlFor="transmission_type">Transmission</label>
              <select id="transmission_type" value={form.transmission_type} onChange={update("transmission_type")}>
                {cat["Transmission Type"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="engine_fuel_type">Carburant</label>
              <select id="engine_fuel_type" value={form.engine_fuel_type} onChange={update("engine_fuel_type")}>
                {cat["Engine Fuel Type"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="checkbox-row">
              <label className="checkbox-pill">
                <input type="checkbox" checked={form.is_luxury} onChange={update("is_luxury")} /> Catégorie luxe
              </label>
              <label className="checkbox-pill">
                <input type="checkbox" checked={form.is_performance} onChange={update("is_performance")} /> Haute performance
              </label>
            </div>

            <label className="image-drop" htmlFor="image">
              {imagePreview ? <img src={imagePreview} alt="aperçu véhicule" /> : <IconUpload width={20} height={20} />}
              <span>{imageFile ? imageFile.name : "Joindre une photo du véhicule (optionnel, illustratif)"}</span>
              <input id="image" type="file" accept="image/*" onChange={handleImage} hidden />
            </label>

            {error && <div className="error-banner">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              <IconGauge width={17} height={17} />
              {loading ? "Calcul en cours…" : "Estimer le prix"}
            </button>
          </form>
        </div>

        <div className="sticker">
          <div className="sticker-head">
            <span className="sticker-head-label">Fiche d'estimation</span>
            <span className="sticker-vin">#{result ? result.id.slice(0, 8).toUpperCase() : "EN ATTENTE"}</span>
          </div>
          <div className="sticker-body">
            {!result ? (
              <div className="sticker-empty">
                <IconCar />
                <p style={{ margin: 0, fontSize: 13 }}>
                  Renseigne les caractéristiques puis lance l'estimation pour voir la fiche prix apparaître ici.
                </p>
              </div>
            ) : (
              <>
                <div className="price-readout">
                  $<span>{intPart}</span><span className="cents">.{centPart}</span>
                </div>
                <p className="price-sub">
                  {form.year} {form.make} {form.model_label || form.vehicle_style} — estimation MSRP
                </p>

                <div className="gauge-row">
                  <IconGauge width={18} height={18} style={{ color: "var(--good)" }} />
                  <div>
                    <div className="gauge-label">Fiabilité du modèle ({result.model_used})</div>
                    <div className="gauge-value">R² = {result.confidence_r2.toFixed(3)}</div>
                  </div>
                </div>

                <div className="spec-list">
                  <div className="spec-item"><span className="k">Puissance</span><span className="v">{form.engine_hp} HP</span></div>
                  <div className="spec-item"><span className="k">Cylindres</span><span className="v">{form.engine_cylinders}</span></div>
                  <div className="spec-item"><span className="k">Conso. ville</span><span className="v">{form.city_mpg} mpg</span></div>
                  <div className="spec-item"><span className="k">Conso. route</span><span className="v">{form.highway_mpg} mpg</span></div>
                  <div className="spec-item"><span className="k">Gabarit</span><span className="v">{form.vehicle_size}</span></div>
                  <div className="spec-item"><span className="k">Transmission</span><span className="v">{form.transmission_type}</span></div>
                </div>

                <div className="rating-block">
                  <p className="rating-prompt">Cette estimation t'a-t-elle été utile ?</p>
                  <RatingStars onRate={handleRate} disabled={rated} />
                  {rated && <p className="rating-thanks">Merci pour ta note ✓</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}