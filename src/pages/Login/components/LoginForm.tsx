import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuthStore } from "@/store/useAuthStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Home } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
// import { useDefaultColor } from "@/config/defaultColors";
import { StyledSelect } from "@/components/ui/styled-select";

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
    ...props
}: React.ComponentProps<"form">) {
    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const form = useForm<LoginFormData>({
        resolver: zodResolver(LoginFormSchema),
        defaultValues: {
            username: "",
            password: "",
            
        },
    });

    // Função para lidar com o envio do formulário
    const onSubmit = async (data: LoginFormData) => {
        try {
            await login(data.username, data.password);
            toast.success("Login realizado com sucesso!");
            // Redireciona para a página inicial após o login bem-sucedido
            navigate("/");
        } catch (error) {
            toast.error("Erro ao fazer login. Verifique suas credenciais.");
            // Aqui você pode lidar com erros de autenticação, como exibir uma mensagem de erro
            console.error("Erro ao fazer login:", error);
        }
    }
    return (
        <Form {...form}>


            <form className={cn("flex flex-col gap-6", className)} {...props}>
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Acesse sua conta</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                        Informe seu login e senha para acessar sua conta.
                    </p>
                </div>
                <div className="grid gap-6">
                    <FormField control={form.control} name="username" render={({ field }) => (
                        <FormItem className="grid gap-3">
                            <FormLabel htmlFor="login">Login</FormLabel>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Preencha com seu login"
                                {...field}
                            />
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem className="grid gap-3">
                                <FormLabel htmlFor="password">Senha</FormLabel>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Preencha com sua senha"
                                    required
                                    {...field}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="method"
                        render={({ field }) => (
                            <FormItem className="grid gap-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                                <StyledSelect
                                    options={[
                                        { label: "Selecione", value: "" },
                                        { label: "Senha", value: "password" },
                                        { label: "LDAP", value: "ldap" }
                                    ]}
                                    value={field.value}
                                    onChange={field.onChange}
                                    name={field.name}
                                    onBlur={field.onBlur}
                                    ref={field.ref}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className={`w-full`} onClick={form.handleSubmit(onSubmit)}>
                        Login
                    </Button>
                </div>

            </form>
            {/*
    Back to home link can be added here
    */}
            <div className="mt-4 text-center">
                <Link to="/" className="hover:underline flex items-center justify-center">
                    <Home className="inline mr-1" />
                    Voltar para a página inicial
                </Link>
            </div>
        </Form >
    )
}