import {
  Ban,
  CircleCheck,
  CircleDot,
  CircleX,
  Clock,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  AUTHORIZATION_VALIDITY_LABEL,
  AUTHORIZATION_VALIDITY_TONE,
  describeDaysLeft,
  ROUTE_STATUS_LABEL,
  VISIT_STATUS_LABEL,
  VISIT_STATUS_TONE,
  type AuthorizationValidity,
  type RouteStatus,
  type StoreAuthorizationInfo,
  type VisitStatus,
} from '@routeflow/types';
import { Badge, type RouteStopState } from '@routeflow/ui';

const VISIT_ICON: Record<VisitStatus, React.ComponentType> = {
  PENDING: Clock,
  IN_PROGRESS: Play,
  COMPLETED: CircleCheck,
  NOT_COMPLETED: CircleX,
  RESCHEDULED: RotateCcw,
  CANCELLED: Ban,
  BLOCKED: ShieldAlert,
};

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  const Icon = VISIT_ICON[status];
  return (
    <Badge tone={VISIT_STATUS_TONE[status]}>
      <Icon />
      {VISIT_STATUS_LABEL[status]}
    </Badge>
  );
}

export function RouteStatusBadge({ status }: { status: RouteStatus }) {
  const tone =
    status === 'COMPLETED'
      ? 'success'
      : status === 'IN_PROGRESS'
        ? 'info'
        : status === 'CANCELLED'
          ? 'neutral'
          : 'outline';
  return (
    <Badge tone={tone}>
      <CircleDot />
      {ROUTE_STATUS_LABEL[status]}
    </Badge>
  );
}

export function ValidityBadge({
  validity,
  daysLeft,
}: {
  validity: AuthorizationValidity;
  daysLeft?: number | null;
}) {
  const usable = validity === 'VALID' || validity === 'NO_EXPIRATION' || validity === 'EXPIRING';
  const Icon = usable ? ShieldCheck : ShieldAlert;
  return (
    <Badge
      tone={AUTHORIZATION_VALIDITY_TONE[validity]}
      title={daysLeft !== undefined ? describeDaysLeft(daysLeft ?? null) : undefined}
    >
      <Icon />
      {AUTHORIZATION_VALIDITY_LABEL[validity]}
      {daysLeft != null && daysLeft >= 0 && (validity === 'CRITICAL' || validity === 'EXPIRING')
        ? ` · ${daysLeft}d`
        : ''}
    </Badge>
  );
}

export function StoreAuthBadge({ info }: { info: StoreAuthorizationInfo | null }) {
  if (info && info.required === false) {
    return (
      <Badge tone="neutral">
        <ShieldCheck />
        Carta não exigida
      </Badge>
    );
  }
  if (!info || !info.validity) {
    return (
      <Badge tone="warning">
        <ShieldAlert />
        Sem carta
      </Badge>
    );
  }
  return <ValidityBadge validity={info.validity} daysLeft={info.daysLeft} />;
}

export function visitState(status: VisitStatus | null | undefined): RouteStopState {
  switch (status) {
    case 'COMPLETED':
      return 'done';
    case 'IN_PROGRESS':
      return 'active';
    case 'NOT_COMPLETED':
    case 'BLOCKED':
      return 'failed';
    case 'RESCHEDULED':
    case 'CANCELLED':
      return 'skipped';
    default:
      return 'pending';
  }
}
