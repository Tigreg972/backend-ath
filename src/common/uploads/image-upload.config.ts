import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

export function imageUploadOptions(folder: 'products' | 'categories' | 'home',) {
  return {
    storage: diskStorage({
      destination: `./uploads/${folder}`,
      filename: (
        _req: Express.Request,
        file: Express.Multer.File,
        callback: (error: Error | null, filename: string) => void,
      ) => {
        const uniqueName = `${Date.now()}-${Math.round(
          Math.random() * 1e9,
        )}${extname(file.originalname)}`;

        callback(null, uniqueName);
      },
    }),

    fileFilter: (
      _req: Express.Request,
      file: Express.Multer.File,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        return callback(
          new BadRequestException(
            'Seules les images JPG, JPEG, PNG ou WEBP sont autorisées',
          ),
          false,
        );
      }

      callback(null, true);
    },

    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  };
}