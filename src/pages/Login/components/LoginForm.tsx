import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useKeycloak } from "@/hooks/useKeycloak";
import { useAuthStore } from "@/store/useAuthStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as z from "zod";

const LoginFormSchema = z.object({
    username: z.string().min(1, "Login é obrigatório"),
    password: z.string().min(1, "Senha é obrigatória"),
    method: z.enum(["password", "ldap"], {
        message: "Selecione o método de autenticação"
    })
});

type LoginFormData = z.infer<typeof LoginFormSchema>;

export function LoginForm({
    className,
}: {
    className?: string;
}) {
    const login = useAuthStore((state) => state.login);
    const { keycloak } = useKeycloak();
    const navigate = useNavigate();

    const form = useForm<LoginFormData>({
        resolver: zodResolver(LoginFormSchema),
        defaultValues: {
            username: "",
            password: "",
            method: "password"
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            await login(data.username, data.password, data.method as 'password' | 'ldap');
            toast.success("Login realizado com sucesso!");
            navigate("/");
        } catch (error) {
            toast.error("Falha no login. Verifique suas credenciais.");
            console.error(error);
        }
    }

    return (
        <div className={className}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Usuário</FormLabel>
                                <FormControl>
                                    <input {...field} className="w-full border rounded px-3 py-2" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Senha</FormLabel>
                                <FormControl>
                                    <input {...field} type="password" className="w-full border rounded px-3 py-2" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="method"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Método</FormLabel>
                                <FormControl>
                                    <select {...field} className="w-full border rounded px-3 py-2">
                                        <option value="password">Senha</option>
                                        <option value="ldap">LDAP</option>
                                    </select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full">Entrar</Button>
                </form>
            </Form>

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Ou</span>
                </div>
            </div>

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