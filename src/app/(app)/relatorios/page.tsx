'use client';

import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';

interface WeeklyRevenueData {
    date: string;
    revenue: number;
    name: string;
}

export default function RelatoriosPage() {
    const { currentUser } = useUser();
    const router = useRouter();
    const [weeklyRevenueData, setWeeklyRevenueData] = useState<WeeklyRevenueData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Redirect non-admin users immediately
        if (currentUser && currentUser.role !== 'Administrador') {
            router.push('/dashboard');
        }
    }, [currentUser, router]);

    useEffect(() => {
        // Fetch data only if the user is an admin
        if (currentUser?.role === 'Administrador') {
            const fetchWeeklyRevenue = async () => {
                try {
                    setIsLoading(true);
                    const response = await fetch('/api/reports/weekly-revenue');
                    if (!response.ok) {
                        throw new Error('Falha ao buscar dados de faturamento semanal.');
                    }
                    const data = await response.json();
                    setWeeklyRevenueData(data);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchWeeklyRevenue();
        }
    }, [currentUser]); // Dependency on currentUser ensures this runs when user data is available

    // Render loading/access denied states
    if (currentUser?.role !== 'Administrador') {
        return (
            <div className="flex items-center justify-center h-full">
                <Alert variant="destructive" className="w-auto">
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>Acesso Negado</AlertTitle>
                    <AlertDescription>
                        Você não tem permissão para acessar esta página.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Relatórios Gerenciais</h1>
                <p className="text-muted-foreground">Análises detalhadas de vendas e performance.</p>
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Faturamento na Última Semana</CardTitle>
                    <CardDescription>Receita total (pedidos não cancelados) nos últimos 7 dias.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="w-full h-[300px]" />
                    ) : error ? (
                         <Alert variant="destructive">
                            <FileWarning className="h-4 w-4" />
                            <AlertTitle>Erro ao carregar o gráfico</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={weeklyRevenueData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value) => `R$${value}`} />
                                <Tooltip formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Faturamento']} />
                                <Legend />
                                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Faturamento" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
