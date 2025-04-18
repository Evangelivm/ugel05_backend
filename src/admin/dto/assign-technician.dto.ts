import { z } from 'zod';

// Esquema Zod para validación
export const AssignTechnicianSchema = z.object({
  id_ticket: z.number({
    required_error: 'id_ticket es requerido',
    invalid_type_error: 'id_ticket debe ser un número',
  }),
  alf_num_tecnico_asignado: z
    .string({
      required_error: 'alf_num_tecnico_asignado es requerido',
      invalid_type_error: 'alf_num_tecnico_asignado debe ser un texto',
    })
    .min(1, 'alf_num_tecnico_asignado no puede estar vacío'),
});

// Tipo TypeScript inferido del esquema
export type AssignTechnicianDto = z.infer<typeof AssignTechnicianSchema>;
