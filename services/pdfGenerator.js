const PDFDocument = require("pdfkit");
const fs          = require("fs");
const path        = require("path");
const QRCode      = require("qrcode");   // npm install qrcode

const PDF_W = 842;
const PDF_H = 595;

function resolvePdfFont(fontFamily = "", bold = true) {
  const f = fontFamily.toLowerCase();
  if (f.includes("courier"))
    return bold ? "Courier-Bold" : "Courier";
  if (f.includes("times") || f.includes("georgia") || f.includes("palatino"))
    return bold ? "Times-Bold" : "Times-Roman";
  return bold ? "Helvetica-Bold" : "Helvetica";
}

async function generarDiploma(nombre, plantilla, position, textStyle = {}, qrPosition = null) {

  const doc      = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  const fileName = nombre.replace(/\s+/g, "_") + ".pdf";
  const filePath = path.join("diplomas", fileName);

  doc.pipe(fs.createWriteStream(filePath));

  // 1. Background image
  doc.image(plantilla, 0, 0, { width: PDF_W, height: PDF_H });

  // 2. Name text
  const fontSize = textStyle.fontSize  || 36;
  const color    = textStyle.color     || "#1a237e";
  const pdfFont  = resolvePdfFont(textStyle.fontFamily, true);

  let textY = PDF_H * 0.45;

  if (position?.canvasW && position?.canvasH) {
    const { x, y, canvasW, canvasH } = position;
    const imgAspect    = PDF_W / PDF_H;
    const canvasAspect = canvasW / canvasH;
    let imgW, imgH, imgOffsetX, imgOffsetY;

    if (canvasAspect > imgAspect) {
      imgH = canvasH; imgW = canvasH * imgAspect;
      imgOffsetX = (canvasW - imgW) / 2; imgOffsetY = 0;
    } else {
      imgW = canvasW; imgH = canvasW / imgAspect;
      imgOffsetX = 0; imgOffsetY = (canvasH - imgH) / 2;
    }

    textY = ((y - imgOffsetY) / imgH) * PDF_H;
  }

  doc
    .fontSize(fontSize)
    .fillColor(color)
    .font(pdfFont)
    .text(nombre, 0, textY - fontSize / 2, {
      align: "center",
      width: PDF_W,
      lineBreak: false,
    });

  // 3. QR code — generate as PNG buffer and embed in PDF
  const viewUrl = `http://localhost:5000/view/${fileName}`;

  const qrBuffer = await QRCode.toBuffer(viewUrl, {
    type:   "png",
    width:  120,
    margin: 1,
    color: { dark: "#3d0a13", light: "#ffffff" },
  });

  // Determine QR position: use qrPosition if provided, else bottom-right corner
  let qrX, qrY, qrSize;

  if (qrPosition?.canvasW && qrPosition?.canvasH) {
    const { x, y, canvasW, canvasH, size: s } = qrPosition;
    qrX    = (x / canvasW) * PDF_W;
    qrY    = (y / canvasH) * PDF_H;
    qrSize = s ? (s / canvasW) * PDF_W : 70;
  } else {
    // Default: bottom-right corner
    qrSize = 70;
    qrX    = PDF_W - qrSize - 20;
    qrY    = PDF_H - qrSize - 20;
  }

  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  doc.end();

  // Return a promise that resolves when the file is fully written
  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(filePath));
    doc.on("error", reject);
  });
}

module.exports = generarDiploma;