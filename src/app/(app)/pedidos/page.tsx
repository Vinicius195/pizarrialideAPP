'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button, buttonVariants } from '@/components/ui/button';
import type { Order, OrderStatus } from '@/types';
import { Clock, PlusCircle, MoreHorizontal, Search, MessageSquare, Trash2, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AddOrderDialog, type AddOrderFormValues } from '@/components/app/add-order-dialog';
import { OrderDetailsDialog } from '@/components/app/order-details-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useUser, kanbanStatuses } from '@/contexts/user-context';
import { Badge } from '@/components/ui/badge';
import { cn, formatTimestamp } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

function OrderCard({ 
  order, 
  onAdvanceStatus, 
  onViewDetails,
  onCancelOrder,
  onEditOrder
}: { 
  order: Order; 
  onAdvanceStatus: (orderId: string) => void; 
  onViewDetails: (order: Order) => void; 
  onCancelOrder: (orderId: string) => void; 
  onEditOrder: (order: Order) => void;
}) {
  const { currentUser } = useUser();
  const isManager = currentUser?.role === 'Administrador';

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Recebido': return 'border-chart-3';
      case 'Preparando': return 'border-chart-4';
      case 'Pronto': return 'border-chart-2';
      case 'Em Entrega': return 'border-primary';
      case 'Entregue': return 'border-border';
      case 'Cancelado': return 'border-destructive';
      default: return 'border-border';
    }
  }

  const isActionDisabled = order.status === 'Entregue' || order.status === 'Cancelado';

  return (
    <Card className={`shadow-md hover:shadow-lg transition-shadow border-l-4 bg-card ${getStatusColor(order.status)} flex flex-col`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
          <div>
            <CardTitle className="font-headline text-base">Pedido #{order.orderNumber}</CardTitle>
            <CardDescription>{order.customerName}</CardDescription>
          </div>
          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            {order.notes && (
               <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <MessageSquare className="h-5 w-5 text-accent" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Contém observações</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Badge variant={order.orderType === 'entrega' ? 'default' : 'secondary'} className="capitalize text-xs whitespace-nowrap">
              {order.orderType}
            </Badge>
            <div className='flex items-center gap-1 whitespace-nowrap'>
              <Clock className="h-4 w-4" />
              <span>{formatTimestamp(order.timestamp)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2 flex-1">
        <ul className="space-y-1 text-sm">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between">
              <span className="truncate">{item.quantity}x {item.productName} {item.size && <span className='capitalize'>({item.size})</span>}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex justify-between items-center p-3 border-t">
        <div>
          <span className="text-muted-foreground text-xs">Total</span>
          <p className="font-bold text-base">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onViewDetails(order)}>Detalhes</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-5 w-5" />
                <span className="sr-only">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onEditOrder(order)}
                disabled={isActionDisabled}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar Pedido
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAdvanceStatus(order.id)}
                disabled={isActionDisabled}
              >
                Avançar Status
              </DropdownMenuItem>
              {isManager && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                    onClick={() => onCancelOrder(order.id)}
                    disabled={isActionDisabled}
                  >
                    Cancelar Pedido
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
}

function PedidosPageContent() {
  const searchParams = useSearchParams();
  const { 
    currentUser, 
    orders, 
    advanceOrderStatus, 
    addOrder,
    updateOrder,
    cancelOrder,
    deleteAllOrders,
    orderStatuses,
  } = useUser();

  const isMobile = useIsMobile();
  const statusFilter = searchParams.get('status');
  
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  
  const allTabs = ['Todos', ...orderStatuses];
  const defaultValue = statusFilter && allTabs.includes(statusFilter) ? statusFilter : 'Todos';
  
  useEffect(() => {
    const orderIdToOpen = searchParams.get('open');
    if (orderIdToOpen && orders.length > 0) {
      const orderToSelect = orders.find(o => o.id === orderIdToOpen);
      if (orderToSelect) {
        setSelectedOrder(orderToSelect);
      }
    }
  }, [searchParams, orders]);

  if (!currentUser) {
    return <PedidosPageSkeleton />;
  }
  const isManager = currentUser.role === 'Administrador';

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
  };
  
  const handleOpenAddDialog = () => {
    setEditingOrder(null);
    setIsOrderDialogOpen(true);
  };
  
  const handleOpenEditDialog = (order: Order) => {
    setEditingOrder(order);
    setIsOrderDialogOpen(true);
  };

  const handleSubmitOrder = (data: AddOrderFormValues) => {
    if (editingOrder) {
      updateOrder(editingOrder.id, data);
    } else {
      addOrder(data);
    }
    setIsOrderDialogOpen(false);
    setEditingOrder(null);
  };
  
  const handleClearAllOrders = () => {
    deleteAllOrders();
    setIsClearAllDialogOpen(false);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingOrder(null);
    }
    setIsOrderDialogOpen(open);
  };

  const filteredOrders = orders.filter(order =>
    order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (order.orderNumber && order.orderNumber.toString().includes(searchQuery))
  );

  const ordersByStatus = (status: OrderStatus) => {
    return filteredOrders.filter((order: Order) => order.status === status);
  };
  
  const getStatusTabClasses = (status: OrderStatus): string => {
    switch (status) {
      case 'Recebido':
        return 'bg-chart-3/10 text-chart-3 data-[state=active]:bg-chart-3 data-[state=active]:text-white';
      case 'Preparando':
        return 'bg-chart-4/10 text-chart-4 data-[state=active]:bg-chart-4 data-[state=active]:text-white';
      case 'Pronto':
        return 'bg-chart-2/10 text-chart-2 data-[state=active]:bg-chart-2 data-[state=active]:text-white';
      case 'Em Entrega':
        return 'bg-primary/10 text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground';
      case 'Entregue':
        return 'bg-slate-400/10 text-slate-600 dark:text-slate-300 data-[state=active]:bg-slate-500 data-[state=active]:text-white';
      case 'Cancelado':
        return 'bg-destructive/10 text-destructive data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground';
      default:
        return '';
    }
  };

  function KanbanSkeleton() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-44 w-full rounded-lg" />
            <Skeleton className="h-44 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <AddOrderDialog 
        open={isOrderDialogOpen} 
        onOpenChange={handleDialogClose}
        onSubmit={handleSubmitOrder}
        order={editingOrder}
      />
      <OrderDetailsDialog 
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      />

      <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação irá arquivar permanentemente todos os pedidos ativos. O histórico de clientes será mantido, mas os pedidos em si serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAllOrders} className={buttonVariants({ variant: "destructive" })}>
              Sim, arquivar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold font-headline">Pedidos</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente ou nº do pedido..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleOpenAddDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Pedido
          </Button>
          {isManager && (
            <Button variant="destructive" onClick={() => setIsClearAllDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Pedidos
            </Button>
          )}
        </div>
      </div>
      
      {isManager ? (
        <Tabs defaultValue={defaultValue} className="w-full">
            <TabsList className="h-auto flex-wrap justify-start gap-1">
                <TabsTrigger value="Todos" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Todos</TabsTrigger>
                {orderStatuses.map(status => (
                    <TabsTrigger key={status} value={status} className={cn('font-semibold', getStatusTabClasses(status))}>{status}</TabsTrigger>
                ))}
            </TabsList>
            <TabsContent value="Todos" className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onAdvanceStatus={advanceOrderStatus} 
                  onViewDetails={handleViewDetails}
                  onCancelOrder={cancelOrder}
                  onEditOrder={handleOpenEditDialog}
                />
            ))}
            </TabsContent>
            {orderStatuses.map(status => (
            <TabsContent key={status} value={status} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredOrders.filter(order => order.status === status).map(order => (
                <OrderCard 
                    key={order.id} 
                    order={order} 
                    onAdvanceStatus={advanceOrderStatus} 
                    onViewDetails={handleViewDetails}
                    onCancelOrder={cancelOrder}
                    onEditOrder={handleOpenEditDialog}
                />
                ))}
            </TabsContent>
            ))}
        </Tabs>
      ) : (
        <>
          {isMobile === undefined && <KanbanSkeleton />}
          {isMobile === true && (
            <Tabs defaultValue={kanbanStatuses[0].status} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-transparent p-0 border-b gap-1">
                {kanbanStatuses.map(({ status, icon: Icon }) => (
                  <TabsTrigger
                    key={status}
                    value={status}
                    className="flex flex-col h-auto p-2 gap-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-primary/5 data-[state=active]:shadow-none"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-semibold">{status}</span>
                    </div>
                    <Badge
                      className={cn(
                        "w-6 h-6 flex items-center justify-center p-0 rounded-full text-xs",
                        ordersByStatus(status).length > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {ordersByStatus(status).length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
              {kanbanStatuses.map(({ status, icon: Icon }) => (
                <TabsContent key={status} value={status} className="mt-4 grid gap-4">
                  {ordersByStatus(status).length > 0 ? (
                    ordersByStatus(status).map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAdvanceStatus={advanceOrderStatus}
                        onViewDetails={handleViewDetails}
                        onCancelOrder={cancelOrder}
                        onEditOrder={handleOpenEditDialog}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 rounded-md text-sm text-muted-foreground bg-muted/20">
                      <Icon className="h-16 w-16 text-muted-foreground/30" />
                      <p className="mt-4 font-medium">Nenhum pedido em "{status}"</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
          {isMobile === false && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
              {kanbanStatuses.map(({status, icon: Icon, color}) => (
                  <Card key={status} className="w-full shadow-md">
                      <CardHeader className={cn("flex flex-row items-center justify-between p-3", color)}>
                          <div className="flex items-center gap-2">
                              <Icon className="h-5 w-5" />
                              <h2 className="font-headline font-semibold text-lg">{status}</h2>
                          </div>
                          <Badge className="bg-white/20 hover:bg-white/30">{ordersByStatus(status).length}</Badge>
                      </CardHeader>
                      <CardContent className="p-3 space-y-4 min-h-[calc(100vh-320px)]">
                          {ordersByStatus(status).length > 0 ? (
                              ordersByStatus(status).map((order) => (
                                  <OrderCard
                                      key={order.id}
                                      order={order}
                                      onAdvanceStatus={advanceOrderStatus}
                                      onViewDetails={handleViewDetails}
                                      onCancelOrder={cancelOrder}
                                      onEditOrder={handleOpenEditDialog}
                                  />
                              ))
                          ) : (
                              <div className="flex flex-col items-center justify-center h-48 rounded-md text-sm text-muted-foreground">
                                  <Icon className="h-12 w-12 text-muted-foreground/30" />
                                  <p className="mt-4">Nenhum pedido aqui.</p>
                              </div>
                          )}
                      </CardContent>
                  </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function PedidosPageSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[250px] w-full" />
        ))}
      </div>
    </div>
  );
}

export default function PedidosPage() {
  return (
    <Suspense fallback={<PedidosPageSkeleton />}>
      <PedidosPageContent />
    </Suspense>
  )
}
