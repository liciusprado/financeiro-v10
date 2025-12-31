import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
  minLength?: number;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

export function PasswordStrengthMeter({
  password,
  showRequirements = true,
  minLength = 8,
}: PasswordStrengthMeterProps) {
  const requirements: PasswordRequirement[] = [
    {
      label: `Mínimo ${minLength} caracteres`,
      test: (pwd) => pwd.length >= minLength,
    },
    {
      label: 'Pelo menos uma letra maiúscula',
      test: (pwd) => /[A-Z]/.test(pwd),
    },
    {
      label: 'Pelo menos uma letra minúscula',
      test: (pwd) => /[a-z]/.test(pwd),
    },
    {
      label: 'Pelo menos um número',
      test: (pwd) => /[0-9]/.test(pwd),
    },
    {
      label: 'Pelo menos um caractere especial',
      test: (pwd) => /[^A-Za-z0-9]/.test(pwd),
    },
  ];

  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '', percentage: 0 };

    let score = 0;
    const metRequirements = requirements.filter((req) => req.test(password));
    score = metRequirements.length;

    // Bonus por comprimento extra
    if (password.length >= 12) score += 0.5;
    if (password.length >= 16) score += 0.5;

    // Penalidade por padrões comuns
    if (/^[0-9]+$/.test(password)) score -= 1; // Apenas números
    if (/^[a-zA-Z]+$/.test(password)) score -= 0.5; // Apenas letras
    if (/(.)\1{2,}/.test(password)) score -= 0.5; // Caracteres repetidos

    const percentage = Math.min((score / requirements.length) * 100, 100);

    if (score < 2) {
      return {
        score,
        label: 'Muito Fraca',
        color: 'bg-red-500',
        textColor: 'text-red-600',
        percentage,
      };
    } else if (score < 3) {
      return {
        score,
        label: 'Fraca',
        color: 'bg-orange-500',
        textColor: 'text-orange-600',
        percentage,
      };
    } else if (score < 4) {
      return {
        score,
        label: 'Média',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-600',
        percentage,
      };
    } else if (score < 5) {
      return {
        score,
        label: 'Boa',
        color: 'bg-blue-500',
        textColor: 'text-blue-600',
        percentage,
      };
    } else {
      return {
        score,
        label: 'Excelente',
        color: 'bg-green-500',
        textColor: 'text-green-600',
        percentage,
      };
    }
  }, [password, minLength]);

  if (!password) return null;

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Força da senha:</span>
          <span className={cn('font-medium', strength.textColor)}>
            {strength.label}
          </span>
        </div>
        <Progress
          value={strength.percentage}
          className="h-2"
          indicatorClassName={strength.color}
        />
      </div>

      {/* Requirements */}
      {showRequirements && (
        <div className="space-y-2">
          {requirements.map((req, index) => {
            const isMet = req.test(password);
            return (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-2 text-sm',
                  isMet ? 'text-green-600' : 'text-muted-foreground'
                )}
              >
                {isMet ? (
                  <Check className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <X className="h-4 w-4 flex-shrink-0" />
                )}
                <span>{req.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tips */}
      {strength.score < 4 && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>💡 Dica:</strong> Use uma combinação de letras maiúsculas,
            minúsculas, números e símbolos para uma senha mais forte.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Validar senha segundo requisitos
 */
export function validatePassword(
  password: string,
  minLength: number = 8
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < minLength) {
    errors.push(`Senha deve ter no mínimo ${minLength} caracteres`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Gerar senha forte aleatória
 */
export function generateStrongPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';

  // Garantir pelo menos um de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Preencher o resto
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Embaralhar
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
