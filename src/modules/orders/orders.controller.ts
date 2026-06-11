import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import type { Response } from 'express';

import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { InvoicesService } from '../invoices/invoices.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly invoicesService: InvoicesService,
  ) {}

  @Post('checkout')
  checkout(
    @CurrentUser() user: any,
    @Body() dto: CheckoutDto,
  ) {
    return this.ordersService.checkout(
      user.id,
      dto,
    );
  }

  @Get('me')
  findMyOrders(@CurrentUser() user: any) {
    return this.ordersService.findMyOrders(
      user.id,
    );
  }

  @Post(':id/reorder')
  reorder(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.ordersService.reorder(
      user.id,
      Number(id),
    );
  }

  @Get(':id/invoice')
  async downloadInvoice(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdf =
      await this.invoicesService.generateInvoice(
        Number(id),
        user.id,
      );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice-${id}.pdf`,
      'Content-Length': pdf.length,
    });

    res.end(pdf);
  }

  @Get(':id')
  findOrderById(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.ordersService.findOrderById(
      user.id,
      Number(id),
    );
  }
}