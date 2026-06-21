// --- PHOTOS PEXELS (EN LIGNE) — actuellement utilisées ----------------------
const PHOTOS = [
  { id: 790176, label: "Berline sport" },
  { id: 19410452, label: "SUV familial" },
  { id: 1005633, label: "Citadine" },
  { id: 797570, label: "Pickup robuste" },
  { id: 919073, label: "Coupé sport" },
  { id: 712618, label: "Berline classique" },
];

function pexelsUrl(id) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&fit=crop`;
}


export default function CarCarousel() {
  const loop = [...PHOTOS, ...PHOTOS];
  return (
    <div className="car-carousel">
      <div className="car-carousel-track">
        {loop.map((p, i) => (
          <div className="car-card" key={i}>
            {/* EN LIGNE (Pexels) : */}
            <img src={pexelsUrl(p.id)} alt={p.label} loading="lazy" />
            {/* LOCAL (à décommenter demain à la place de la ligne du dessus) : */}
            {/* <img src={p.src} alt={p.label} loading="lazy" /> */}
            <span className="car-card-label">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}