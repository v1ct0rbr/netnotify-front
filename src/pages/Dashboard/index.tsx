import { fetchDashboardData, type dashboardData } from "@/api/dashboard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

const Dashboard = () => {
  const [data, setData] = useState<dashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const dashboardData = await fetchDashboardData();
        setData(dashboardData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar dados do dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-6 w-2/3 mt-2" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <Skeleton className="h-80 w-full" />
          </Card>
          <Card className="p-4">
            <Skeleton className="h-80 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </Card>
      </div>
    );
  }

  // Transformar dados para os gráficos
  const levelData = data.totalMessagesByLevel.map((item) => ({
    name: item.name,
    value: item.count,
  }));

  const typeData = data.totalMessagesByType.map((item) => ({
    name: item.name,
    value: item.count,
  }));

  return (
    <div className="p-8 space-y-8">
      {/* Cards de resumo com efeitos melhorados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="stat-card">
          <div className="flex flex-col relative z-10">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Total de Mensagens
            </span>
            <span className="text-4xl font-bold mt-3" style={{background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
              {data.totalMessages}
            </span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="flex flex-col relative z-10">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Níveis
            </span>
            <span className="text-4xl font-bold mt-3" style={{background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
              {levelData.length}
            </span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="flex flex-col relative z-10">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tipos
            </span>
            <span className="text-4xl font-bold mt-3" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
              {typeData.length}
            </span>
          </div>
        </Card>
      </div>

      {/* Gráficos com cards melhorados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Por Nível */}
        <Card className="p-8">
          <h3 className="text-xl font-bold mb-6" style={{background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
            Mensagens por Nível
          </h3>
          {levelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={levelData}>
                <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" stroke="#3b82f6" opacity={0.1} />
                <XAxis
                  dataKey="name"
                  className="text-xs dark:text-gray-400"
                />
                <YAxis className="text-xs dark:text-gray-400" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "2px solid #3b82f6",
                    borderRadius: "0.75rem",
                    boxShadow: "0 10px 25px rgba(59, 130, 246, 0.2)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </Card>

        {/* Gráfico de Pizza - Por Tipo */}
        <Card className="p-8">
          <h3 className="text-xl font-bold mb-6" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
            Mensagens por Tipo
          </h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }: any) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "2px solid #ec4899",
                    borderRadius: "0.75rem",
                    boxShadow: "0 10px 25px rgba(236, 72, 153, 0.2)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;