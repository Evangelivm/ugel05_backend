import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, createUserSchema } from './dto/create-user.dto';
import { TicketService } from '../ticket/ticket.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private ticketService: TicketService,
  ) {}

  async createUser(data: CreateUserDto) {
    const parsedData = createUserSchema.safeParse(data);
    if (!parsedData.success) {
      throw new BadRequestException(
        parsedData.error.errors.map((e) => e.message).join(', '),
      );
    }

    return this.prisma.usuario.create({
      data: {
        alf_num: parsedData.data.alf_num,
        nombres: parsedData.data.nombres,
        apellidos: parsedData.data.apellidos,
        email: parsedData.data.email,
        dni: parsedData.data.dni,
        celular: parsedData.data.celular,
        id_rol: parsedData.data.id_rol,
        activo: parsedData.data.activo,
      },
    });
  }

  async getTickets() {
    return this.ticketService.getTickets();
  }

  async deleteTicketByCodigoConsulta(codigoConsulta: string) {
    return this.ticketService.deleteTicketByCodigoConsulta(codigoConsulta);
  }
}
