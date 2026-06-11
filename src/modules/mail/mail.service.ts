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
        secure: port === 465,
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
      this.logger.warn(`Email non envoyé à ${to}, configuration SMTP manquante.`);
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

        <p>Cordialement,<br/>
        L’équipe Althea Shop</p>
      `,
    );
  }

  async sendEmailVerificationEmail(
    to: string,
    fullName: string,
    verificationUrl: string,
  ) {
    await this.sendMail(
      to,
      'Confirmez votre adresse email',
      `
        <h1>Bienvenue ${fullName}</h1>

        <p>Merci pour votre inscription sur Althea Shop.</p>

        <p>Veuillez confirmer votre adresse email en cliquant sur le lien ci-dessous :</p>

        <p>
          <a href="${verificationUrl}">
            Confirmer mon adresse email
          </a>
        </p>

        <p>Ou copiez ce lien dans votre navigateur :</p>

        <p>${verificationUrl}</p>

        <p>Ce lien expirera dans 24 heures.</p>

        <p>Cordialement,<br/>
        L’équipe Althea Shop</p>
      `,
    );
  }

  async sendEmailChangeVerificationEmail(
    to: string,
    fullName: string,
    verificationUrl: string,
  ) {
    await this.sendMail(
      to,
      'Confirmez votre nouvelle adresse email',
      `
        <h1>Bonjour ${fullName}</h1>

        <p>Vous avez demandé à modifier l’adresse email associée à votre compte Althea Shop.</p>

        <p>Pour confirmer cette nouvelle adresse, cliquez sur le lien ci-dessous :</p>

        <p>
          <a href="${verificationUrl}">
            Confirmer ma nouvelle adresse email
          </a>
        </p>

        <p>Ou copiez ce lien dans votre navigateur :</p>

        <p>${verificationUrl}</p>

        <p>Ce lien expirera dans 24 heures.</p>

        <p>Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.</p>

        <p>Cordialement,<br/>
        L’équipe Althea Shop</p>
      `,
    );
  }

  async sendAdminTwoFactorCodeEmail(
    to: string,
    fullName: string,
    code: string,
  ) {
    await this.sendMail(
      to,
      'Code de connexion administrateur',
      `
        <h1>Bonjour ${fullName}</h1>

        <p>Une tentative de connexion administrateur a été détectée sur Althea Shop.</p>

        <p>Voici votre code de vérification :</p>

        <h2 style="letter-spacing: 4px;">${code}</h2>

        <p>Ce code est valable pendant 10 minutes.</p>

        <p>Si vous n’êtes pas à l’origine de cette tentative, ignorez cet email et changez votre mot de passe.</p>

        <p>Cordialement,<br/>
        L’équipe Althea Shop</p>
      `,
    );
  }

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    await this.sendMail(
      to,
      'Réinitialisation de votre mot de passe',
      `
        <h1>Réinitialisation du mot de passe</h1>

        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>

        <p>Cliquez sur le lien ci-dessous :</p>

        <p>
          <a href="${resetUrl}">
            Réinitialiser mon mot de passe
          </a>
        </p>

        <p>Ou copiez ce lien dans votre navigateur :</p>

        <p>${resetUrl}</p>

        <p>Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.</p>

        <p>Cordialement,<br/>
        L’équipe Althea Shop</p>
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

        <p>Cordialement,<br/>
        L’équipe Althea Shop</p>
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