import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HTTPLoggerMiddleware } from './modules/common/middleware/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username:
          configService.get<string>('DB_USERNAME') ||
          configService.get<string>('DB_USER', 'root'),
        password: configService.get<string>('DB_PASSWORD', 'root_password'),
        database:
          configService.get<string>('DB_DATABASE') ||
          configService.get<string>('DB_NAME', 'vastu_reel_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize:
          configService.get<string>('DB_SYNCHRONIZE') === 'true' ||
          configService.get<boolean>('DB_SYNCHRONIZE') === true,
      }),
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HTTPLoggerMiddleware).forRoutes('*');
  }
}
