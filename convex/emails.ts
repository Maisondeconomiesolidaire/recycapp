import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// Adresse d'expédition. En test (pas encore de domaine vérifié), on utilise
// l'adresse fournie par Resend. À remplacer par une adresse @votre-domaine
// une fois le domaine vérifié sur resend.com.
const FROM = "Cycle en Bray <onboarding@resend.dev>";

const TYPE_LABELS: Record<string, string> = {
  aerogommage: "Aérogommage",
  collecte: "Collecte",
  article: "Boutique",
  velo: "Cycle en Bray",
  livraison: "Livraison",
};

function typeLabel(type: string) {
  return TYPE_LABELS[type] ?? "Demande";
}

function formatDay(timestamp: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(timestamp));
}

/** Gabarit HTML commun (en-tête, contenu, pied de page). */
function layout(heading: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;background:#f5f5f4;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#27272a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7e5e4;">
      <tr>
        <td style="background:#f1104f;padding:20px 28px;">
          <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:0.5px;">Cycle en Bray</span>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">${heading}</h1>
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:18px 28px;border-top:1px solid #f4f4f5;color:#a1a1aa;font-size:12px;">
          Recyclerie Cycle en Bray · Ceci est un message automatique, merci de ne pas y répondre directement.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function resendSend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY non configurée — email ignoré.");
    return;
  }
  const email = to.trim();
  if (!email) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: FROM, to: [email], subject, html }),
  });

  if (!response.ok) {
    console.error(
      `Resend (${response.status}) :`,
      (await response.text()).slice(0, 300),
    );
  }
}

/** Confirmation à la réception d'une nouvelle demande. */
export const sendRequestConfirmation = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    reference: v.string(),
    type: v.string(),
  },
  handler: async (_ctx, { email, name, reference, type }) => {
    const label = typeLabel(type);
    const subject = `Demande bien reçue · ${label} #${reference}`;
    const html = layout(
      "Votre demande est bien enregistrée",
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Bonjour ${name},</p>
       <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Nous avons bien reçu votre demande <strong>${label}</strong> (référence <strong>#${reference}</strong>). Notre équipe la traite et revient vers vous très prochainement.</p>
       <p style="margin:0;font-size:15px;line-height:1.6;">Vous pouvez suivre son avancement et échanger avec nous depuis votre espace client.</p>`,
    );
    await resendSend(email, subject, html);
  },
});

/** Notification au client d'un nouveau message du staff. */
export const sendNewMessage = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    reference: v.string(),
    type: v.string(),
    snippet: v.string(),
  },
  handler: async (_ctx, { email, name, reference, type, snippet }) => {
    const label = typeLabel(type);
    const subject = `Nouveau message · ${label} #${reference}`;
    const html = layout(
      "Vous avez reçu un nouveau message",
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Bonjour ${name},</p>
       <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">L'équipe Cycle en Bray vous a envoyé un message concernant votre demande <strong>${label}</strong> (référence <strong>#${reference}</strong>) :</p>
       <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f5f5f4;border-left:3px solid #f1104f;border-radius:8px;font-size:15px;line-height:1.6;color:#3f3f46;">${snippet}</blockquote>
       <p style="margin:0;font-size:15px;line-height:1.6;">Connectez-vous à votre espace client pour répondre.</p>`,
    );
    await resendSend(email, subject, html);
  },
});

/** Notification au client que sa demande a été programmée à une date. */
export const sendScheduled = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    reference: v.string(),
    type: v.string(),
    date: v.number(),
  },
  handler: async (_ctx, { email, name, reference, type, date }) => {
    const label = typeLabel(type);
    const day = formatDay(date);
    const subject = `Intervention programmée · ${label} #${reference}`;
    const html = layout(
      "Votre demande est programmée",
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Bonjour ${name},</p>
       <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Bonne nouvelle : votre demande <strong>${label}</strong> (référence <strong>#${reference}</strong>) est programmée pour le :</p>
       <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#f1104f;">${day}</p>
       <p style="margin:0;font-size:15px;line-height:1.6;">Nous restons disponibles via votre espace client pour toute question.</p>`,
    );
    await resendSend(email, subject, html);
  },
});
