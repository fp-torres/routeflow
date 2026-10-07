import { MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { Button, EmptyState } from '@routeflow/ui';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={MapPin}
      title="Esta página não existe."
      description="O endereço pode ter mudado. Volte ao início para continuar."
      action={
        <Button asChild>
          <Link to="/dashboard">Ir para o início</Link>
        </Button>
      }
      className="mt-10"
    />
  );
}
