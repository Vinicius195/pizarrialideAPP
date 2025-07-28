'use client';

import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check } from 'lucide-react';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductSelect: (productId: string) => void;
  products: Product[];
  currentProductId?: string;
  title?: string;
}

export function ProductSelectionDialog({
  open,
  onOpenChange,
  onProductSelect,
  products,
  currentProductId,
  title = "Selecione um Produto"
}: ProductSelectionDialogProps) {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery) {
      return products;
    }
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, products]);

  const groupedProducts = useMemo(() => filteredProducts.reduce(
    (acc, product) => {
      const { category } = product;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    },
    {} as Record<Product['category'], Product[]>
  ), [filteredProducts]);

  const handleSelect = (productId: string) => {
    onProductSelect(productId);
    setSearchQuery(''); 
    onOpenChange(false);
  };

  const content = (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Pesquisar produto..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoFocus
      />
      <ScrollArea className="h-[50vh] pr-3">
        {Object.keys(groupedProducts).length > 0 ? (
          Object.entries(groupedProducts).map(([category, productList]) => (
            <div key={category} className="mb-4">
              <p className="text-sm font-semibold text-muted-foreground px-2 py-1.5">{category}</p>
              <div className="flex flex-col gap-1">
                {productList.map((product) => (
                  <Button
                    key={product.id}
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => handleSelect(product.id)}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        product.id === currentProductId
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span>{product.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhum produto encontrado.
          </p>
        )}
      </ScrollArea>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
