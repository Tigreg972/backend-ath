import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

const Stripe = require('stripe');

@Injectable()
export class PaymentsService {
  private stripe: any;

  constructor(private readonly configService: ConfigService) {
    const secretKey =
      this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!secretKey) {
      throw new BadRequestException(
        'Clé Stripe manquante dans le .env',
      );
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-04-22.dahlia',
    });
  }

  async createPaymentIntent(amountCents: number) {
    const paymentIntent =
      await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
        },
      });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountCents,
      currency: 'eur',
    };
  }
}