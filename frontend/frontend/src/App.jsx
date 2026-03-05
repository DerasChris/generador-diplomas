import { useState, useEffect } from "react";
import StepEditor    from "./pages/StepEditor";
import StepGenerator from "./pages/StepGenerator";
import StepPreview   from "./pages/StepPreview";

function usePersistedState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch { return defaultValue; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);
  return [state, setState];
}

const STEPS = [
  { num: "01", label: "Diseñar"   },
  { num: "02", label: "Nombres"   },
  { num: "03", label: "Confirmar" },
];

function App() {
  const [step,          setStep]          = usePersistedState("df_step",         1);
  const [template,      setTemplate]      = usePersistedState("df_template",     null);
  const [position,      setPosition]      = usePersistedState("df_position",     null);
  const [qrPosition,    setQrPosition]    = usePersistedState("df_qrPosition",   null);
  const [textStyle,     setTextStyle]     = usePersistedState("df_textStyle",    { fontFamily:"Georgia, serif", fontSize:36, color:"#1a237e" });
  const [participantes, setParticipantes] = usePersistedState("df_participantes", []);

  const reset = () => {
    ["df_step","df_template","df_position","df_qrPosition","df_textStyle","df_participantes"]
      .forEach(k => localStorage.removeItem(k));
    setStep(1); setTemplate(null); setPosition(null); setQrPosition(null);
    setTextStyle({ fontFamily:"Georgia, serif", fontSize:36, color:"#1a237e" });
    setParticipantes([]);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo-mark">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <rect x="0"  y="0"  width="12" height="12" fill="#6B1A2B"/>
              <rect x="16" y="0"  width="12" height="12" fill="#6B1A2B" opacity="0.4"/>
              <rect x="0"  y="16" width="12" height="12" fill="#6B1A2B" opacity="0.4"/>
              <rect x="16" y="16" width="12" height="12" fill="#6B1A2B"/>
            </svg>
            <span className="logo-text">DiplomaForge</span>
          </div>

          <nav className="step-nav">
            {STEPS.map((s, i) => {
              const n = i + 1;
              return (
                <div key={s.num} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {i > 0 && <div className="step-connector"/>}
                  <button
                    className={`step-pill ${step === n ? "active" : step > n ? "done" : ""}`}
                    onClick={() => step > n && setStep(n)}
                  >
                    <span className="step-num">{s.num}</span>
                    <span className="step-label">{s.label}</span>
                  </button>
                </div>
              );
            })}
          </nav>

          <button className="btn-reset" onClick={reset} title="Reiniciar">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M2 8a6 6 0 1 0 1.5-4M2 4v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Reiniciar
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="step-panel" key={step}>
          {step === 1 && (
            <StepEditor
              template={template} setTemplate={setTemplate}
              setPosition={setPosition}
              qrPosition={qrPosition} setQrPosition={setQrPosition}
              textStyle={textStyle} setTextStyle={setTextStyle}
              next={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepGenerator
              template={template} position={position} textStyle={textStyle}
              initialParticipantes={participantes}
              onParticipantes={setParticipantes}
              next={() => setStep(3)}
              back={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepPreview
              template={template} position={position}
              textStyle={textStyle} participantes={participantes}
              qrPosition={qrPosition}
              back={() => setStep(2)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;