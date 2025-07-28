'use client';

import { useState, useEffect, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Order, OrderStatus, Customer } from '@/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, User, Phone, MapPin, DollarSign, Hash, Loader2 } from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { getAuthToken } = useUser();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      const token = await getAuthToken();
      if (!token) {
        setError("Autenticação necessária.");
        setIsLoading(false);
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        const customerRes = await fetch(`/api/customers/${id}`, { headers });
        if (!customerRes.ok) throw new Error('Cliente não encontrado.');
        const customerData: Customer = await customerRes.json();
        setCustomer(customerData);

        const historyRes = await fetch(`/api/customers/${id}/history`, { headers });
        if (!historyRes.ok) throw new Error('Falha ao buscar histórico de pedidos.');
        const historyData: Order[] = await historyRes.json();
        setCustomerOrders(historyData);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, getAuthToken]);

  if (isLoading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive font-semibold">Erro</p>
        <p className="text-muted-foreground">{error}</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/clientes">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Clientes
            </Link>
        </Button>
      </div>
    );
  }

  if (!customer) {
    return notFound();
  }
  
  const getStatusBadgeClasses = (status: OrderStatus): string => {
    switch (status) {
      case "Recebido": return "bg-chart-3/10 text-chart-3 border-chart-3/20";
      case "Preparando": return "bg-chart-4/10 text-chart-4 border-chart-4/20";
      case "Pronto": return "bg-chart-2/10 text-chart-2 border-chart-2/20";
      case "Em Entrega": return "bg-primary/10 text-primary border-primary/20";
      case "Entregue": return "bg-muted text-muted-foreground border-border";
      case "Cancelado": return "bg-destructive/10 text-destructive border-destructive/20";
      case "Arquivado": return "bg-slate-400/10 text-slate-500 border-slate-400/20";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="space-y-6">
       <div>
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/clientes"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link>
            </Button>
            <h1 className="text-3xl font-bold font-headline">Histórico do Cliente</h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center gap-3"><User className="h-6 w-6" /><span>{customer.name}</span></CardTitle>
            <CardDescription>Informações detalhadas e histórico completo de pedidos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="flex items-center gap-3"><Phone className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Telefone</p><p className="font-medium">{customer.phone || "Não informado"}</p></div></div>
            <div className="flex items-center gap-3"><Hash className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Total de Pedidos</p><p className="font-medium">{customerOrders.length}</p></div></div>
            <div className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Total Gasto</p><p className="font-medium">{customerOrders.reduce((acc, o) => o.status !== 'Cancelado' ? acc + o.total : acc, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div></div>
            {customer.address && (<div className="flex items-start gap-3 sm:col-span-2 md:col-span-3"><MapPin className="h-5 w-5 text-muted-foreground mt-1" /><div><p className="text-sm text-muted-foreground">Endereço Padrão</p><p className="font-medium">{customer.address}</p></div></div>)}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader><CardTitle>Histórico de Pedidos ({customerOrders.length})</CardTitle></CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[120px]">Pedido</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="hidden md:table-cell">Itens</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {customerOrders.length > 0 ? customerOrders.map(order => (
                    <TableRow key={order.id} className={cn(order.status === 'Arquivado' && 'text-muted-foreground/80')}>
                        <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                        <TableCell>{new Date(order.timestamp).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm max-w-xs truncate">{order.items.map(i => i.productName).join(', ')}</TableCell>
                        <TableCell className="text-center"><Badge variant="outline" className={cn("text-xs", getStatusBadgeClasses(order.status))}>{order.status}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                    </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Nenhum pedido encontrado para este cliente.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
