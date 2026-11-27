import type { MailMessage } from '../../mail/mailer.js'

const APP_NAME = 'Nexo'

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

export function buildConfirmationEmail(params: {
  to: string
  name: string
  confirmUrl: string
}): MailMessage {
  const name = escapeHtml(params.name)
  const url = escapeHtml(params.confirmUrl)

  return {
    to: params.to,
    subject: `Confirme seu e-mail no ${APP_NAME}`,
    text: [
      `Olá, ${params.name}!`,
      '',
      `Para ativar sua conta no ${APP_NAME}, confirme seu e-mail pelo link abaixo:`,
      params.confirmUrl,
      '',
      `O link vale por 24 horas. Se você não criou uma conta no ${APP_NAME}, ignore esta mensagem.`,
      '',
      `Equipe ${APP_NAME}`,
    ].join('\n'),
    html: `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8"><title>Confirme seu e-mail no ${APP_NAME}</title></head>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px">
      <tr><td>
        <p style="margin:0 0 24px;font-size:22px;font-weight:bold;letter-spacing:0.5px;color:#2563eb">${APP_NAME}</p>
        <h1 style="font-size:20px;margin:0 0 16px">Olá, ${name}!</h1>
        <p style="margin:0 0 24px;line-height:1.5">Para ativar sua conta no ${APP_NAME}, confirme seu e-mail.</p>
        <p style="margin:0 0 24px"><a href="${url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold">Confirmar e-mail</a></p>
        <p style="margin:0 0 8px;font-size:13px;color:#52525b">Se o botão não funcionar, copie este endereço no navegador:</p>
        <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${url}" style="color:#2563eb">${url}</a></p>
        <p style="margin:0;font-size:13px;color:#52525b">O link vale por 24 horas. Se você não criou uma conta no ${APP_NAME}, ignore esta mensagem.</p>
      </td></tr>
    </table>
  </body>
</html>`,
  }
}
