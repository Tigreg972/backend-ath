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
}