import { useState } from "react";
import UploadTemplate from "../components/UploadTemplate";
import CanvasEditor from "../components/CanvasEditor";

const FONTS = [
  { label: "Georgia",     value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Palatino",    value: "Palatino, serif" },
  { label: "Arial",       value: "Arial, sans-serif" },
  { label: "Verdana",     value: "Verdana, sans-serif" },
  { label: "Trebuchet",   value: "'Trebuchet MS', sans-serif" },
  { label: "Courier",     value: "'Courier New', monospace" },
];

const COLORS = [
  { label: "Azul marino",  value: "#1a237e" },
  { label: "Negro",        value: "#111111" },
  { label: "Dorado",       value: "#b8860b" },
  { label: "Granate",      value: "#7b0000" },
  { label: "Verde oscuro", value: "#1b4332" },
  { label: "Gris",         value: "#444444" },
  { label: "Blanco",       value: "#ffffff" },
];

export default function StepEditor({ template, setTemplate, setPosition, qrPosition, setQrPosition, textStyle, setTextStyle, next }) {

  const set = (key, val) => setTextStyle(prev => ({ ...prev, [key]: val }));

  return (
    <div className="step-editor">
      <div className="step-intro">
        <p className="step-eyebrow">Paso 01</p>
        <h1 className="step-title">Diseñar Diploma</h1>
        <p className="step-desc">
          Sube tu plantilla, personaliza el texto y arrástralo al lugar correcto.
        </p>
      </div>

      <div className="editor-layout">
        <aside className="editor-sidebar">
          <UploadTemplate setTemplate={setTemplate} />

          {/* ── Text style controls ── */}
          <div className="style-panel">
            <p className="style-panel-title">Estilo del nombre</p>

            {/* Font family */}
            <div className="control-group">
              <label className="control-label">Tipografía</label>
              <select
                className="control-select"
                value={textStyle.fontFamily}
                onChange={e => set("fontFamily", e.target.value)}
              >
                {FONTS.map(f => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font size */}
            <div className="control-group">
              <label className="control-label">
                Tamaño
                <span className="control-value">{textStyle.fontSize}px</span>
              </label>
              <input
                type="range"
                className="control-range"
                min={14} max={72} step={1}
                value={textStyle.fontSize}
                onChange={e => set("fontSize", Number(e.target.value))}
              />
              <div className="range-labels">
                <span>14</span><span>72</span>
              </div>
            </div>

            {/* Color */}
            <div className="control-group">
              <label className="control-label">Color</label>
              <div className="color-swatches">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    title={c.label}
                    className={`color-swatch ${textStyle.color === c.value ? "active" : ""}`}
                    style={{ background: c.value }}
                    onClick={() => set("color", c.value)}
                  />
                ))}
                {/* Custom color picker */}
                <label className="color-swatch color-custom" title="Color personalizado">
                  <input
                    type="color"
                    value={textStyle.color}
                    onChange={e => set("color", e.target.value)}
                    style={{ opacity: 0, position: "absolute", width: 0, height: 0 }}
                  />
                  +
                </label>
              </div>
            </div>

            {/* Live preview */}
            <div className="text-preview">
              <span style={{
                fontFamily: textStyle.fontFamily,
                fontSize: Math.min(textStyle.fontSize, 28),
                color: textStyle.color,
                fontWeight: 600,
              }}>
                Juan Pérez
              </span>
            </div>
          </div>

          <div className="sidebar-hint">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#C9A84C" strokeWidth="1.5"/>
              <path d="M8 7v4M8 5.5v.5" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p>Arrastra el texto sobre el diploma para posicionarlo.</p>
          </div>

          <button
            className={`btn-primary ${!template ? "btn-disabled" : ""}`}
            onClick={next}
            disabled={!template}
          >
            <span>Continuar</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </aside>

        {/* Canvas */}
        <div className="canvas-wrapper">
          {!template && (
            <div className="canvas-placeholder">
              <div className="placeholder-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="4" y="8" width="32" height="24" rx="2" stroke="#C9A84C" strokeWidth="1.5" opacity="0.5"/>
                  <path d="M4 28l10-8 6 5 5-4 11 7" stroke="#C9A84C" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5"/>
                  <circle cx="13" cy="16" r="3" stroke="#C9A84C" strokeWidth="1.5" opacity="0.5"/>
                </svg>
              </div>
              <p className="placeholder-text">Sube una plantilla para comenzar</p>
            </div>
          )}
          <CanvasEditor
            template={template}
            setPosition={setPosition}
            textStyle={textStyle}
            qrPosition={qrPosition}
            setQrPosition={setQrPosition}
          />
        </div>
      </div>
    </div>
  );
}