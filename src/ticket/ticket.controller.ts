import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  Param,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TicketService } from './ticket.service';
import { ticketRequestSchema } from './dto/ticket-request.dto';

@Controller('tickets')
@UseGuards(ThrottlerGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get('user/:userId')
  async getUserTickets(@Param('userId') userId: string) {
    return this.ticketService.getUserTickets(userId);
  }

  @Post('support-request')
  async createSupportRequest(@Body() body: any) {
    const parsedData = ticketRequestSchema.safeParse(body);
    if (!parsedData.success) {
      throw new BadRequestException(
        parsedData.error.errors.map((e) => e.message).join(', '),
      );
    }
    return this.ticketService.createTicket(parsedData.data);
  }

  @Delete(':codigoConsulta')
  async deleteTicket(@Param('codigoConsulta') codigoConsulta: string) {
    try {
      return await this.ticketService.deleteTicketByCodigoConsulta(
        codigoConsulta,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Get('metrics/:userId')
  async getTicketsMetrics(@Param('userId') userId: string) {
    return this.ticketService.getTicketsMetrics(userId);
  }
}
