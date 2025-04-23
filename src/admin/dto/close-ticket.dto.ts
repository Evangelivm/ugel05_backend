import { z } from 'zod';

export const CloseTicketDtoSchema = z.object({
  id_ticket: z
    .number({
      required_error: 'El id_ticket es requerido',
      invalid_type_error: 'El id_ticket debe ser un número',
    })
    .int('El id_ticket debe ser un entero')
    .positive('El id_ticket debe ser un número positivo'),
  fecha_cierre: z.union([
    z.string().datetime({
      offset: true,
      message:
        'La fecha debe ser un string ISO 8601 con offset de zona horaria (ej: 2023-05-15T14:30:00.000-05:00)',
    }),
    z.date({
      invalid_type_error: 'La fecha debe ser un objeto Date válido',
    }),
  ]),
});

export type CloseTicketDto = z.infer<typeof CloseTicketDtoSchema>;
