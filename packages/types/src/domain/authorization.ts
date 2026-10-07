import { AuthorizationValidity, type AuthorizationStatus } from '../enums';
import { diffDaysIso, type IsoDate } from './dates';

export interface ValidityThresholds {
  /** Até quantos dias antes do vencimento a carta fica AMARELA (padrão 30). */
  warningDays: number;
  /** Até quantos dias antes do vencimento a carta fica VERMELHA (padrão 7). */
  criticalDays: number;
}

export const DEFAULT_VALIDITY_THRESHOLDS: ValidityThresholds = { warningDays: 30, criticalDays: 7 };

export interface LetterDates {
  status: AuthorizationStatus;
  validFrom?: IsoDate | null;
  expirationDate?: IsoDate | null;
  deletedAt?: string | Date | null;
}

export interface LetterValidity {
  validity: AuthorizationValidity;
  /** Dias até o vencimento (negativo = expirada há N dias; null = sem vencimento). */
  daysLeft: number | null;
}

/**
 * Regra de vencimento:
 *  - mais de 30 dias ............ VERDE (VALID)
 *  - de 30 a 8 dias ............. AMARELO (EXPIRING)
 *  - de 7 dias até o dia do vencimento ... VERMELHO (CRITICAL)
 *  - após o vencimento .......... VERMELHO CRÍTICO (EXPIRED)
 */
export function computeLetterValidity(
  letter: LetterDates,
  today: IsoDate,
  thresholds: ValidityThresholds = DEFAULT_VALIDITY_THRESHOLDS,
): LetterValidity {
  if (letter.status === 'REVOKED' || letter.deletedAt) {
    return { validity: AuthorizationValidity.REVOKED, daysLeft: null };
  }
  if (letter.validFrom && letter.validFrom > today) {
    return {
      validity: AuthorizationValidity.NOT_YET_VALID,
      daysLeft: letter.expirationDate ? diffDaysIso(today, letter.expirationDate) : null,
    };
  }
  if (!letter.expirationDate)
    return { validity: AuthorizationValidity.NO_EXPIRATION, daysLeft: null };
  const daysLeft = diffDaysIso(today, letter.expirationDate);
  if (daysLeft < 0) return { validity: AuthorizationValidity.EXPIRED, daysLeft };
  if (daysLeft <= thresholds.criticalDays)
    return { validity: AuthorizationValidity.CRITICAL, daysLeft };
  if (daysLeft <= thresholds.warningDays)
    return { validity: AuthorizationValidity.EXPIRING, daysLeft };
  return { validity: AuthorizationValidity.VALID, daysLeft };
}

/** A carta autoriza a visita hoje? */
export function isUsableValidity(validity: AuthorizationValidity): boolean {
  return (
    validity === AuthorizationValidity.VALID ||
    validity === AuthorizationValidity.EXPIRING ||
    validity === AuthorizationValidity.CRITICAL ||
    validity === AuthorizationValidity.NO_EXPIRATION
  );
}

const SEVERITY: Record<AuthorizationValidity, number> = {
  NO_EXPIRATION: 0,
  VALID: 1,
  EXPIRING: 2,
  CRITICAL: 3,
  NOT_YET_VALID: 4,
  EXPIRED: 5,
  REVOKED: 6,
};

export interface StoreAuthorizationSummary extends LetterValidity {
  hasValid: boolean;
  letterCount: number;
}

/**
 * Situação de autorização de uma loja considerando todas as suas cartas:
 * usa a melhor carta vigente (a que vence por último); se nenhuma estiver
 * vigente, retorna a situação menos grave entre elas (ou null se não há cartas).
 */
export function summarizeStoreAuthorization(
  letters: LetterDates[],
  today: IsoDate,
  thresholds: ValidityThresholds = DEFAULT_VALIDITY_THRESHOLDS,
): StoreAuthorizationSummary | null {
  const evaluated = letters
    .map((letter) => ({ letter, result: computeLetterValidity(letter, today, thresholds) }))
    .filter((item) => item.result.validity !== AuthorizationValidity.REVOKED);
  if (evaluated.length === 0) return null;
  const usable = evaluated.filter((item) => isUsableValidity(item.result.validity));
  if (usable.length > 0) {
    const best = usable.sort((a, b) => {
      const da = a.result.daysLeft ?? Number.POSITIVE_INFINITY;
      const db = b.result.daysLeft ?? Number.POSITIVE_INFINITY;
      return db - da;
    })[0]!;
    return { ...best.result, hasValid: true, letterCount: evaluated.length };
  }
  const leastSevere = evaluated.sort(
    (a, b) => SEVERITY[a.result.validity] - SEVERITY[b.result.validity],
  )[0]!;
  return { ...leastSevere.result, hasValid: false, letterCount: evaluated.length };
}

export function describeDaysLeft(daysLeft: number | null): string {
  if (daysLeft == null) return 'Sem data de vencimento';
  if (daysLeft < 0)
    return `Expirada há ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) === 1 ? '' : 's'}`;
  if (daysLeft === 0) return 'Vence hoje';
  if (daysLeft === 1) return 'Vence amanhã';
  return `Vence em ${daysLeft} dias`;
}
