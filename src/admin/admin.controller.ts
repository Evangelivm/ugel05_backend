import {
  Controller,
  Post,
  Body,
  Delete,
  Patch,
  Param,
  NotFoundException,
  Get,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import {
  AssignTechnicianSchema,
  AssignTechnicianDto,
} from './dto/assign-technician.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CloseTicketDto, CloseTicketDtoSchema } from './dto/close-ticket.dto';

@Controller('admin')
@UseGuards(ThrottlerGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('create-user')
  async createUser(@Body() body: CreateUserDto) {
    return this.adminService.createUser(body);
  }

  @Get('tickets')
  async getTickets() {
    return this.adminService.getTickets();
  }

  @Get('metrics')
  async getAdminMetrics() {
    return this.adminService.getAdminTicketsMetrics();
  }

  @Get('technicians')
  async getTechniciansWithTicketCount() {
    return this.adminService.getTechniciansWithTicketCount();
  }

  @Delete('ticket/:codigoConsulta')
  async deleteTicket(@Param('codigoConsulta') codigoConsulta: string) {
    try {
      return await this.adminService.deleteTicketByCodigoConsulta(
        codigoConsulta,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Patch('tickets/assign-technician')
  async assignTechnician(@Body() body: unknown) {
    // Validar el body con Zod
    const result = AssignTechnicianSchema.safeParse(body);

    if (!result.success) {
      // Extraer y formatear errores de Zod
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new BadRequestException({
        message: 'Datos inválidos',
        errors,
      });
    }

    // Si la validación pasa, llamar al servicio
    return this.adminService.assignTechnicianToTicket(result.data);
  }

  @Patch('close')
  async closeTicket(@Body() body: unknown) {
    // Validar el body con Zod
    const result = CloseTicketDtoSchema.safeParse(body);

    if (!result.success) {
      // Extraer y formatear errores de Zod
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new BadRequestException({
        message: 'Datos inválidos',
        errors,
      });
    }

    // Si la validación pasa, llamar al servicio
    return this.adminService.closeTicket(result.data);
  }
}
