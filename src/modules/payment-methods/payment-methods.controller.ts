import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@ApiTags('Payment Methods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  @Get()
  findMyPaymentMethods(@CurrentUser() user: any) {
    return this.paymentMethodsService.findMyPaymentMethods(user.id);
  }

  @Post()
  createPaymentMethod(
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.createPaymentMethod(user.id, dto);
  }

  @Patch(':id')
  updatePaymentMethod(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.updatePaymentMethod(
      user.id,
      Number(id),
      dto,
    );
  }

  @Delete(':id')
  removePaymentMethod(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.paymentMethodsService.removePaymentMethod(
      user.id,
      Number(id),
    );
  }

  @Patch(':id/default')
  setDefaultPaymentMethod(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.paymentMethodsService.setDefaultPaymentMethod(
      user.id,
      Number(id),
    );
  }
}