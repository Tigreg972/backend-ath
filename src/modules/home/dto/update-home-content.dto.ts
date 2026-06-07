import { IsString } from 'class-validator';

export class UpdateHomeContentDto {
  @IsString()
  homeText!: string;
}