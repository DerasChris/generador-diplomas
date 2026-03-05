import { useState, useEffect, useRef } from "react";
import axios from "axios";

const BASE = "http://localhost:5000";

const PROVIDERS = [
  {
    id: "outlook",
    label: "Outlook / Office 365",
    icon: "🔵",
    host: "smtp.office365.com",
    port: 587,
    hint: (
      <>Usa tu correo <code>@outlook.com</code>, <code>@hotmail.com</code> o corporativo de Office 365.
      Contraseña normal — no requiere app password.</>
    ),
    docsUrl: "https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353",
  },
  {
    id: "gmail",
    label: "Gmail",
    icon: "🔴",
    host: "smtp.gmail.com",
    port: 587,
    hint: (
      <>Requiere una <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">App Password</a> (no tu contraseña normal).
      Activa la verificación en 2 pasos primero.</>
    ),
    docsUrl: "https://support.google.com/mail/answer/7126229",
  },
  {
    id: "custom",
    label: "Servidor propio",
    icon: "⚙️",
    host: "",
    port: 587,
    hint: <>Ingresa los datos SMTP de tu proveedor o servidor institucional.</>,
    docsUrl: null,
  },
];

function EmailModal({ count, config, setConfig, onSend, onClose }) {
  const [provider, setProvider] = useState("outlook");

  const applyPreset = (p) => {
    setProvider(p.id);
    if (p.host) setConfig(prev => ({ ...prev, host: p.host, port: p.port }));
  };

  const current = PROVIDERS.find(p => p.id === provider);
  const canSend = config.host && config.user && config.pass;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <h2>Configurar correo saliente</h2>
        <p style={{ marginBottom: 0 }}>
          Se enviarán <strong>{count} correos</strong> con el diploma adjunto.
        </p>

        {/* Provider selector */}
        <div className="provider-tabs">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              className={`provider-tab ${provider === p.id ? "active" : ""}`}
              onClick={() => applyPreset(p)}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        <div className="smtp-hint" style={{ marginBottom: 4 }}>
          💡 {current.hint}
          {current.docsUrl && (
            <> · <a href={current.docsUrl} target="_blank" rel="noreferrer">Ver documentación</a></>
          )}
        </div>

        <div className="email-form">
          <div className="email-row">
            <div className="control-group" style={{ flex: 2 }}>
              <label className="control-label">Servidor SMTP</label>
              <input className="control-input" value={config.host}
                onChange={e => setConfig(p => ({ ...p, host: e.target.value }))} />
            </div>
            <div className="control-group" style={{ flex: 1 }}>
              <label className="control-label">Puerto</label>
              <input className="control-input" type="number" value={config.port}
                onChange={e => setConfig(p => ({ ...p, port: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="email-row">
            <div className="control-group" style={{ flex: 1 }}>
              <label className="control-label">Usuario / Correo</label>
              <input className="control-input"
                placeholder={provider === "outlook" ? "tu@outlook.com" : provider === "gmail" ? "tu@gmail.com" : "usuario@dominio.com"}
                value={config.user}
                onChange={e => setConfig(p => ({ ...p, user: e.target.value }))} />
            </div>
            <div className="control-group" style={{ flex: 1 }}>
              <label className="control-label">
                {provider === "gmail" ? "App Password" : "Contraseña"}
              </label>
              <input className="control-input" type="password" value={config.pass}
                onChange={e => setConfig(p => ({ ...p, pass: e.target.value }))} />
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Remitente (De:) — opcional</label>
            <input className="control-input"
              placeholder={`Mi Universidad <${config.user || "no-reply@universidad.edu"}>`}
              value={config.from}
              onChange={e => setConfig(p => ({ ...p, from: e.target.value }))} />
          </div>

          <div className="control-group">
            <label className="control-label">Asunto</label>
            <input className="control-input" value={config.subject}
              onChange={e => setConfig(p => ({ ...p, subject: e.target.value }))} />
          </div>

          <div className="control-group">
            <label className="control-label">
              Cuerpo &nbsp;<span style={{ opacity: .45, fontWeight: 400 }}>usa {"{nombre}"} para personalizar</span>
            </label>
            <textarea className="names-textarea" rows={5} value={config.body}
              onChange={e => setConfig(p => ({ ...p, body: e.target.value }))} />
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={onSend} disabled={!canSend}
            style={{ opacity: canSend ? 1 : 0.4, cursor: canSend ? "pointer" : "not-allowed" }}>
            ✉ Enviar {count} correos
          </button>
        </div>
      </div>
    </div>
  );
}


export default function StepPreview({ template, position, textStyle, participantes, qrPosition, back }) {
  const [phase, setPhase]           = useState("idle"); // idle | generating | sending | done
  const [generados, setGenerados]   = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEmailCfg, setShowEmailCfg] = useState(false);
  const [emailConfig, setEmailConfig] = useState({ host: "", port: 587, user: "", pass: "", from: "", subject: "Tu diploma de participación", body: "Hola {nombre},\n\nAdjunto encontrarás tu diploma. ¡Felicidades!\n\nSaludos." });

  // SSE progress for sending
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0, current: "", log: [] });
  const sseRef = useRef(null);

  const nombres = participantes.map(p => p.nombre);
  const font    = textStyle?.fontFamily || "Georgia, serif";
  const size    = textStyle?.fontSize   || 36;
  const color   = textStyle?.color      || "#1a237e";

  const posX  = position?.canvasW ? (position.x / position.canvasW) * 100 : 50;
  const posY  = position?.canvasH ? (position.y / position.canvasH) * 100 : 45;
  const qrX   = qrPosition?.canvasW ? (qrPosition.x    / qrPosition.canvasW) * 100 : 88;
  const qrY   = qrPosition?.canvasH ? (qrPosition.y    / qrPosition.canvasH) * 100 : 82;
  const qrSz  = qrPosition?.canvasW ? (qrPosition.size / qrPosition.canvasW) * 100 : 9;

  const hasEmails = participantes.some(p => p.email);

  const generate = async () => {
    setPhase("generating");
    setShowConfirm(false);
    try {
      const res = await axios.post(`${BASE}/generate-diplomas`, {
        plantilla:   template.replace(`${BASE}/`, ""),
        nombres:     participantes.map(p => ({ nombre: p.nombre })),
        position, textStyle, qrPosition,
      });
      const results = res.data.files.map((fp, i) => {
        const filename = fp.replace(/\\/g, "/").split("/").pop();
        return {
          ...participantes[i],
          filename,
          downloadUrl: `${BASE}/diplomas/${filename}`,
          viewUrl:     `${BASE}/view/${filename}`,
          emailStatus: participantes[i].email ? "pending" : "no-email",
        };
      });
      setGenerados(results);
      setPhase("done");
    } catch (e) {
      alert("Error: " + (e.message || ""));
      setPhase("idle");
    }
  };

  const sendEmails = () => {
    setPhase("sending");
    setShowEmailCfg(false);
    const withEmail = generados.filter(g => g.email);
    setSendProgress({ sent: 0, failed: 0, total: withEmail.length, current: "", log: [] });

    // Open SSE stream
    const sse = new EventSource(`${BASE}/send-emails-stream`);
    sseRef.current = sse;

    // Kick off the actual sending via POST (SSE just streams progress)
    axios.post(`${BASE}/send-emails`, {
      participantes: withEmail.map(g => ({ nombre: g.nombre, email: g.email, filename: g.filename })),
      emailConfig,
    }).then(() => { sse.close(); setPhase("done"); })
      .catch(err => {
        sse.close();
        setPhase("done");
        const detail = err.response?.data?.detail || err.response?.data?.error || err.message;
        const tip    = err.response?.data?.tip || "";
        alert(`Error SMTP: ${detail}${tip ? "\n\n💡 " + tip : ""}`);
      });

    sse.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setSendProgress(prev => ({
        ...prev,
        sent:    data.sent    ?? prev.sent,
        failed:  data.failed  ?? prev.failed,
        current: data.current ?? prev.current,
        log:     data.log ? [...prev.log, data.log] : prev.log,
      }));
      if (data.done) { sse.close(); setPhase("done"); }
    };
  };

  const progressPct = sendProgress.total
    ? Math.round(((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100)
    : 0;

  return (
    <div className="preview-step">
      <div className="step-intro">
        <p className="step-eyebrow">Paso 03</p>
        <h1 className="step-title">
          {phase === "done" && generados.length > 0 ? "Diplomas generados" : "Vista Previa"}
        </h1>
        <p className="step-desc">
          {phase === "sending"
            ? `Enviando diplomas por correo — ${sendProgress.sent} de ${sendProgress.total} enviados...`
            : phase === "done" && generados.length > 0
            ? `${generados.length} diplomas con QR incrustado listos.`
            : `Revisa cómo quedará cada diploma antes de generar.`}
        </p>
      </div>

      {/* Sending progress bar */}
      {phase === "sending" && (
        <div className="send-progress-box">
          <div className="send-progress-header">
            <span>Enviando correos… {sendProgress.sent + sendProgress.failed}/{sendProgress.total}</span>
            <span style={{ color: "#74c69d" }}>{sendProgress.sent} ✓</span>
            {sendProgress.failed > 0 && <span style={{ color: "#f87171" }}>{sendProgress.failed} ✗</span>}
          </div>
          <div className="send-progress-bar">
            <div className="send-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="send-progress-current">{sendProgress.current}</div>
          <div className="send-progress-log">
            {sendProgress.log.slice(-6).map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}

      {/* Cards grid */}
      <div className="preview-grid">
        {participantes.map((p, i) => {
          const result = generados.find(g => g.nombre === p.nombre);
          return (
            <div className="preview-card" key={i}>
              <div className="preview-card-img">
                <img src={template} alt="diploma" draggable={false} />
                <div className="preview-card-name-overlay" style={{
                  left: `${posX}%`, top: `${posY}%`,
                  color, fontFamily: font,
                  fontSize: `${Math.max(7, Math.round(size * 0.27))}px`,
                }}>{p.nombre}</div>
                {/* QR placeholder */}
                <div style={{ position:"absolute", left:`${qrX}%`, top:`${qrY}%`,
                  width:`${qrSz}%`, paddingBottom:`${qrSz}%`, transform:"translate(-50%,-50%)", pointerEvents:"none" }}>
                  <div style={{ position:"absolute", inset:0, background:"white",
                    border:"1px solid rgba(107,26,43,0.35)", borderRadius:2,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="60%" height="60%" viewBox="0 0 21 21" fill="none">
                      <rect x="1" y="1" width="8" height="8" rx="1" fill="none" stroke="#6B1A2B" strokeWidth="1.5"/>
                      <rect x="3" y="3" width="4" height="4" fill="#6B1A2B"/>
                      <rect x="12" y="1" width="8" height="8" rx="1" fill="none" stroke="#6B1A2B" strokeWidth="1.5"/>
                      <rect x="14" y="3" width="4" height="4" fill="#6B1A2B"/>
                      <rect x="1" y="12" width="8" height="8" rx="1" fill="none" stroke="#6B1A2B" strokeWidth="1.5"/>
                      <rect x="3" y="14" width="4" height="4" fill="#6B1A2B"/>
                      <rect x="12" y="12" width="2" height="2" fill="#6B1A2B"/>
                      <rect x="15" y="12" width="2" height="2" fill="#6B1A2B"/>
                      <rect x="18" y="12" width="2" height="2" fill="#6B1A2B"/>
                      <rect x="12" y="15" width="2" height="2" fill="#6B1A2B"/>
                      <rect x="15" y="15" width="2" height="2" fill="#6B1A2B"/>
                      <rect x="18" y="18" width="2" height="2" fill="#6B1A2B"/>
                      <rect x="12" y="18" width="2" height="2" fill="#6B1A2B"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="preview-card-footer">
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="preview-card-label">{p.nombre}</div>
                  {p.email && (
                    <div style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"monospace", marginTop:2 }}>
                      {p.email}
                      {result?.emailStatus === "sent"   && <span style={{ color:"#74c69d", marginLeft:6 }}>✓ enviado</span>}
                      {result?.emailStatus === "failed" && <span style={{ color:"#f87171", marginLeft:6 }}>✗ error</span>}
                    </div>
                  )}
                  {result && (
                    <div style={{ display:"flex", gap:6, marginTop:6 }}>
                      <a href={result.downloadUrl} target="_blank" rel="noreferrer" className="card-action-btn">↓ PDF</a>
                      <a href={result.viewUrl}     target="_blank" rel="noreferrer" className="card-action-btn">Ver</a>
                    </div>
                  )}
                </div>
                <span className="preview-card-badge">#{String(i+1).padStart(2,"0")}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action bar */}
      <div className="preview-actions">
        <div className="preview-actions-info">
          {phase === "done" && generados.length > 0 ? (
            <p style={{ color:"#74c69d", fontWeight:500 }}>
              ✓ {generados.length} diplomas generados
              {sendProgress.sent > 0 && ` · ${sendProgress.sent} correos enviados`}
            </p>
          ) : (
            <p><strong>{participantes.length} diplomas</strong> · {font.split(",")[0]} · {size}px · QR incrustado</p>
          )}
        </div>
        <button className="btn-secondary" onClick={back}>← Volver</button>

        {phase === "idle" && (
          <button className="btn-primary" onClick={() => setShowConfirm(true)}>
            Generar diplomas
          </button>
        )}
        {phase === "generating" && (
          <button className="btn-primary btn-disabled" disabled>
            <span className="spinner"/> Generando…
          </button>
        )}
        {phase === "done" && generados.length > 0 && hasEmails && (
          <button className="btn-primary" onClick={() => setShowEmailCfg(true)}>
            ✉ Enviar por correo
          </button>
        )}
      </div>

      {/* Confirm generate modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>¿Confirmar generación?</h2>
            <p>Se generarán <strong>{participantes.length} diplomas</strong> en PDF con QR incrustado.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>Cancelar</button>
              <button className="btn-primary" onClick={generate}>Sí, generar</button>
            </div>
          </div>
        </div>
      )}

      {/* Email config modal */}
      {showEmailCfg && (
        <EmailModal
          count={participantes.filter(p=>p.email).length}
          config={emailConfig}
          setConfig={setEmailConfig}
          onSend={sendEmails}
          onClose={() => setShowEmailCfg(false)}
        />
      )}
    </div>
  );
}