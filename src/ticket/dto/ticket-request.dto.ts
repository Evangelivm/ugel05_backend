import { z } from 'zod';

export const ticketRequestSchema = z.object({
  descripcion: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(500, 'La descripción no puede exceder los 500 caracteres'),
  alf_num_usuario: z.string(),
  id_tipo_soporte: z
    .number()
    .int()
    .positive('El ID de tipo de soporte debe ser un número positivo'),
  id_estado_ticket: z
    .number()
    .int()
    .positive('El ID de estado del ticket debe ser un número positivo'),
  fecha_creacion: z.union([
    z.string().datetime({ offset: true }), // Acepta ISO con zona horaria
    z.date(), // O directamente un objeto Date
  ]),
});

export type TicketRequestDto = z.infer<typeof ticketRequestSchema>;
