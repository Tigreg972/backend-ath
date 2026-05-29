import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = Number(this.configService.get<string>('MAIL_PORT'));
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: {
          user,
          pass,
        },
      });
    }
  }

  private async sendMail(
    to: string,
    subject: string,
    html: string,
    attachments?: nodemailer.SendMailOptions['attachments'],
  ) {
    if (!this.transporter) {
      this.logger.warn(`Email non envoyé à ${to}, SMTP manquant.`);
      return;
    }

    const from =
      this.configService.get<string>('MAIL_FROM') ||
      'Althea Systems <no-reply@althea.fr>';

    await this.transporter.sendMail({
      from,
      to,
      subject,
      html,
      attachments,
    });
  }

  async sendWelcomeEmail(to: string, fullName: string) {
    await this.sendMail(
      to,
      'Bienvenue chez Althea Systems',
      `
        <h1>Bienvenue ${fullName}</h1>
        <p>Votre compte Althea Systems a bien été créé.</p>
      `,
    );
  }

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    await this.sendMail(
      to,
      'Réinitialisation de votre mot de passe',
      `
        <h1>Réinitialisation du mot de passe</h1>
        <p>Cliquez sur ce lien :</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
      `,
    );
  }

  async sendOrderConfirmationEmail(
    to: string,
    fullName: string,
    orderReference: string,
    totalPriceCents: number,
    invoicePdf?: Buffer,
  ) {
    await this.sendMail(
      to,
      `Confirmation de commande ${orderReference}`,
      `
        <h1>Merci pour votre commande, ${fullName}</h1>
        <p>Votre commande <strong>${orderReference}</strong> a bien été confirmée.</p>
        <p>Total : <strong>${(totalPriceCents / 100).toFixed(2)} €</strong></p>
        <p>Votre facture est jointe à cet email.</p>
      `,
      invoicePdf
        ? [
            {
              filename: `facture-${orderReference}.pdf`,
              content: invoicePdf,
              contentType: 'application/pdf',
            },
          ]
        : undefined,
    );
  }

  async sendContactConfirmationEmail(
  to: string,
  firstName: string,
  subject: string,
) {
  await this.sendMail(
    to,
    'Confirmation de réception de votre message',
    `
      <h1>Bonjour ${firstName},</h1>

      <p>Votre message a bien été transmis à notre équipe.</p>
      <p>Nous vous répondrons dès que possible.</p>

      <p><strong>Sujet :</strong> ${subject}</p>

      <p>Cordialement,<br/>
      L’équipe Althea Shop</p>
    `,
  );
}
async sendContactReplyEmail(
  to: string,
  firstName: string,
  subject: string,
  reply: string,
) {
  await this.sendMail(
    to,
    `Réponse à votre message : ${subject}`,
    `
      <h1>Bonjour ${firstName},</h1>

      <p>Nous revenons vers vous concernant votre message :</p>
      <p><strong>${subject}</strong></p>

      <div style="padding: 12px; border-left: 4px solid #0B3C5D; background: #f5f7fa;">
        ${reply}
      </div>

      <p>Cordialement,<br/>
      L’équipe Althea Shop</p>
    `,
  );
}
}