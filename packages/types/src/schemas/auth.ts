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
