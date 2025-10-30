import { Button } from "@/components/ui/button";
import { useKeycloak } from "@/hooks/useKeycloak";





export function LoginForm({
    className,
}: {
    className?: string;
}) {
   
    const { keycloak } = useKeycloak();
   


    return (
        <div className={className}>
            

            <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => keycloak?.login()}
            >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Entrar com Keycloak
            </Button>
        </div>
    )
}