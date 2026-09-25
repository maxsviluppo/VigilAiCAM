import nodemailer from 'nodemailer';

const user = "allarme.vigilai@gmail.com";
const pass = "vgdutfqjbauomxxo";

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user, pass },
  tls: {
    rejectUnauthorized: false
  }
});

const mailOptions = {
  from: `"Vigil.AI Test" <${user}>`,
  to: "allarme.vigilai@gmail.com", // Send to self
  subject: "Test SMTP Vigil.AI",
  text: "Questo è un test per verificare la configurazione SMTP con la password per le app."
};

console.log("Tentativo di invio email test...");
try {
  const info = await transporter.sendMail(mailOptions);
  console.log("Email inviata con successo!", info.messageId);
} catch (error) {
  console.error("Errore durante l'invio dell'email:", error);
}
