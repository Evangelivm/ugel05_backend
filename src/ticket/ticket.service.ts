import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketRequestDto } from './dto/ticket-request.dto';

@Injectable()
export class TicketService {
  constructor(private prisma: PrismaService) {}

  async getTickets() {
    return this.prisma.$queryRaw`
     SELECT 
        a.id_ticket,
        a.codigo_consulta as "id", 
        concat(d.nombres," ",d.apellidos) as "user" ,
        d.id_area,
        b.tipo_soporte as "type",
        a.descripcion as "description", 
        a.id_estado_ticket as "status",
        a.fecha_creacion as "fecha_creacion",
        a.fecha_cierre as "fecha_cierre",
        a.cantidad_horas_atencion as "cantidad_horas_atencion",
        concat(c.nombres," ",c.apellidos) as "technician" 
      FROM ticket a 
      JOIN tipo_soporte b ON b.id_tipo_soporte = a.id_tipo_soporte
      LEFT JOIN usuario c ON a.alf_num_tecnico_asignado = c.alf_num
      JOIN usuario d ON a.alf_num_usuario = d.alf_num
    `;
  }

  async getUserTickets(alfNumUsuario: string) {
    return this.prisma.$queryRaw`
      SELECT 
        a.id_ticket,
        a.codigo_consulta as "id", 
        b.tipo_soporte as "type",
        a.descripcion as "description", 
        a.id_estado_ticket as "status",
        a.fecha_creacion as "fecha",
        concat(c.nombres," ",c.apellidos) as "technician" 
      FROM ticket a 
      JOIN tipo_soporte b ON b.id_tipo_soporte = a.id_tipo_soporte
      LEFT JOIN usuario c ON a.alf_num_tecnico_asignado = c.alf_num
      WHERE a.alf_num_usuario = ${alfNumUsuario}
    `;
  }
  async deleteTicketByCodigoConsulta(codigoConsulta: string) {
    const result = await this.prisma.ticket.deleteMany({
      where: {
        codigo_consulta: codigoConsulta,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(
        `No se encontró ticket con código de consulta ${codigoConsulta}`,
      );
    }

    return {
      message: `Ticket con código ${codigoConsulta} eliminado correctamente`,
      deletedCount: result.count,
    };
  }
  async getTicketsMetrics(alfNumUsuario: string) {
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
    AND alf_num_usuario = ${alfNumUsuario}
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
    AND alf_num_usuario = ${alfNumUsuario}
    AND MONTH(fecha_creacion) = ${previousMonth}
    AND YEAR(fecha_creacion) = ${previousYear}
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
        abiertos: currentMonthMetrics.filter((t) => t.id_estado_ticket === 1)
          .length,
        enProceso: currentMonthMetrics.filter((t) => t.id_estado_ticket === 2)
          .length,
        pendientes: currentMonthMetrics.filter((t) => t.id_estado_ticket === 3)
          .length,
        resueltos: currentTicketsResueltos.length,
      },
      tiempoPromedio: {
        current: parseFloat(currentAvgTime.toFixed(1)), // 1 decimal
        difference: parseFloat(timeDifference.toFixed(1)),
        percentage: parseFloat(percentageDifference.toFixed(1)),
        isImprovement: timeDifference < 0, // True si el tiempo mejoró (disminuyó)
      },
      totals: {
        currentMonth: currentMonthMetrics.length,
        previousMonth: previousMonthMetrics.length,
      },
    };
  }
  async createTicket(data: TicketRequestDto) {
    const codigoConsulta = this.generateConsultaCode();

    await this.prisma.ticket.create({
      data: {
        descripcion: data.descripcion,
        alf_num_usuario: data.alf_num_usuario,
        id_tipo_soporte: data.id_tipo_soporte,
        id_estado_ticket: data.id_estado_ticket,
        fecha_creacion: data.fecha_creacion,
        codigo_consulta: codigoConsulta,
      },
    });

    return { ticketNumber: codigoConsulta };
  }

  private generateConsultaCode(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const alphanumericPart = this.generateRandomAlphaNumeric(6);
    return `SOL-${year}${month}-${alphanumericPart}`;
  }

  private generateRandomAlphaNumeric(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  async closeTicket(id_ticket: number, fecha_cierre: string) {
    const result = await this.prisma.$executeRaw`
    UPDATE ticket 
    SET 
      id_estado_ticket = 4,
      fecha_cierre = ${fecha_cierre}
    WHERE id_ticket = ${id_ticket}
  `;

    if (result === 0) {
      throw new NotFoundException(`No se encontró ticket con ID ${id_ticket}`);
    }
    //console.log(fecha_cierre);
    return {
      message: `Ticket ${id_ticket} cerrado correctamente`,
      affectedRows: result,
      fecha_cierre: fecha_cierre,
    };
  }

  async getTechnicianTickets(alfNumTecnico: string) {
    return this.prisma.$queryRaw`
      SELECT 
        a.id_ticket,
        a.codigo_consulta as "id", 
        CONCAT(c.nombres, " ", c.apellidos) AS "user",
        b.tipo_soporte as "type",
        a.descripcion as "description", 
        a.id_estado_ticket as "status",
        a.fecha_creacion as "fecha_creacion",
        a.fecha_cierre as "fecha_cierre",
        c.celular as "celular",
        a.cantidad_horas_atencion as "cantidad_horas_atencion"
      FROM ticket a 
      JOIN tipo_soporte b ON b.id_tipo_soporte = a.id_tipo_soporte
      JOIN usuario c ON a.alf_num_usuario = c.alf_num
      WHERE a.alf_num_tecnico_asignado = ${alfNumTecnico}
    `;
  }
  async getTicketsTechnicianMetrics(alfNumTecnicoAsignado: string) {
    try {
      // Obtener el mes actual y el anterior
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      // Función auxiliar para obtener métricas
      const getMetrics = async (month: number, year: number) => {
        return await this.prisma.$queryRaw<
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
            AND alf_num_tecnico_asignado = ${alfNumTecnicoAsignado}
            AND MONTH(fecha_creacion) = ${month}
            AND YEAR(fecha_creacion) = ${year}
            `;
      };

      // Obtener métricas del mes actual y anterior
      const [currentMonthMetrics, previousMonthMetrics] = await Promise.all([
        getMetrics(currentMonth, currentYear),
        getMetrics(previousMonth, previousYear),
      ]);

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
          abiertos: currentMonthMetrics.filter((t) => t.id_estado_ticket === 1)
            .length,
          enProceso: currentMonthMetrics.filter((t) => t.id_estado_ticket === 2)
            .length,
          pendientes: currentMonthMetrics.filter(
            (t) => t.id_estado_ticket === 3,
          ).length,
          resueltos: currentTicketsResueltos.length,
        },
        tiempoPromedio: {
          current: parseFloat(currentAvgTime.toFixed(1)),
          difference: parseFloat(timeDifference.toFixed(1)),
          percentage: parseFloat(percentageDifference.toFixed(1)),
          isImprovement: timeDifference < 0,
        },
        totals: {
          currentMonth: currentMonthMetrics.length,
          previousMonth: previousMonthMetrics.length,
        },
      };
    } catch (error) {
      console.error('Error al obtener métricas de tickets:', error);
      throw new Error('No se pudieron obtener las métricas de tickets');
    }
  }
}
