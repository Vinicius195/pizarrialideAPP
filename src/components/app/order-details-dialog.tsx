'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Order, OrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import { Clock, User, Tag, ShoppingCart, DollarSign, Bike, Store, MapPin, Link as LinkIcon, MessageSquare, Phone, Hash } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUser } from '@/contexts/user-context';

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

const DetailRow = ({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) => (
    <div className="flex flex-col items-start gap-1 sm:grid sm:grid-cols-3 sm:items-center">
        <div className="flex items-center col-span-1 gap-2 text-muted-foreground">
            <Icon className="h-4 w-4" />
            <span className="text-sm">{label}</span>
        </div>
        <div className="font-medium col-span-2 text-foreground/90 pl-6 sm:pl-0 sm:text-right">
            {children}
        </div>
    </div>
);

export function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
  const { products } = useUser();
  if (!order) return null;

  const getItemPrice = (itemName: string, itemSize?: string): number => {
    const isHalfHalf = itemName.startsWith('Meio a Meio:');
    if (isHalfHalf) {
        const name1 = itemName.split('/')[0].replace('Meio a Meio:', '').trim();
        const name2 = itemName.split('/')[1].trim();
        const product1 = products.find(p => p.name === name1);
        const product2 = products.find(p => p.name === name2);
        if (product1 && product2 && itemSize && product1.sizes && product2.sizes) {
            return Math.max(product1.sizes[itemSize] || 0, product2.sizes[itemSize] || 0);
        }
    } else {
        const product = products.find(p => p.name === itemName);
        if (product) {
            if (product.sizes && itemSize) {
                return product.sizes[itemSize] || 0;
            }
            if (product.price) {
                return product.price;
            }
        }
    }
    return 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Detalhes do Pedido #{order.orderNumber}</DialogTitle>
          <DialogDescription>
            Informações completas sobre o pedido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] sm:max-h-[65vh] overflow-y-auto pr-2 sm:pr-4">
          <div className="space-y-3">
             <DetailRow icon={User} label="Cliente">
                {order.customerName}
            </DetailRow>
            {order.customerPhone && (
                <DetailRow icon={Phone} label="Telefone">
                     <a href={`tel:${order.customerPhone}`} className="text-primary underline hover:text-primary/80">
                        {order.customerPhone}
                    </a>
                </DetailRow>
            )}
             <DetailRow icon={Clock} label="Horário">
                {order.timestamp}
            </DetailRow>
            <DetailRow icon={Tag} label="Status">
                <Badge variant="outline" className={cn("text-xs", getStatusBadgeClasses(order.status))}>
                    {order.status}
                </Badge>
            </DetailRow>
            <DetailRow icon={order.orderType === 'entrega' ? Bike : Store} label="Tipo">
                <span className="capitalize">{order.orderType}</span>
            </DetailRow>
            <DetailRow icon={Hash} label="ID do Pedido">
                <span className="font-mono text-xs text-muted-foreground">{order.id}</span>
            </DetailRow>
          </div>
          
          {order.orderType === 'entrega' && (order.address || order.locationLink) && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium">Endereço de Entrega</span>
                </div>
                {order.address && (
                  <p className="text-sm text-foreground/90 pl-6">{order.address}</p>
                )}
                {order.locationLink && (
                  <div className="pl-6">
                    <Button asChild variant="link" className="h-auto p-0 text-sm">
                      <a
                        href={order.locationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2"
                      >
                        <LinkIcon className="h-4 w-4" />
                        Abrir no mapa
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm font-medium">Itens</span>
            </div>
            <ul className="space-y-2 text-sm text-foreground/90 pl-6">
              {order.items.map((item, index) => {
                const price = getItemPrice(item.productName, item.size);
                return (
                    <li key={index} className="flex justify-between items-baseline">
                        <div className="flex-1">
                          <span>{item.quantity}x {item.productName} {item.size && <span className='capitalize'>({item.size})</span>}</span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground text-right pl-2">
                          {price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </li>
                )
              })}
            </ul>
          </div>

          {order.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">Observações</span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap pl-6">{order.notes}</p>
              </div>
            </>
          )}
          
          <Separator />
          
           <DetailRow icon={DollarSign} label="Total do Pedido">
                <span className="text-lg font-bold">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
           </DetailRow>
        </div>
        <DialogFooter className="border-t pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-full sm:w-auto">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
