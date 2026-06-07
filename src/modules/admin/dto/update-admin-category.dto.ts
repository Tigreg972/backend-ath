import { PartialType } from '@nestjs/swagger';
import { CreateAdminCategoryDto } from './create-admin-category.dto';

export class UpdateAdminCategoryDto extends PartialType(
  CreateAdminCategoryDto,
) {}