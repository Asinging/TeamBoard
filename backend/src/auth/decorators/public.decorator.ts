import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Mark any route handler with @Public() to skip the global JWT guard
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
