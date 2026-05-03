import { useAuthStore } from "@/store/useAuthStore";
import { useEffect } from "react";
import { Mail, User, Shield, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Profile() {
    const { getAuthInfo, user, setUser } = useAuthStore();

    useEffect(() => {
        getAuthInfo().then(() => {
            setUser(user);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getRoleColor = (role: string) => {
        const roleColors: Record<string, string> = {
            'NETNOTIFY_ADMIN': 'bg-red-500/10 text-red-700 border-red-200',
            'SERVER_MANAGER': 'bg-blue-500/10 text-blue-700 border-blue-200',
            'ALERT_MANAGER': 'bg-orange-500/10 text-orange-700 border-orange-200',
            'REPORT_VIEWER': 'bg-green-500/10 text-green-700 border-green-200',
            'MONITORING_VIEWER': 'bg-purple-500/10 text-purple-700 border-purple-200',
            'NETNOTIFY_USER': 'bg-gray-500/10 text-gray-700 border-gray-200',
        };
        return roleColors[role] || 'bg-gray-500/10 text-gray-700 border-gray-200';
    };

    const getRoleIcon = (role: string) => {
        if (role.includes('ADMIN')) return '👑';
        if (role.includes('MANAGER')) return '⚙️';
        if (role.includes('VIEWER')) return '👁️';
        return '👤';
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Carregando informações do perfil...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
                <CardHeader className="pb-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-3xl font-bold shadow-lg">
                            {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-bold">{user.fullName}</CardTitle>
                            <CardDescription className="text-slate-300 mt-2">Perfil do Usuário</CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Profile Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email Card */}
                <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-500" />
                            <CardTitle className="text-lg">Email</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded-lg break-all">
                            {user.email}
                        </p>
                    </CardContent>
                </Card>

                {/* Username Card */}
                <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-emerald-500" />
                            <CardTitle className="text-lg">Usuário</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                            {user.fullName}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Roles Card */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-amber-500" />
                        <CardTitle className="text-lg">Permissões & Funções</CardTitle>
                    </div>
                    <CardDescription>
                        Funções associadas à sua conta
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {user.roles && user.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {user.roles.map((role) => (
                                <Badge
                                    key={role}
                                    className={`px-3 py-1.5 font-medium border cursor-default ${getRoleColor(role)}`}
                                >
                                    <span className="mr-2">{getRoleIcon(role)}</span>
                                    {role.replace(/_/g, ' ')}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma função atribuída</p>
                    )}
                </CardContent>
            </Card>

            {/* Info Footer */}
            <div className="text-center text-sm text-muted-foreground p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p>Para alterar suas informações, entre em contato com o administrador do sistema</p>
            </div>
        </div>
    );
}

export default Profile;