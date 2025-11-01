import { Button } from "@/components/ui/button";

export function LoginForm({
    className,
}: {
    className?: string;
}) {
    const handleLogin = () => {
        // Redirecionar para página raiz que iniciará o fluxo OAuth2
        window.location.href = '/';
    };

    return (
        <div className={className}>
            <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleLogin}
            >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Entrar com Keycloak
            </Button>
        </div>
    )
}