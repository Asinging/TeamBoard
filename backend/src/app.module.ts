import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { TeamsModule } from './teams/teams.module';
import { SeedModule } from './seed/seed.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    // Load .env and expose config globally — no need to import ConfigModule per feature module
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Connect to MongoDB using the URI from config
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('database.uri'),
      }),
    }),

    // In-process event bus — shows loose coupling between modules.
    // In a microservice split, eventEmitter.emit() becomes a message queue publish.
    EventEmitterModule.forRoot(),

    AuthModule,
    UsersModule,
    TeamsModule,
    ProjectsModule,
    TasksModule,
    SeedModule,
    StatsModule,
  ],
})
export class AppModule {}
