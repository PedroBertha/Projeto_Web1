export interface MailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

// Envio de e-mails. A implementação real (SMTP ou um serviço de e-mail) pode
// ser trocada sem alterar os módulos que enviam mensagens.
export interface Mailer {
  send(message: MailMessage): Promise<void>
}

// Transporte de desenvolvimento: escreve a mensagem no terminal do servidor.
export class ConsoleMailer implements Mailer {
  async send(message: MailMessage): Promise<void> {
    console.info(
      [
        '--- E-mail (transporte de desenvolvimento) ---',
        `Para: ${message.to}`,
        `Assunto: ${message.subject}`,
        '',
        message.text,
        '----------------------------------------------',
      ].join('\n'),
    )
  }
}
