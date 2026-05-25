import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';

import PDFDocument = require('pdfkit');

import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Address } from '../users/entities/address.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,
  ) {}

  private formatPrice(cents: number): string {
    return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  }

  private buildReference(orderId: number): string {
    return `ALT-${String(orderId).padStart(4, '0')}`;
  }

  async generateInvoice(orderId: number, userId: number): Promise<Buffer> {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    const user = await this.usersRepository.findOne({
      where: {
        id: userId,
      },
    });

    const address = order.shippingAddressId
      ? await this.addressesRepository.findOne({
          where: {
            id: order.shippingAddressId,
            userId,
          },
        })
      : null;

    return new Promise((resolve) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
      });

      const buffers: Uint8Array[] = [];

      doc.on('data', (chunk: Uint8Array) => {
        buffers.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      const primary = '#0B3C5D';
      const secondary = '#328CC1';
      const border = '#D8DEE9';
      const light = '#F5F8FC';
      const dark = '#111827';
      const muted = '#6B7280';

      const reference = this.buildReference(order.id);

      const createdAt = new Date(order.createdAt);
      const date = createdAt.toLocaleDateString('fr-FR');

      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateText = dueDate.toLocaleDateString('fr-FR');

      const totalTtc = order.totalCents;
      const totalHt = Math.round(totalTtc / 1.2);
      const tva = totalTtc - totalHt;

      const logoPath = join(
        process.cwd(),
        'src',
        'assets',
        'althea-logo.png',
      );

      doc.rect(0, 0, 595, 842).fill('#FFFFFF');
      doc.rect(0, 0, 18, 842).fill('#EEF6FC');

      if (existsSync(logoPath)) {
        doc.image(logoPath, 55, 45, {
          width: 88,
        });
      }

      doc
        .fillColor(primary)
        .font('Helvetica-Bold')
        .fontSize(24)
        .text('ALTHEA', 155, 48);

      doc
        .fillColor(secondary)
        .font('Helvetica')
        .fontSize(20)
        .text('SYSTEMS', 155, 76);

      doc
        .fillColor(dark)
        .font('Helvetica')
        .fontSize(10)
        .text('Matériel médical professionnel', 55, 125)
        .text('www.althea-systems.com', 55, 148)
        .text('contact@althea-systems.com', 55, 166)
        .text('01 84 80 80 80', 55, 184)
        .text('12 Rue de la Santé', 55, 202)
        .text('75012 Paris, France', 55, 220)
        .text('SIRET : 987 654 321 00015', 55, 248)
        .text('TVA intracomm. : FR98 987654321', 55, 266);

      doc
        .moveTo(300, 45)
        .lineTo(300, 285)
        .strokeColor(border)
        .lineWidth(1)
        .stroke();

      doc
        .fillColor(primary)
        .font('Helvetica-Bold')
        .fontSize(40)
        .text('FACTURE', 330, 45, {
          width: 220,
          align: 'right',
          lineBreak: false,
        });

      const infoX = 345;
      const valueX = 465;
      let infoY = 130;

      const paymentLabel =
        order.paymentMethod === 'card'
          ? 'Carte bancaire'
          : order.paymentMethod || 'Non précisé';

      const rightInfo = [
        ['FACTURE N° :', reference],
        ['DATE :', date],
        ['ÉCHÉANCE :', dueDateText],
        ['COMMANDE N° :', reference],
        ['PAIEMENT :', paymentLabel],
      ];

      for (const [label, value] of rightInfo) {
        doc
          .fillColor(dark)
          .font('Helvetica')
          .fontSize(9)
          .text(label, infoX, infoY);

        doc
          .font('Helvetica-Bold')
          .text(value, valueX, infoY, {
            width: 85,
            align: 'right',
          });

        doc
          .moveTo(infoX, infoY + 17)
          .lineTo(550, infoY + 17)
          .strokeColor(border)
          .lineWidth(0.5)
          .stroke();

        infoY += 28;
      }

      doc
        .moveTo(55, 310)
        .lineTo(550, 310)
        .strokeColor(primary)
        .lineWidth(1)
        .stroke();

      doc
        .fillColor(primary)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('ÉMETTEUR', 55, 335);

      doc
        .fillColor(dark)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('ALTHEA SYSTEMS', 55, 360);

      doc
        .font('Helvetica')
        .fontSize(10)
        .text('Matériel médical professionnel', 55, 380)
        .text('12 Rue de la Santé', 55, 398)
        .text('75012 Paris, France', 55, 416)
        .text('01 84 80 80 80', 55, 434)
        .text('contact@althea-systems.com', 55, 452)
        .text('SIRET : 987 654 321 00015', 55, 475)
        .text('TVA intracomm. : FR98 987654321', 55, 493);

      doc
        .moveTo(300, 335)
        .lineTo(300, 505)
        .strokeColor(border)
        .lineWidth(1)
        .stroke();

      doc
        .fillColor(primary)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('DESTINATAIRE', 345, 335);

      doc
        .fillColor(dark)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(user?.fullName || `Client #${userId}`, 345, 360);

      doc
        .font('Helvetica')
        .fontSize(10)
        .text(user?.email || 'Email non renseigné', 345, 382)
        .text(user?.phone || 'Téléphone non renseigné', 345, 400);

      if (address) {
        let addressY = 425;

        doc.text(address.addressLine1, 345, addressY);
        addressY += 18;

        if (address.addressLine2) {
          doc.text(address.addressLine2, 345, addressY);
          addressY += 18;
        }

        doc.text(`${address.postalCode} ${address.city}`, 345, addressY);
        addressY += 18;

        doc.text(address.country, 345, addressY);
      } else {
        doc.fillColor(muted).text('Adresse non renseignée', 345, 425);
      }

      const tableTop = 545;
      const tableLeft = 55;
      const tableWidth = 495;

      doc
        .roundedRect(tableLeft, tableTop, tableWidth, 35, 3)
        .fill(light)
        .strokeColor(border)
        .stroke();

      doc
        .fillColor(primary)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('DESCRIPTION', tableLeft + 15, tableTop + 13, {
          width: 230,
        })
        .text('PRIX UNITAIRE', tableLeft + 275, tableTop + 13, {
          width: 80,
          align: 'right',
        })
        .text('QUANTITÉ', tableLeft + 365, tableTop + 13, {
          width: 55,
          align: 'center',
        })
        .text('TOTAL', tableLeft + 425, tableTop + 13, {
          width: 55,
          align: 'right',
        });

      let y = tableTop + 35;

      for (const item of order.items || []) {
        const lineTotal = item.quantity * item.unitPriceCents;

        doc
          .rect(tableLeft, y, tableWidth, 48)
          .fill('#FFFFFF')
          .strokeColor(border)
          .stroke();

        doc
          .fillColor(dark)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(item.productName, tableLeft + 15, y + 12, {
            width: 230,
          });

        doc
          .fillColor(muted)
          .font('Helvetica')
          .fontSize(8)
          .text(`Produit #${item.productId}`, tableLeft + 15, y + 28);

        doc
          .fillColor(dark)
          .fontSize(10)
          .text(this.formatPrice(item.unitPriceCents), tableLeft + 275, y + 18, {
            width: 80,
            align: 'right',
          })
          .text(String(item.quantity), tableLeft + 365, y + 18, {
            width: 55,
            align: 'center',
          })
          .font('Helvetica-Bold')
          .text(this.formatPrice(lineTotal), tableLeft + 425, y + 18, {
            width: 55,
            align: 'right',
          });

        y += 48;
      }

      while (y < 675) {
        doc
          .rect(tableLeft, y, tableWidth, 35)
          .fill('#FFFFFF')
          .strokeColor(border)
          .stroke();

        y += 35;
      }

      doc
        .fillColor(primary)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('RÈGLEMENT', 55, 710);

      doc
        .fillColor(dark)
        .font('Helvetica')
        .fontSize(9)
        .text('Par carte bancaire', 55, 732)
        .text(`Transaction effectuée le ${date}`, 55, 748)
        .text('via Stripe', 55, 764);

      const totalX = 335;
      const totalY = 700;

      doc
        .rect(totalX, totalY, 215, 96)
        .fill('#FFFFFF')
        .strokeColor(border)
        .stroke();

      doc
        .fillColor(dark)
        .font('Helvetica')
        .fontSize(10)
        .text('TOTAL HT', totalX + 18, totalY + 18)
        .text(this.formatPrice(totalHt), totalX + 120, totalY + 18, {
          width: 75,
          align: 'right',
        })
        .text('TVA (20%)', totalX + 18, totalY + 42)
        .text(this.formatPrice(tva), totalX + 120, totalY + 42, {
          width: 75,
          align: 'right',
        });

      doc.rect(totalX, totalY + 65, 215, 31).fill(light);

      doc
        .fillColor(primary)
        .font('Helvetica-Bold')
        .fontSize(13)
        .text('TOTAL TTC', totalX + 18, totalY + 73)
        .text(this.formatPrice(totalTtc), totalX + 105, totalY + 73, {
          width: 90,
          align: 'right',
        });

      const footerY = 805;

      doc
        .moveTo(55, footerY)
        .lineTo(550, footerY)
        .strokeColor(primary)
        .lineWidth(0.8)
        .stroke();

      doc
        .fillColor(muted)
        .font('Helvetica')
        .fontSize(6.5)
        .text(
          'En cas de retard de paiement, une indemnité de 10% par jour de retard ainsi que des frais de recouvrement de 40 euros seront exigibles.',
          55,
          footerY + 8,
          {
            width: 245,
            lineGap: 1,
          },
        );

      doc
        .text(
          'Conditions générales de vente : www.althea-systems.com',
          320,
          footerY + 8,
          {
            width: 230,
            align: 'right',
            lineGap: 1,
          },
        );

      doc.end();
    });
  }
}