import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, createUserSchema } from './dto/create-user.dto';
import {
  AssignTechnicianSchema,
  AssignTechnicianDto,
} from './dto/assign-technician.dto';
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
  async assignTechnicianToTicket(data: AssignTechnicianDto) {
    const { id_ticket, alf_num_tecnico_asignado } = data;

    // Verificar si el ticket existe
    const ticketExists = await this.prisma.ticket.findUnique({
      where: { id_ticket },
    });

    if (!ticketExists) {
      throw new NotFoundException(`Ticket con id ${id_ticket} no encontrado`);
    }

    // Verificar si el técnico existe
    const technicianExists = await this.prisma.usuario.findUnique({
      where: { alf_num: alf_num_tecnico_asignado },
    });

    if (!technicianExists) {
      throw new NotFoundException(
        `Técnico con alf_num ${alf_num_tecnico_asignado} no encontrado`,
      );
    }

    // Actualizar el ticket
    return this.prisma.ticket.update({
      where: { id_ticket },
      data: {
        alf_num_tecnico_asignado,
        id_estado_ticket: 2, // Estado "En progreso"
      },
    });
  }
}
