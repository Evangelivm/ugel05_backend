import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaController } from './prisma/prisma.controller';
import { TicketModule } from './ticket/ticket.module';
import { TicketService } from './ticket/ticket.service';
import { TicketController } from './ticket/ticket.controller';
import { PrismaService } from './prisma/prisma.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    TicketModule,
    AdminModule,
  ],
  controllers: [AppController, PrismaController, TicketController],
  providers: [AppService, TicketService, PrismaService],
})
export class AppModule {}
