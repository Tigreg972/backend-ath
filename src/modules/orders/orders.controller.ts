import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { OrdersService } from './orders.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { CheckoutDto } from './dto/checkout.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
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