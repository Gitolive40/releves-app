import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { CSVLink } from "react-csv";

const API_URL = "https://app.nocodb.com/api/v1/db/data/noco/";
const HEADERS = {
  "accept": "application/json",
  "content-type": "application/json",
  "xc-token": "aFgjs03ijJeqoHEIFD0-paDhtR9wnlX_aapzDszr"
};

export default function Dashboard() {
  const [campings, setCampings] = useState([]);
  const [releves, setReleves] = useState([]);
  const [filteredReleves, setFilteredReleves] = useState([]);
  const [seuils, setSeuils] = useState([]);
  const [selectedCamping, setSelectedCamping] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [date, setDate] = useState("");
  const [eau, setEau] = useState("");
  const [elec, setElec] = useState("");
  const [gaz, setGaz] = useState("");
  const [seuilEau, setSeuilEau] = useState("");
  const [seuilElec, setSeuilElec] = useState("");
  const [seuilGaz, setSeuilGaz] = useState("");

  useEffect(() => {
    fetch(API_URL + "Campings", { headers: HEADERS })
      .then(res => res.json())
      .then(data => setCampings(data.list || []));

    fetch(API_URL + "Releves%20de%20compteurs", { headers: HEADERS })
      .then(res => res.json())
      .then(data => {
        const list = data.list || [];
        setReleves(list);
        setFilteredReleves(list);
      });

    fetch(API_URL + "Seuils", { headers: HEADERS })
      .then(res => res.json())
      .then(data => setSeuils(data.list || []));
  }, []);

  useEffect(() => {
    const filtered = releves.filter(r => {
      const yearMatch = selectedYear ? new Date(r.date_releve).getFullYear().toString() === selectedYear : true;
      const campingMatch = selectedCamping ? r.camping_id === selectedCamping : true;
      return yearMatch && campingMatch;
    });
    setFilteredReleves(filtered);

    const seuil = seuils.find(s => s.camping_id === selectedCamping);
    setSeuilEau(seuil?.seuil_eau || 0);
    setSeuilElec(seuil?.seuil_elec || 0);
    setSeuilGaz(seuil?.seuil_gaz || 0);
  }, [selectedYear, selectedCamping, releves, seuils]);

  const handleSubmit = () => {
    const body = {
      camping_id: selectedCamping,
      date_releve: date,
      compteur_eau: parseFloat(eau),
      compteur_elec: parseFloat(elec),
      compteur_gaz: parseFloat(gaz)
    };

    fetch(API_URL + "Releves%20de%20compteurs", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(body)
    }).then(() => window.location.reload());
  };

  const handleSeuilSubmit = () => {
    const seuil = seuils.find(s => s.camping_id === selectedCamping);
    const method = seuil ? "PATCH" : "POST";
    const url = API_URL + "Seuils" + (seuil ? `/${seuil.id}` : "");

    const body = {
      camping_id: selectedCamping,
      seuil_eau: parseFloat(seuilEau),
      seuil_elec: parseFloat(seuilElec),
      seuil_gaz: parseFloat(seuilGaz)
    };

    fetch(url, {
      method,
      headers: HEADERS,
      body: JSON.stringify(body)
    }).then(() => window.location.reload());
  };

  const seuilsWithNom = (seuils || []).map(s => {
    const camping = campings.find(c => c.id === s.camping_id);
    return {
      ...s,
      nom_camping: camping ? camping.nom : "Inconnu"
    };
  });

  const alertMessage = (val, seuil, type) => val >= seuil ? `⚠️ Surconsommation ${type} : ${val}` : "";

  const years = [...new Set((releves || []).map(r => new Date(r.date_releve).getFullYear().toString()))];

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Ajouter un relevé</h2>
      <select onChange={e => setSelectedCamping(parseInt(e.target.value))}>
        <option value="">-- Sélectionner un camping --</option>
        {(campings || []).map(c => (
          <option key={c.id} value={c.id}>{c.nom}</option>
        ))}
      </select>
      <input type="date" onChange={e => setDate(e.target.value)} />
      <input placeholder="Compteur Eau" onChange={e => setEau(e.target.value)} />
      <input placeholder="Compteur Électricité" onChange={e => setElec(e.target.value)} />
      <input placeholder="Compteur Gaz" onChange={e => setGaz(e.target.value)} />
      <button onClick={handleSubmit}>Enregistrer</button>

      <h2>Paramétrer les seuils</h2>
      <input placeholder="Seuil Eau" value={seuilEau} onChange={e => setSeuilEau(e.target.value)} />
      <input placeholder="Seuil Électricité" value={seuilElec} onChange={e => setSeuilElec(e.target.value)} />
      <input placeholder="Seuil Gaz" value={seuilGaz} onChange={e => setSeuilGaz(e.target.value)} />
      <button onClick={handleSeuilSubmit}>Enregistrer les seuils</button>
      <CSVLink data={seuilsWithNom} filename="seuils-export.csv">
        <button>Exporter les seuils</button>
      </CSVLink>

      <h2>Historique des relevés</h2>
      <select onChange={e => setSelectedYear(e.target.value)}>
        <option value="">Toutes les années</option>
        {(years || []).map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <CSVLink data={filteredReleves} filename="releves-export.csv">
        <button>Exporter CSV</button>
      </CSVLink>

      <LineChart width={700} height={300} data={filteredReleves}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date_releve" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="compteur_eau" stroke="#8884d8" name="Eau" />
        <Line type="monotone" dataKey="compteur_elec" stroke="#82ca9d" name="Électricité" />
        <Line type="monotone" dataKey="compteur_gaz" stroke="#ffc658" name="Gaz" />
      </LineChart>

      <ul style={{ color: 'red' }}>
        {(filteredReleves || []).map((r, idx) => (
          <li key={idx}>
            {alertMessage(r.compteur_eau, seuilEau, "eau")} {alertMessage(r.compteur_elec, seuilElec, "élec")} {alertMessage(r.compteur_gaz, seuilGaz, "gaz")}
          </li>
        ))}
      </ul>
    </div>
  );
}
