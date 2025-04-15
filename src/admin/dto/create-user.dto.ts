import { z } from 'zod';

export const createUserSchema = z.object({
  alf_num: z
    .string()
    .length(6, 'El código alfanumérico debe tener exactamente 6 caracteres'),
  nombres: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(45, 'El nombre no puede exceder los 45 caracteres'),
  apellidos: z
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(45, 'El apellido no puede exceder los 45 caracteres'),
  email: z.string().email('Debe ser un correo electrónico válido'),
  dni: z
    .string()
    .length(9, 'El DNI debe tener exactamente 9 caracteres')
    .optional(),
  celular: z
    .string()
    .length(9, 'El celular debe tener exactamente 9 caracteres')
    .optional(),
  id_rol: z
    .number()
    .int()
    .positive('El ID del rol debe ser un número positivo'),
  activo: z.boolean(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
