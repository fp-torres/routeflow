import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ error: 'Informe um e-mail válido.' }).trim().toLowerCase(),
  password: z.string().min(1, 'Informe a senha.').max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: z
      .string()
      .min(10, 'A nova senha precisa ter pelo menos 10 caracteres.')
      .max(200)
      .regex(/[A-Za-z]/, 'Inclua ao menos uma letra.')
      .regex(/\d/, 'Inclua ao menos um número.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(120),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

const strongPassword = z
  .string()
  .min(10, 'A senha precisa ter pelo menos 10 caracteres.')
  .max(200)
  .regex(/[A-Za-z]/, 'Inclua ao menos uma letra.')
  .regex(/\d/, 'Inclua ao menos um número.');

const roleSchema = z.enum(['EMPLOYEE', 'MANAGER', 'ADMIN']);

/** Criação de usuário (somente administrador). */
export const userCreateSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome.').max(120),
  email: z.email({ error: 'Informe um e-mail válido.' }).trim().toLowerCase().max(191),
  password: strongPassword,
  role: roleSchema.default('EMPLOYEE'),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: roleSchema.optional(),
  active: z.boolean().optional(),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const userPasswordResetSchema = z.object({ password: strongPassword });
export type UserPasswordResetInput = z.infer<typeof userPasswordResetSchema>;

/** Transfere a programação (roteiros, rotas e visitas, endereço de casa) de um usuário para outro. */
export const transferOperationSchema = z.object({
  fromUserId: z.string().uuid(),
  includePast: z.boolean().default(false),
});
export type TransferOperationInput = z.infer<typeof transferOperationSchema>;
