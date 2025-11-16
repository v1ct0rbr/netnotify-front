import { useSearchParams } from 'react-router-dom';
import { MessageForm } from './components/MessageForm';
export function NewMessage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

 
  

  return (
    <div className="container mx-auto p-4">
      <MessageForm id={id} />
    </div>
  );
}