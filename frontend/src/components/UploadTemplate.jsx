import axios from "axios";
import { useState } from "react";

export default function UploadTemplate({ setTemplate }) {
  const [fileName, setFileName] = useState(null);
  const [dragging, setDragging] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("template", file);
    const res = await axios.post("https://generador-diplomas.onrender.com/upload-template", formData);
    setTemplate("https://generador-diplomas.onrender.com/uploads/" + res.data.file);
    setFileName(file.name);
  };

  const handleChange = (e) => upload(e.target.files[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    upload(e.dataTransfer.files[0]);
  };

  return (
    <div className="upload-section">
      <p className="upload-section-label">Plantilla</p>
      <label
        className={`upload-dropzone ${dragging ? "dragging" : ""} ${fileName ? "uploaded" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input type="file" accept="image/*" onChange={handleChange} style={{ display: "none" }} />

        {fileName ? (
          <div className="upload-done">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" fill="#C9A84C" opacity="0.15"/>
              <path d="M6 10l3 3 5-5" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="upload-filename">{fileName}</span>
            <span className="upload-change">Cambiar</span>
          </div>
        ) : (
          <div className="upload-prompt">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 15V3M7 8l5-5 5 5" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="upload-main-text">Arrastra tu imagen aquí</span>
            <span className="upload-sub-text">o haz clic para explorar</span>
          </div>
        )}
      </label>
    </div>
  );
}