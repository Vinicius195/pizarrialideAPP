'use client';

import React, { useState, useEffect } from 'react';
import type { Order, OrderStatus } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bike, Check, MapPin, Phone, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/user-context';


export default function EntregasPage() {
    const { orders, advanceOrderStatus } = useUser();
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

    const deliveryOrders = orders.filter(
        order => order.orderType === 'entrega' && ['Pronto', 'Em Entrega', 'Entregue'].includes(order.status)
    ).sort((a, b) => {
        const statusOrder: OrderStatus[] = ['Pronto', 'Em Entrega', 'Entregue'];
        const aIndex = statusOrder.indexOf(a.status);
        const bIndex = statusOrder.indexOf(b.status);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    const handleAdvanceStatus = async (orderId: string) => {
        setUpdatingOrderId(orderId);
        try {
            await advanceOrderStatus(orderId);
        } catch (error) {
            console.error("Failed to advance order status:", error);
        } finally {
            // Keep the animation for a short period to make it noticeable
            setTimeout(() => {
                setUpdatingOrderId(null);
            }, 500);
        }
    };

    const getStatusBadgeClasses = (status: OrderStatus): string => {
        switch (status) {
          case "Pronto":
            return "bg-chart-2/10 text-chart-2 border-chart-2/20";
          case "Em Entrega":
            return "bg-primary/10 text-primary border-primary/20";
          case "Entregue":
            return "bg-muted text-muted-foreground border-border";
          default:
            return "bg-secondary text-secondary-foreground";
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Controle de Entregas</h1>
                <p className="text-muted-foreground">Gerencie os pedidos que estão prontos, em rota ou já foram entregues.</p>
            </div>
            
            {deliveryOrders.length === 0 ? (
                 <Card className="shadow-lg mt-6">
                    <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground">
                            <Bike className="mx-auto h-12 w-12" />
                            <h3 className="mt-4 text-lg font-semibold">Nenhum pedido para entrega no momento</h3>
                            <p className="mt-1 text-sm">Pedidos de entrega com status "Pronto", "Em Entrega" ou "Entregue" aparecerão aqui.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {deliveryOrders.map(order => (
                        <Card 
                            key={order.id} 
                            className={cn(
                                "shadow-lg flex flex-col transition-all duration-500", 
                                order.status === 'Entregue' && 'opacity-60 hover:opacity-90',
                                updatingOrderId === order.id && 'animate-pulse-once'
                            )}
                        >
                           <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                    <CardTitle className="font-headline">Pedido #{order.orderNumber}</CardTitle>
                                    <Badge variant="outline" className={cn("text-xs w-fit", getStatusBadgeClasses(order.status))}>
                                      {order.status}
                                    </Badge>
                                </div>
                                <CardDescription>{order.customerName}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1">
                                {order.customerPhone && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <a href={`tel:${order.customerPhone}`} className="font-medium hover:underline">{order.customerPhone}</a>
                                    </div>
                                )}
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                                    <div className="text-sm">
                                        {order.address ? (
                                            <p>{order.address}</p>
                                        ) : order.locationLink ? (
                                            <a
                                                href={order.locationLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-primary underline hover:text-primary/80"
                                            >
                                                <LinkIcon className="h-4 w-4" />
                                                Abrir link de localização
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        ) : (
                                            <p className="text-muted-foreground">Endereço não informado.</p>
                                        )}
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-1 text-sm">
                                    <h4 className="font-medium">Itens:</h4>
                                    <ul className="list-disc list-inside text-muted-foreground pl-2">
                                    {order.items.map((item, index) => (
                                        <li key={index}>
                                            {item.quantity}x {item.productName} {item.size && <span className='capitalize'>({item.size})</span>}
                                        </li>
                                    ))}
                                    </ul>
                                </div>
                            </CardContent>
                            <CardFooter>
                                {order.status === 'Entregue' ? (
                                    <Button className="w-full" disabled variant="outline">
                                        <Check className="mr-2 h-4 w-4" />
                                        Pedido Entregue
                                    </Button>
                                ) : (
                                    <Button className="w-full" onClick={() => handleAdvanceStatus(order.id)} disabled={updatingOrderId === order.id}>
                                        {order.status === 'Pronto' ? (
                                            <>
                                                <Bike className="mr-2 h-4 w-4" />
                                                Marcar como "Em Entrega"
                                            </>
                                        ) : (
                                            <>
                                                <Check className="mr-2 h-4 w-4" />
                                                Marcar como "Entregue"
                                            </>
                                        )}
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
