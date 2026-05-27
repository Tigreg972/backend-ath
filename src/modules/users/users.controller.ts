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

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.usersService.findSafeById(user.id);
  }

  @Patch('me')
  updateMyProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMyProfile(user.id, dto);
  }

  @Patch('me/password')
  changeMyPassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changeMyPassword(user.id, dto);
  }

  @Delete('me')
  deleteMyAccount(@CurrentUser() user: any) {
    return this.usersService.deleteMyAccount(user.id);
  }

  @Get('me/addresses')
  findMyAddresses(@CurrentUser() user: any) {
    return this.usersService.findMyAddresses(user.id);
  }

  @Post('me/addresses')
  createAddress(@CurrentUser() user: any, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(user.id, dto);
  }

  @Patch('me/addresses/:id')
  updateAddress(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, Number(id), dto);
  }

  @Delete('me/addresses/:id')
  removeAddress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.removeAddress(user.id, Number(id));
  }
}