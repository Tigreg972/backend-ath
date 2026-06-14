import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';

import { FileInterceptor } from '@nestjs/platform-express';

import { AdminService } from './admin.service';
import { ChatbotService } from '../chatbot/chatbot.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { imageUploadOptions } from '../../common/uploads/image-upload.config';

import { CreateAdminProductDto } from './dto/create-admin-product.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';
import { UpsertProductTranslationDto } from './dto/upsert-product-translation.dto';

import { CreateAdminCategoryDto } from './dto/create-admin-category.dto';
import { UpdateAdminCategoryDto } from './dto/update-admin-category.dto';

import { HomeService } from '../home/home.service';
import { CreateHomeSlideDto } from '../home/dto/create-home-slide.dto';
import { UpdateHomeSlideDto } from '../home/dto/update-home-slide.dto';
import { UpdateHomeContentDto } from '../home/dto/update-home-content.dto';

import { UpdateAdminOrderStatusDto } from './dto/update-admin-order-status.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly homeService: HomeService,
    private readonly chatbotService: ChatbotService,
  ) { }

  @Get('stats')
  getStats(@Query('period') period?: string) {
    return this.adminService.getStats(period);
  }

  @Get('chatbot/messages')
  findAllChatbotMessages(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatbotService.findAllForAdmin(
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get('chatbot/escalations')
  findChatbotEscalations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatbotService.findEscalationsForAdmin(
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Patch('chatbot/escalations/:id/resolve')
  resolveChatbotEscalation(@Param('id') id: string) {
    return this.chatbotService.resolveEscalation(Number(id));
  }

  @Get('products')
  findAllProducts() {
    return this.adminService.findAllProducts();
  }

  @Get('products/:id')
  findProductById(@Param('id') id: string) {
    return this.adminService.findProductById(Number(id));
  }

  @Get('products/:id/translations')
  findProductTranslations(@Param('id') id: string) {
    return this.adminService.findProductTranslations(Number(id));
  }

  @Post('products/:id/translations')
  upsertProductTranslation(
    @Param('id') id: string,
    @Body() dto: UpsertProductTranslationDto,
  ) {
    return this.adminService.upsertProductTranslation(Number(id), dto);
  }

  @Delete('products/:id/translations/:language')
  deleteProductTranslation(
    @Param('id') id: string,
    @Param('language') language: string,
  ) {
    return this.adminService.deleteProductTranslation(Number(id), language);
  }

  @Get('products/:id/images')
  getProductImages(@Param('id') id: string) {
    return this.adminService.getProductImages(Number(id));
  }

  @Post('products/:id/images')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions('products')))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadProductGalleryImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `/uploads/products/${file.filename}`;

    return this.adminService.uploadProductGalleryImage(Number(id), imageUrl);
  }

  @Patch('products/:id/images/:imageId')
  updateProductImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body()
    dto: {
      url?: string;
      alt?: string;
      altText?: string;
      displayOrder?: number;
    },
  ) {
    return this.adminService.updateProductImage(
      Number(id),
      Number(imageId),
      dto,
    );
  }

  @Delete('products/:id/images/:imageId')
  deleteProductImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.adminService.deleteProductImage(Number(id), Number(imageId));
  }

  @Post('products')
  createProduct(@Body() dto: CreateAdminProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Patch('products/:id')
  updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateAdminProductDto,
  ) {
    return this.adminService.updateProduct(Number(id), dto);
  }

  @Post('products/:id/image')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions('products')))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadProductImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `/uploads/products/${file.filename}`;

    return this.adminService.uploadProductImage(Number(id), imageUrl);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(Number(id));
  }

  @Get('categories')
  findCategories() {
    return this.adminService.findCategories();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateAdminCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateAdminCategoryDto,
  ) {
    return this.adminService.updateCategory(Number(id), dto);
  }

  @Post('categories/:id/image')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions('categories')))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadCategoryImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `/uploads/categories/${file.filename}`;

    return this.adminService.uploadCategoryImage(Number(id), imageUrl);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(Number(id));
  }

  @Get('home')
  async getHomeAdmin() {
    const content = await this.homeService.getHomeContent();

    return {
      homeText: content.homeText,
    };
  }

  @Patch('home')
  updateHomeContent(@Body() dto: UpdateHomeContentDto) {
    return this.homeService.updateHomeContent(dto);
  }

  @Get('slides')
  getSlides() {
    return this.homeService.getAdminSlides();
  }

  @Post('slides')
  createSlide(@Body() dto: CreateHomeSlideDto) {
    return this.homeService.createSlide(dto);
  }

  @Patch('slides/:id')
  updateSlide(
    @Param('id') id: string,
    @Body() dto: UpdateHomeSlideDto,
  ) {
    return this.homeService.updateSlide(Number(id), dto);
  }

  @Delete('slides/:id')
  deleteSlide(@Param('id') id: string) {
    return this.homeService.deleteSlide(Number(id));
  }

  @Get('orders')
  findAllOrdersAdmin() {
    return this.adminService.findAllOrdersAdmin();
  }

  @Get('orders/:id')
  findOrderByIdAdmin(@Param('id') id: string) {
    return this.adminService.findOrderByIdAdmin(Number(id));
  }

  @Patch('orders/:id/status')
  updateOrderStatusAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateAdminOrderStatusDto,
  ) {
    return this.adminService.updateOrderStatusAdmin(Number(id), dto);
  }

  @Get('users')
  findAllUsersAdmin() {
    return this.adminService.findAllUsersAdmin();
  }

  @Get('users/:id')
  findUserByIdAdmin(@Param('id') id: string) {
    return this.adminService.findUserByIdAdmin(Number(id));
  }

  @Patch('users/:id')
  updateUserAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUserAdmin(Number(id), dto);
  }

  @Delete('users/:id')
  deleteUserAdmin(@Param('id') id: string) {
    return this.adminService.deleteUserAdmin(Number(id));
  }

  @Post('slides/:id/image')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions('home')))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadSlideImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `/uploads/home/${file.filename}`;

    return this.homeService.updateSlide(Number(id), {
      imageUrl,
    });
  }
}