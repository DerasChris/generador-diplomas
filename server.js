const express    = require("express");
const cors       = require("cors");
const fs         = require("fs");
const path       = require("path");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads",  express.static("uploads"));
app.use("/diplomas", express.static("diplomas"));

app.get("/", (req, res) => res.send("DiplomaForge API 🚀"));

const { upload } = require("./routes/uploadRoutes");

app.post("/upload-template", upload.single("template"), (req, res) => {
  res.json({ message: "Plantilla subida", file: req.file.filename });
});

const csv = require("csv-parser");
app.post("/upload-csv", upload.single("file"), (req, res) => {
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", d => results.push(d))
    .on("end", () => res.json({ total: results.length, data: results }));
});

// Simple concurrency limiter (no external deps)
function runWithConcurrency(tasks, limit) {
  return new Promise((resolve, reject) => {
    const results = [];
    let started = 0, completed = 0;
    const total = tasks.length;
    if (total === 0) return resolve([]);

    function next() {
      if (started >= total) return;
      const i = started++;
      tasks[i]()
        .then(r => { results[i] = r; })
        .catch(e => { results[i] = { error: e.message }; })
        .finally(() => {
          completed++;
          if (completed === total) resolve(results);
          else next();
        });
    }
    for (let i = 0; i < Math.min(limit, total); i++) next();
  });
}

// ── Generate diplomas ──────────────────────────────────────────
const generarDiploma = require("./services/pdfGenerator");

app.post("/generate-diplomas", async (req, res) => {
  const { nombres, plantilla, position, textStyle, qrPosition } = req.body;
  if (!fs.existsSync("diplomas")) fs.mkdirSync("diplomas");
  try {
    const tasks = nombres.map(n =>
      () => generarDiploma(n.nombre, plantilla, position, textStyle, qrPosition)
    );
    const files = await runWithConcurrency(tasks, 5);
    res.json({ message: "Diplomas generados", total: files.length, files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── SSE clients ────────────────────────────────────────────────
const sseClients = new Set();

app.get("/send-emails-stream", (req, res) => {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.flushHeaders();
  sseClients.add(res);
  req.on("close", () => sseClients.delete(res));
});

function broadcast(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(c => c.write(msg));
}

// ── Send emails ────────────────────────────────────────────────
app.post("/send-emails", async (req, res) => {
  const { participantes, emailConfig } = req.body;

  const isOutlook = emailConfig.host?.includes("office365") || emailConfig.host?.includes("outlook");
  const isGmail   = emailConfig.host?.includes("gmail");

  const transportConfig = {
    host:   emailConfig.host,
    port:   Number(emailConfig.port) || 587,
    secure: Number(emailConfig.port) === 465,
    auth:   { user: emailConfig.user, pass: emailConfig.pass },
    // Outlook/Office365 requires these TLS settings
    ...(isOutlook && {
      tls: { ciphers: "SSLv3", rejectUnauthorized: false },
      requireTLS: true,
    }),
    // Gmail
    ...(isGmail && {
      tls: { rejectUnauthorized: false },
    }),
  };

  const transporter = nodemailer.createTransport(transportConfig);

  // Verify connection before sending anything
  try {
    await transporter.verify();
    console.log("✓ SMTP connection verified");
  } catch (verifyErr) {
    console.error("✗ SMTP verify failed:", verifyErr.message);
    return res.status(400).json({
      error: "No se pudo conectar al servidor SMTP",
      detail: verifyErr.message,
      tip: isOutlook
        ? "Verifica que SMTP básico esté habilitado para tu cuenta en el Centro de administración de Microsoft 365."
        : isGmail
        ? "Verifica que estés usando una App Password, no tu contraseña normal."
        : "Verifica host, puerto y credenciales.",
    });
  }

  let sent = 0, failed = 0;
  const total = participantes.length;

  const tasks = participantes.map(p => async () => {
    const filePath = path.join(__dirname, "diplomas", p.filename);
    const body = (emailConfig.body || "Hola {nombre}, adjunto tu diploma.")
                   .replace(/\{nombre\}/g, p.nombre);
    try {
      await transporter.sendMail({
        from:        emailConfig.from || emailConfig.user,
        to:          p.email,
        subject:     emailConfig.subject || "Tu diploma",
        text:        body,
        html:        `<p>${body.replace(/\n/g, "<br/>")}</p>`,
        attachments: [{ filename: p.filename, path: filePath }],
      });
      sent++;
      broadcast({ sent, failed, total, current: p.email, log: `✓ ${p.nombre} <${p.email}>` });
    } catch (err) {
      failed++;
      broadcast({ sent, failed, total, current: p.email, log: `✗ ${p.nombre}: ${err.message}` });
    }
  });

  await runWithConcurrency(tasks, 5);
  broadcast({ sent, failed, total, done: true });
  res.json({ message: "Envío completado", sent, failed });
});

// ── View diploma ───────────────────────────────────────────────
app.get("/view/:file", (req, res) => {
  const filename = path.basename(req.params.file);
  const filePath = path.join(__dirname, "diplomas", filename);
  const nombre   = decodeURIComponent(filename.replace(/_/g, " ").replace(".pdf", ""));
  const pdfUrl   = `/diplomas/${filename}`;
  if (!fs.existsSync(filePath)) return res.status(404).send("Diploma no encontrado");
  res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Diploma — ${nombre}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0e0c0d;font-family:system-ui,sans-serif;color:#fff;padding:24px;gap:16px}.eyebrow{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#c9707f;font-weight:600}h1{font-size:clamp(20px,5vw,34px);font-family:Georgia,serif;text-align:center}p{color:rgba(255,255,255,.45);font-size:14px;text-align:center}.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 26px;background:#6B1A2B;color:#fff;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600}.btn:hover{background:#8a2235}embed{width:100%;max-width:860px;height:55vh;border-radius:12px;border:1px solid rgba(255,255,255,.08);margin-top:8px}</style>
</head><body>
<div class="eyebrow">DiplomaForge</div>
<h1>${nombre}</h1><p>Diploma de participación</p>
<a class="btn" href="${pdfUrl}" download="${filename}">↓ Descargar PDF</a>
<embed src="${pdfUrl}" type="application/pdf"/>
</body></html>`);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));