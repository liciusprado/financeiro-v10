/**
 * Form Validation Helpers
 * Validações reutilizáveis e mensagens de erro
 */

import { z } from 'zod';

/**
 * Mensagens de erro customizadas em português
 */
export const errorMessages = {
  required: 'Este campo é obrigatório',
  email: 'Email inválido',
  minLength: (min: number) => `Mínimo de ${min} caracteres`,
  maxLength: (max: number) => `Máximo de ${max} caracteres`,
  min: (min: number) => `Valor mínimo: ${min}`,
  max: (max: number) => `Valor máximo: ${max}`,
  pattern: 'Formato inválido',
  positive: 'Deve ser um valor positivo',
  negative: 'Deve ser um valor negativo',
  integer: 'Deve ser um número inteiro',
  url: 'URL inválida',
  phone: 'Telefone inválido',
  cpf: 'CPF inválido',
  cnpj: 'CNPJ inválido',
  cep: 'CEP inválido',
  date: 'Data inválida',
  dateInFuture: 'Data deve ser no futuro',
  dateInPast: 'Data deve ser no passado',
  passwordMismatch: 'Senhas não conferem',
  weakPassword: 'Senha muito fraca',
};

/**
 * Schemas Zod reutilizáveis
 */

// Email
export const emailSchema = z
  .string({ required_error: errorMessages.required })
  .email(errorMessages.email);

// Password
export const passwordSchema = z
  .string({ required_error: errorMessages.required })
  .min(8, errorMessages.minLength(8))
  .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
  .regex(/[a-z]/, 'Deve conter ao menos uma letra minúscula')
  .regex(/[0-9]/, 'Deve conter ao menos um número')
  .regex(/[^A-Za-z0-9]/, 'Deve conter ao menos um caractere especial');

// Strong Password
export const strongPasswordSchema = passwordSchema
  .min(12, errorMessages.minLength(12));

// Name
export const nameSchema = z
  .string({ required_error: errorMessages.required })
  .min(2, errorMessages.minLength(2))
  .max(100, errorMessages.maxLength(100));

// Phone
export const phoneSchema = z
  .string({ required_error: errorMessages.required })
  .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, errorMessages.phone);

// CPF
export const cpfSchema = z
  .string({ required_error: errorMessages.required })
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, errorMessages.cpf)
  .refine(validateCPF, errorMessages.cpf);

// CNPJ
export const cnpjSchema = z
  .string({ required_error: errorMessages.required })
  .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, errorMessages.cnpj)
  .refine(validateCNPJ, errorMessages.cnpj);

// CEP
export const cepSchema = z
  .string({ required_error: errorMessages.required })
  .regex(/^\d{5}-\d{3}$/, errorMessages.cep);

// URL
export const urlSchema = z
  .string({ required_error: errorMessages.required })
  .url(errorMessages.url);

// Currency (BRL)
export const currencySchema = z
  .number({ required_error: errorMessages.required })
  .positive(errorMessages.positive);

// Positive Integer
export const positiveIntSchema = z
  .number({ required_error: errorMessages.required })
  .int(errorMessages.integer)
  .positive(errorMessages.positive);

// Date in Future
export const futureDateSchema = z
  .date({ required_error: errorMessages.required })
  .refine((date) => date > new Date(), errorMessages.dateInFuture);

// Date in Past
export const pastDateSchema = z
  .date({ required_error: errorMessages.required })
  .refine((date) => date < new Date(), errorMessages.dateInPast);

/**
 * Validation Functions
 */

// Validar CPF
export function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');

  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;

  return parseInt(cpf.charAt(9)) === digit1 && parseInt(cpf.charAt(10)) === digit2;
}

// Validar CNPJ
export function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '');

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
}

// Password Strength
export function getPasswordStrength(password: string): {
  score: number; // 0-5
  label: string;
  color: string;
} {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { score: 0, label: 'Muito Fraca', color: 'red' },
    { score: 1, label: 'Fraca', color: 'orange' },
    { score: 2, label: 'Média', color: 'yellow' },
    { score: 3, label: 'Boa', color: 'blue' },
    { score: 4, label: 'Forte', color: 'green' },
    { score: 5, label: 'Muito Forte', color: 'green' },
  ];

  return levels[score];
}

/**
 * Format Helpers
 */

// Format CPF
export function formatCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

// Format CNPJ
export function formatCNPJ(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

// Format Phone
export function formatPhone(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4,5})(\d{4})/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

// Format CEP
export function formatCEP(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
}

// Format Currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Parse Currency
export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
}

/**
 * Form Schemas Completos
 */

// Login Form
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, errorMessages.required),
});

// Register Form
export const registerFormSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: errorMessages.passwordMismatch,
    path: ['confirmPassword'],
  });

// Transaction Form
export const transactionFormSchema = z.object({
  description: z
    .string()
    .min(1, errorMessages.required)
    .max(200, errorMessages.maxLength(200)),
  amount: currencySchema,
  category: z.string().min(1, errorMessages.required),
  date: z.date({ required_error: errorMessages.required }),
  type: z.enum(['income', 'expense']),
  notes: z.string().optional(),
});

// Goal Form
export const goalFormSchema = z.object({
  name: z
    .string()
    .min(1, errorMessages.required)
    .max(100, errorMessages.maxLength(100)),
  targetAmount: currencySchema,
  currentAmount: z.number().min(0).default(0),
  deadline: futureDateSchema,
  description: z.string().optional(),
});

// Budget Form
export const budgetFormSchema = z.object({
  category: z.string().min(1, errorMessages.required),
  amount: currencySchema,
  period: z.enum(['monthly', 'yearly']),
});

// Profile Form
export const profileFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  bio: z.string().max(500, errorMessages.maxLength(500)).optional(),
});

/**
 * Exemplo de uso:
 * 
 * // 1. Com React Hook Form
 * import { useForm } from 'react-hook-form';
 * import { zodResolver } from '@hookform/resolvers/zod';
 * 
 * const form = useForm({
 *   resolver: zodResolver(loginFormSchema),
 * });
 * 
 * // 2. Validação manual
 * const result = loginFormSchema.safeParse(data);
 * if (!result.success) {
 *   console.log(result.error.errors);
 * }
 * 
 * // 3. Format helpers
 * const formattedCPF = formatCPF('12345678900');
 * const formattedPhone = formatPhone('11999887766');
 * 
 * // 4. Validation helpers
 * const isValid = validateCPF('123.456.789-00');
 * const strength = getPasswordStrength('MyP@ssw0rd123');
 */
