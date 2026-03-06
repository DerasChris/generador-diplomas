import { useEffect, useRef, useState } from "react";

export default function CanvasEditor({ template, setPosition, textStyle = {}, qrPosition, setQrPosition }) {
  const wrapperRef = useRef(null);
  const [imgSize, setImgSize]     = useState({ w: 0, h: 0 });
  const [pos, setPos]             = useState({ x: 0.5,  y: 0.45 });
  const [qrPos, setQrPos]         = useState({ x: 0.88, y: 0.82, size: 0.09 });
  const draggingText = useRef(false);
  const draggingQR   = useRef(false);
  const dragOffset   = useRef({ x: 0, y: 0 });

  const font  = textStyle.fontFamily || "Georgia, serif";
  const size  = textStyle.fontSize   || 36;
  const color = textStyle.color      || "#1a237e";

  useEffect(() => {
    if (!template) return;
    const img = new window.Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = template;
  }, [template]);

  // Report text position
  useEffect(() => {
    if (!wrapperRef.current || !imgSize.w) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setPosition?.({
      x: Math.round(pos.x * rect.width),
      y: Math.round(pos.y * rect.height),
      canvasW: Math.round(rect.width),
      canvasH: Math.round(rect.height),
    });
  }, [pos, imgSize]);

  // Report QR position
  useEffect(() => {
    if (!wrapperRef.current || !imgSize.w) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setQrPosition?.({
      x:      Math.round(qrPos.x * rect.width),
      y:      Math.round(qrPos.y * rect.height),
      size:   Math.round(qrPos.size * rect.width),
      canvasW: Math.round(rect.width),
      canvasH: Math.round(rect.height),
    });
  }, [qrPos, imgSize]);

  const makeDragHandler = (isQR) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left - rect.width  / 2,
      y: e.clientY - rect.top  - rect.height / 2,
    };
    if (isQR) draggingQR.current   = true;
    else      draggingText.current = true;

    const onMove = (ev) => {
      if (!wrapperRef.current) return;
      const wRect = wrapperRef.current.getBoundingClientRect();
      const nx = Math.min(Math.max((ev.clientX - dragOffset.current.x - wRect.left) / wRect.width,  0.01), 0.99);
      const ny = Math.min(Math.max((ev.clientY - dragOffset.current.y - wRect.top)  / wRect.height, 0.01), 0.99);
      if (isQR) setQrPos(p => ({ ...p, x: nx, y: ny }));
      else      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      draggingText.current = false;
      draggingQR.current   = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  if (!template) return null;
  const aspectRatio = imgSize.w && imgSize.h ? imgSize.h / imgSize.w : 0.7;
  const qrSizePct   = qrPos.size * 100;

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative", width: "100%",
        paddingBottom: `${aspectRatio * 100}%`,
        background: "#111", borderRadius: 8,
        overflow: "hidden", userSelect: "none",
      }}
    >
      {/* Template */}
      <img src={template} alt="Plantilla" draggable={false}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%",
          objectFit:"contain", pointerEvents:"none" }} />

      {/* Center guides */}
      <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:1,
        background:"rgba(255,255,255,0.15)", transform:"translateX(-50%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1,
        background:"rgba(255,255,255,0.15)", transform:"translateY(-50%)", pointerEvents:"none" }} />

      {/* Draggable name label */}
      {imgSize.w > 0 && (
        <div onMouseDown={makeDragHandler(false)} style={{
          position:"absolute", left:`${pos.x*100}%`, top:`${pos.y*100}%`,
          transform:"translate(-50%,-50%)", cursor:"grab",
          padding:"4px 16px", background:"rgba(255,255,255,0.88)",
          backdropFilter:"blur(4px)", border:"1.5px dashed rgba(107,26,43,0.8)",
          borderRadius:4, color, fontFamily:font,
          fontSize:`${Math.min(size,32)}px`, fontWeight:600,
          whiteSpace:"nowrap", boxShadow:"0 2px 12px rgba(0,0,0,0.25)", zIndex:10,
        }}>
          NOMBRE
        </div>
      )}

      {/* Draggable QR placeholder */}
      {imgSize.w > 0 && (
        <div onMouseDown={makeDragHandler(true)} style={{
          position:"absolute",
          left:`${qrPos.x*100}%`, top:`${qrPos.y*100}%`,
          width:`${qrSizePct}%`, paddingBottom:`${qrSizePct}%`,
          transform:"translate(-50%,-50%)",
          cursor:"grab", zIndex:10,
        }}>
          <div style={{
            position:"absolute", inset:0,
            background:"white",
            border:"2px dashed rgba(107,26,43,0.7)",
            borderRadius:4,
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            gap:2,
          }}>
            {/* Mini QR grid icon */}
            <svg width="40%" height="40%" viewBox="0 0 21 21" fill="none">
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
            <span style={{ fontSize:"clamp(6px,1vw,10px)", color:"#6B1A2B", fontWeight:600, fontFamily:"sans-serif" }}>QR</span>
          </div>
        </div>
      )}
    </div>
  );
}