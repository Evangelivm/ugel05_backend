import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketService } from '../ticket/ticket.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService, TicketService],
})
export class AdminModule {}
