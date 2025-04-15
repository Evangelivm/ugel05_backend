import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  NotFoundException,
  Get,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('admin')
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
}
