import { HomeForm } from './HomeForm';

export function HomePage() {
  return (
    <div className="container mx-auto p-4">
      <h3 className="text-3xl font-bold mb-4">Envio de notificações</h3>
      <HomeForm />
    </div>
  );
}