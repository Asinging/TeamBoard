import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  // Runs automatically once NestJS finishes bootstrapping
  async onApplicationBootstrap() {
    await this.seedAdmin();
  }

  private async seedAdmin() {
    const email = this.configService.get<string>('admin.email')!;
    const existing = await this.usersService.findByEmail(email);

    if (existing) {
      this.logger.log(`Admin already exists: ${email}`);
      return;
    }

    const name = this.configService.get<string>('admin.name')!;
    const password = this.configService.get<string>('admin.password')!;
    const hashedPassword = await bcrypt.hash(password, 10);

    await this.usersService.create({
      name,
      email,
      password: hashedPassword,
      role: UserRole.ADMIN,
    });

    this.logger.log(`Admin seeded → ${email}`);
  }
}
