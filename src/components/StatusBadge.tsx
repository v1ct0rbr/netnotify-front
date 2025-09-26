import { Badge } from "./ui/badge";

interface StatusBadgeProps {
    level: 'Baixo' | 'Normal' | 'Alto' | 'Urgente';
}

export function StatusBadge({ level }: StatusBadgeProps) {
    let colorClass = '';
    switch (level) {
        case 'Baixo':
            colorClass = 'bg-green-500 text-white';
            break;
        case 'Normal':
            colorClass = 'bg-blue-500 text-white';
            break;
        case 'Alto':
            colorClass = 'bg-yellow-500 text-white';
            break;
        case 'Urgente':
            colorClass = 'bg-red-500 text-white';
            break;
    }

    return (
       <Badge className={`px-2 py-1 rounded ${colorClass}`}>
            {level}
       </Badge>
    );
}
