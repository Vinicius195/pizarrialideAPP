'use client';

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUser } from "@/contexts/user-context";
import type { OrderStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Package, ChefHat, Pizza, Bike, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { TopProductsCard } from "@/components/app/top-products-card";
import { DailyRevenueCard } from "@/components/app/daily-revenue-card";
import { fontHeadline } from "@/lib/fonts"; // Corrected import path

type StatCard = {
  status: OrderStatus;
  title: string;
  icon: LucideIcon;
  color: string;
};

const statCards: StatCard[] = [
  { status: "Recebido", title: "Pedidos Recebidos", icon: Package, color: "text-chart-3" },
  { status: "Preparando", title: "Em Preparo", icon: ChefHat, color: "text-chart-4" },
  { status: "Pronto", title: "Pedidos Prontos", icon: Pizza, color: "text-chart-2" },
  { status: "Em Entrega", title: "Em Rota de Entrega", icon: Bike, color: "text-primary" },
  { status: "Entregue", title: "Pedidos Entregues", icon: CheckCircle, color: "text-muted-foreground" },
  { status: "Cancelado", title: "Pedidos Cancelados", icon: XCircle, color: "text-destructive" },
];

export default function DashboardPage() {
  const { orders } = useUser();

  const getOrderCountByStatus = (status: OrderStatus) => {
    return orders.filter(order => order.status === status).length;
  };

  const totalOrders = orders.filter(order => order.status !== 'Cancelado').length;

  const getStatusBadgeClasses = (status: OrderStatus): string => {
    switch (status) {
      case "Recebido":
        return "bg-chart-3/10 text-chart-3 border-chart-3/20";
      case "Preparando":
        return "bg-chart-4/10 text-chart-4 border-chart-4/20";
      case "Pronto":
        return "bg-chart-2/10 text-chart-2 border-chart-2/20";
      case "Em Entrega":
        return "bg-primary/10 text-primary border-primary/20";
      case "Entregue":
        return "bg-muted text-muted-foreground border-border";
      case "Cancelado":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="space-y-6">
       <div>
        <h1 className={cn("text-3xl font-bold", fontHeadline.className)}>Dashboard</h1>
        <p className="text-muted-foreground">
          Visualize as métricas e o resumo da sua operação em tempo real.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DailyRevenueCard />
        <Link href="/pedidos">
           <Card className="shadow-md hover:shadow-lg transition-shadow h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:pb-2">
              <CardTitle className="text-sm font-medium">Total de Pedidos Válidos</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">Total de pedidos não cancelados hoje</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ status, title, icon: Icon, color }) => {
          const href = status === 'Em Entrega' ? '/entregas' : `/pedidos?status=${status}`;
          return(
          <Link href={href} key={status}>
            <Card className="shadow-md hover:shadow-lg transition-shadow h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={cn("h-4 w-4", color)} />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:pt-2">
                <div className="text-2xl sm:text-3xl font-bold">{getOrderCountByStatus(status)}</div>
                 <p className="text-xs text-muted-foreground">Total de pedidos neste status</p>
              </CardContent>
            </Card>
          </Link>
        )})}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <TopProductsCard />
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Últimos Pedidos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Itens</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center w-[120px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.slice(0, 5).map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                      <TableCell>
                        {order.customerName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {order.items.map(i => i.productName).join(', ')}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("border text-xs", getStatusBadgeClasses(order.status))}>
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
