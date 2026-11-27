import nodemailer, { type Transporter } from 'nodemailer'
import type { MailMessage, Mailer } from './mailer.js'

export interface SmtpOptions {
  host: string
  port: number
  // true para a porta 465 (TLS direto); com 587 o TLS é negociado (STARTTLS).
  secure: boolean
  user: string
  pass: string
  from: string
}

// Envio real por SMTP. Funciona com Gmail (senha de app), Brevo, Mailtrap,
// Outlook ou qualquer provedor SMTP.
export class SmtpMailer implements Mailer {
  private readonly transporter: Transporter

  constructor(private readonly options: SmtpOptions) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      ...(options.user
        ? { auth: { user: options.user, pass: options.pass } }
        : {}),
    })
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.options.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    })
  }

  // Confere host, porta e credenciais sem enviar nada.
  async verify(): Promise<void> {
    await this.transporter.verify()
  }
}
