import { getResend } from "@/lib/email/resend";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c];
  });
}

/**
 * Email neutre servant à la fois à l'invitation (1re définition du mot de passe)
 * et à la réinitialisation. `link` mène vers /nouveau-mot-de-passe?token=...
 */
export async function sendPasswordEmail(params: { to: string; name: string; link: string }) {
  const { to, name, link } = params;
  return getResend().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Ma Parcelle — Définissez votre mot de passe",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;color:#22201D">
        <h1 style="font-size:20px;color:#B1502F">Ma Parcelle</h1>
        <p>Bonjour ${escapeHtml(name)},</p>
        <p>Pour accéder à votre compte, définissez votre mot de passe en cliquant sur le bouton ci-dessous.</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${link}" style="background:#B1502F;color:#FFFDF9;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Définir mon mot de passe</a>
        </p>
        <p style="font-size:13px;color:#5A554C">Ce lien expire après un délai limité. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    `,
  });
}
