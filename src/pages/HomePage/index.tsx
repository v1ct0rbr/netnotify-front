import Header from '@/components/header';
import { HomeForm } from './HomeForm';

export function HomePage() {
  return (
    <div className="container mx-auto p-4">
      <Header title="Envio de notificações" />
      <HomeForm />
    </div>
  );
}