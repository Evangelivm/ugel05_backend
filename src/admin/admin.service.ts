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
import { CloseTicketDto } from './dto/close-ticket.dto';

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
  async closeTicket({ id_ticket, fecha_cierre }: CloseTicketDto) {
    // Verificar si el ticket existe
    const ticketExists = await this.prisma.ticket.findUnique({
      where: { id_ticket },
    });

    if (!ticketExists) {
      throw new NotFoundException(`Ticket con id ${id_ticket} no encontrado`);
    }

    // Actualizar el ticket manteniendo el formato original de fecha_cierre
    return {
      message: `Ticket ${id_ticket} marcado como resuelto`,
      ticket: await this.prisma.ticket.update({
        where: { id_ticket },
        data: {
          id_estado_ticket: 4,
          fecha_cierre: fecha_cierre,
        },
      }),
    };
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

  async getAdminTicketsMetrics() {
    // Obtener el mes actual y el anterior
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Obtener métricas del mes actual
    const currentMonthMetrics = await this.prisma.$queryRaw<
      {
        id_estado_ticket: number;
        cantidad_horas_atencion: number;
      }[]
    >`
      SELECT 
        id_estado_ticket, 
        cantidad_horas_atencion 
      FROM ticket
      WHERE id_estado_ticket IN (1, 2, 3, 4)
      AND MONTH(fecha_creacion) = ${currentMonth}
      AND YEAR(fecha_creacion) = ${currentYear}
    `;

    // Obtener métricas del mes anterior
    const previousMonthMetrics = await this.prisma.$queryRaw<
      {
        id_estado_ticket: number;
        cantidad_horas_atencion: number;
      }[]
    >`
      SELECT 
        id_estado_ticket, 
        cantidad_horas_atencion 
      FROM ticket
      WHERE id_estado_ticket IN (1, 2, 3, 4)
      AND MONTH(fecha_creacion) = ${previousMonth}
      AND YEAR(fecha_creacion) = ${previousYear}
    `;

    // Obtener total de usuarios que crearon tickets este mes
    const uniqueUsersCurrentMonth = await this.prisma.$queryRaw<
      { count: bigint }[]
    >`
      SELECT COUNT(DISTINCT alf_num_usuario) as count
      FROM ticket
      WHERE MONTH(fecha_creacion) = ${currentMonth}
      AND YEAR(fecha_creacion) = ${currentYear}
    `;

    // Obtener total de técnicos asignados este mes
    const uniqueTechniciansCurrentMonth = await this.prisma.$queryRaw<
      { count: bigint }[]
    >`
      SELECT COUNT(DISTINCT alf_num_tecnico_asignado) as count
      FROM ticket
      WHERE MONTH(fecha_creacion) = ${currentMonth}
      AND YEAR(fecha_creacion) = ${currentYear}
      AND alf_num_tecnico_asignado IS NOT NULL
    `;

    // Calcular métricas del mes actual
    const currentTicketsResueltos = currentMonthMetrics.filter(
      (t) => t.id_estado_ticket === 4,
    );
    const currentAvgTime =
      currentTicketsResueltos.length > 0
        ? currentTicketsResueltos.reduce(
            (sum, t) => sum + (t.cantidad_horas_atencion || 0),
            0,
          ) / currentTicketsResueltos.length
        : 0;

    // Calcular métricas del mes anterior
    const previousTicketsResueltos = previousMonthMetrics.filter(
      (t) => t.id_estado_ticket === 4,
    );
    const previousAvgTime =
      previousTicketsResueltos.length > 0
        ? previousTicketsResueltos.reduce(
            (sum, t) => sum + (t.cantidad_horas_atencion || 0),
            0,
          ) / previousTicketsResueltos.length
        : 0;

    // Calcular diferencia porcentual
    const timeDifference = currentAvgTime - previousAvgTime;
    const percentageDifference =
      previousAvgTime !== 0 ? (timeDifference / previousAvgTime) * 100 : 0;

    return {
      ticketsByStatus: {
        abiertos: Number(
          currentMonthMetrics.filter((t) => t.id_estado_ticket === 1).length,
        ),
        enProceso: Number(
          currentMonthMetrics.filter((t) => t.id_estado_ticket === 2).length,
        ),
        pendientes: Number(
          currentMonthMetrics.filter((t) => t.id_estado_ticket === 3).length,
        ),
        resueltos: Number(currentTicketsResueltos.length),
      },
      tiempoPromedio: {
        current: Number(parseFloat(currentAvgTime.toFixed(1))),
        difference: Number(parseFloat(timeDifference.toFixed(1))),
        percentage: Number(parseFloat(percentageDifference.toFixed(1))),
        isImprovement: timeDifference < 0,
      },
      totals: {
        currentMonth: Number(currentMonthMetrics.length),
        previousMonth: Number(previousMonthMetrics.length),
      },
      users: {
        totalUsers: Number(uniqueUsersCurrentMonth[0]?.count || 0),
        totalTechnicians: Number(uniqueTechniciansCurrentMonth[0]?.count || 0),
      },
    };
  }

  async getTechniciansWithTicketCount() {
    const technicians = await this.prisma.$queryRaw<
      {
        alf_num: string;
        user: string;
        email: string;
        num_tickets: bigint; // Prisma devuelve BigInt para COUNT
      }[]
    >`
    SELECT 
      a.alf_num, 
      CONCAT(a.nombres, " ", a.apellidos) AS "user", 
      a.email,
      (SELECT COUNT(*) FROM ticket t WHERE t.alf_num_tecnico_asignado = a.alf_num) AS num_tickets
    FROM 
      usuario a  
    WHERE 
      a.id_rol = 2
  `;

    // Función para convertir BigInt a number/string
    const convertBigInt = (value: bigint | any): any => {
      if (typeof value === 'bigint') {
        return Number(value); // O puedes usar value.toString() si prefieres string
      }
      return value;
    };

    // Convertir los BigInt en la respuesta
    return technicians.map((tech) => ({
      alf_num: tech.alf_num,
      user: tech.user,
      email: tech.email,
      num_tickets: convertBigInt(tech.num_tickets),
    }));
  }
}
