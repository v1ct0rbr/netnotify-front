import { useSearchParams } from 'react-router-dom';
import { HomeForm } from './HomeForm';
export function HomePage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

 
  

  return (
    <div className="container mx-auto p-4">
      <HomeForm id={id} />
    </div>
  );
}