"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useMemo } from "react"
import { DollarSign, TrendingUp } from "lucide-react"
import { useUser } from "@/contexts/user-context"

export function DailyRevenueCard() {
  const { orders, isLoading } = useUser();

  const todayRevenue = useMemo(() => {
    // Filtra pedidos que não foram cancelados e calcula o total
    return orders
      .filter(order => order.status !== 'Cancelado')
      .reduce((total, order) => total + order.total, 0);
  }, [orders]); // O cálculo será refeito SOMENTE quando a lista de 'orders' mudar

  // Exibe um skeleton enquanto os pedidos iniciais estão sendo carregados
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:pb-2">
          <CardTitle className="text-sm font-medium">Faturamento do Dia</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:pt-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:pb-2">
        <CardTitle className="text-sm font-medium">Faturamento do Dia</CardTitle>
        <DollarSign className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:pt-2">
        <div className="text-2xl sm:text-3xl font-bold">
          {todayRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>Atualizado em tempo real</span>
        </div>
      </CardContent>
    </Card>
  )
}
