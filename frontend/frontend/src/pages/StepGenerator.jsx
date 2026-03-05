import { useState, useRef } from "react";

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (!lines.length) return [];
  const header = lines[0].toLowerCase().split(",").map(h => h.trim());
  const nameIdx  = header.findIndex(h => h.includes("nombre") || h.includes("name"));
  const emailIdx = header.findIndex(h => h.includes("email") || h.includes("correo") || h.includes("mail"));

  if (nameIdx === -1) return null; // invalid CSV

  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    return {
      nombre: cols[nameIdx] || "",
      email:  emailIdx !== -1 ? cols[emailIdx] || "" : "",
    };
  }).filter(r => r.nombre);
}

export default function StepGenerator({ template, position, textStyle, initialParticipantes, onParticipantes, next, back }) {
  const [mode, setMode]   = useState("manual"); // "manual" | "csv"
  const [text, setText]   = useState(
    Array.isArray(initialParticipantes) && initialParticipantes.length > 0
      ? initialParticipantes.map(p => `${p.nombre}${p.email ? "," + p.email : ""}`).join("\n")
      : ""
  );
  const [csvError, setCsvError] = useState("");
  const fileRef = useRef(null);

  // Parse participantes from textarea (manual: one per line; csv: name,email)
  const participantes = (() => {
    if (!text.trim()) return [];
    if (mode === "csv") {
      const result = parseCSV(text);
      if (!result) { setCsvError("CSV inválido — necesita columna 'nombre' y opcionalmente 'email'"); return []; }
      setCsvError("");
      return result;
    }
    // Manual mode: each line is "Nombre" or "Nombre, email@x.com"
    return text.split("\n").map(line => {
      const parts = line.split(",");
      return { nombre: parts[0].trim(), email: parts[1]?.trim() || "" };
    }).filter(p => p.nombre);
  })();

  const hasEmails = participantes.some(p => p.email);

  const handleCSVFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setText(ev.target.result); setMode("csv"); };
    reader.readAsText(file);
  };

  const handleNext = () => {
    onParticipantes(participantes);
    next();
  };

  return (
    <div className="step-generator">
      <div className="step-intro">
        <p className="step-eyebrow">Paso 02</p>
        <h1 className="step-title">Participantes</h1>
        <p className="step-desc">
          Ingresa los participantes manualmente o sube un CSV con columnas <code>nombre,email</code>.
          El email es opcional pero necesario para enviar diplomas por correo.
        </p>
      </div>

      <div className="generator-layout">
        <div className="names-panel">

          {/* Mode tabs */}
          <div className="mode-tabs">
            <button className={`mode-tab ${mode === "manual" ? "active" : ""}`} onClick={() => setMode("manual")}>
              ✏️ Manual
            </button>
            <button className={`mode-tab ${mode === "csv" ? "active" : ""}`} onClick={() => { setMode("csv"); fileRef.current?.click(); }}>
              📄 Subir CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleCSVFile} style={{ display: "none" }} />
          </div>

          <div className="names-header">
            <label className="names-label">
              {mode === "manual" ? "Un participante por línea: Nombre, email@correo.com" : "Contenido del CSV"}
            </label>
            {participantes.length > 0 && (
              <span className="names-count">{participantes.length} participantes</span>
            )}
          </div>

          <textarea
            className="names-textarea"
            rows="14"
            placeholder={mode === "manual"
              ? "Juan Pérez, juan@email.com\nMaría López, maria@email.com\nCarlos Ramírez"
              : "nombre,email\nJuan Pérez,juan@email.com\nMaría López,maria@email.com"
            }
            value={text}
            onChange={e => setText(e.target.value)}
          />

          {csvError && <p style={{ color: "#f87171", fontSize: 13 }}>⚠ {csvError}</p>}

          {hasEmails && (
            <div className="email-notice">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="10" rx="2" stroke="#c9707f" strokeWidth="1.5"/>
                <path d="M1 5l7 5 7-5" stroke="#c9707f" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {participantes.filter(p => p.email).length} de {participantes.length} participantes tienen email — se podrán enviar diplomas por correo.
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-secondary" onClick={back}>← Volver</button>
            <button
              className={`btn-primary ${!participantes.length ? "btn-disabled" : ""}`}
              style={{ flex: 1 }}
              onClick={handleNext}
              disabled={!participantes.length}
            >
              <span>Ver vista previa</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Preview list */}
        <div className="preview-panel">
          <p className="preview-label">Vista previa</p>
          <div className="names-list">
            {participantes.length === 0 ? (
              <p className="preview-empty">Los participantes aparecerán aquí...</p>
            ) : (
              participantes.map((p, i) => (
                <div key={i} className="name-item">
                  <span className="name-index">{String(i + 1).padStart(2, "0")}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="name-text">{p.nombre}</span>
                    {p.email && <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{p.email}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}