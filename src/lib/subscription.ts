/**
 * Helpers para verificação de plano/trial usando plan_status e trial_ends_at.
 */

export interface ProfileWithPlan {
  plan_status?: string | null;
  trial_ends_at?: string | null;
}

export interface TrialInfo {
  canCreate: boolean;
  status: 'active' | 'trialing' | 'expired' | 'none';
  daysRemaining: number | null;
  trialEndsAt: string | null;
  isExpired: boolean;
}

/**
 * Verifica se o usuário pode criar novo orçamento.
 * - active => pode criar
 * - trialing e trial_ends_at > agora => pode criar
 * - senão => bloqueado
 */
export function canCreateQuote(profile: ProfileWithPlan | null): boolean {
  if (!profile) return false;
  if (profile.plan_status === 'active') return true;
  if (profile.plan_status === 'trialing' && profile.trial_ends_at) {
    return new Date(profile.trial_ends_at) > new Date();
  }
  return false;
}

/**
 * Calcula dias restantes até trial_ends_at. Retorna null se data inválida ou inexistente.
 */
function getDaysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Retorna informações do trial/plano para exibição e lógica.
 */
export function getTrialInfo(profile: ProfileWithPlan | null): TrialInfo {
  const defaultInfo: TrialInfo = {
    canCreate: false,
    status: 'none',
    daysRemaining: null,
    trialEndsAt: null,
    isExpired: false,
  };

  if (!profile) return defaultInfo;

  const planStatus = profile.plan_status ?? null;
  const trialEndsAt = profile.trial_ends_at ?? null;

  if (planStatus === 'active') {
    return {
      canCreate: true,
      status: 'active',
      daysRemaining: null,
      trialEndsAt: null,
      isExpired: false,
    };
  }

  if (planStatus === 'trialing') {
    const daysRemaining = getDaysRemaining(trialEndsAt);
    const isExpired = daysRemaining !== null && daysRemaining <= 0;
    const canCreate = !isExpired;

    return {
      canCreate,
      status: isExpired ? 'expired' : 'trialing',
      daysRemaining,
      trialEndsAt,
      isExpired,
    };
  }

  return defaultInfo;
}
