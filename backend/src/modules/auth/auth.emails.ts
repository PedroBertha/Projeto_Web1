import type { MailMessage } from '../../mail/mailer.js'

export function buildConfirmationEmail(params: {
  to: string
  name: string
  confirmUrl: string
}): MailMessage {
  return {
    to: params.to,
    subject: 'Confirme seu e-mail',
    text: [
      `Olá, ${params.name}!`,
      '',
      'Para ativar sua conta, confirme seu e-mail pelo link abaixo:',
      params.confirmUrl,
      '',
      'O link vale por 24 horas. Se você não criou esta conta, ignore esta mensagem.',
    ].join('\n'),
  }
}
