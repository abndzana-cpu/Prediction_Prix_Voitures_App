# Estimateur de prix de voitures — IA

Application complète : modèle de Machine Learning (XGBoost) entraîné sur `data.csv`,
servi par une API **Flask**, consommé par une interface **React** (esthétique
« fiche technique / window sticker » automobile).

## Structure

```
car-price-app/
├── backend/
│   ├── train_model.py      # ré-entraîne le modèle et exporte les artefacts
│   ├── app.py               # API Flask (predict, history, stats, feedback, upload)
│   ├── data.csv              # dataset source
│   ├── model.joblib          # modèle entraîné (généré)
│   ├── scaler.joblib         # StandardScaler (généré)
│   ├── metadata.json         # options, plages, métriques (généré)
│   └── app.db                 # SQLite : historique + notes (généré au 1er lancement)
└── frontend/
    ├── src/
    │   ├── api.js             # client HTTP vers l'API Flask
    │   ├── AuthContext.jsx     # connexion mockée (stockage local)
    │   ├── App.jsx / main.jsx
    │   ├── components/         # Sidebar, LoginModal, RatingStars
    │   └── pages/               # Predict (estimer), History, Stats
    └── index.html / vite.config.js
```

## 1. Backend (Flask)

```bash
cd backend
pip install -r requirements.txt   # ou : pip install flask flask-cors scikit-learn xgboost lightgbm pandas numpy joblib
python train_model.py             # entraîne le modèle et génère model.joblib / scaler.joblib / metadata.json
python app.py                     # démarre l'API sur http://localhost:5000
```

Le meilleur modèle (comparé automatiquement parmi Régression Linéaire, Ridge, Random
Forest, Gradient Boosting, XGBoost, LightGBM) est sélectionné par R² puis sauvegardé.
Dans ce run, **XGBoost** a été retenu avec **R² ≈ 0.99** sur le jeu de test.

## 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Le fichier `.env` définit `VITE_API_BASE=http://localhost:5000` (à adapter en
production si l'API est déployée sur un autre domaine).

Pour une build de production : `npm run build` (sortie dans `frontend/dist/`),
à servir avec n'importe quel serveur statique (nginx, Vercel, Netlify…).

## Fonctionnalités

- **Estimation de prix** : formulaire complet (marque, année, motorisation, conso,
  gabarit, carrosserie, transmission, roues motrices, options luxe/performance),
  résultat affiché sous forme de fiche technique avec score de confiance (R²).
- **Photo du véhicule** : upload optionnel, joint à l'historique (illustratif —
  non utilisé par le modèle, qui se base uniquement sur les caractéristiques
  techniques saisies).
- **Notation** : après chaque estimation, l'utilisateur note la pertinence (1 à 5
  étoiles), comme sur les assistants IA grand public.
- **Historique** : liste de toutes les estimations passées (photo, prix, note).
- **Statistiques** : nombre total d'estimations, prix moyen, note moyenne, prix
  moyen par marque, répartition des notes, évolution dans le temps.
- **Connexion** : authentification simplifiée (email/mot de passe stockés en
  local, sans vérification serveur — à remplacer par un vrai système
  d'authentification avant toute mise en production).

## Notes pour la suite

- L'historique et les notes sont actuellement partagés entre tous les
  utilisateurs (pas de filtrage par compte) — à faire évoluer si plusieurs
  comptes doivent avoir des historiques séparés.
- Pour un vrai déploiement : remplacer le serveur de dev Flask par Gunicorn/
  Waitress, sécuriser l'auth (hash de mot de passe, JWT), et héberger le
  frontend buildé séparément de l'API.
"# Prediction_Prix_Voitures_App" 
# Prediction_Prix_Voitures_App
# Prediction_Prix_Voitures_App
