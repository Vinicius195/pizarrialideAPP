'use client';

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types';
import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProductSelectionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // CORRECTED: This now expects the product ID for robust handling.
  onSelectProduct: (productId: string) => void;
  products: Product[];
  title?: string;
  // This value is the product ID of the currently selected item.
  selectedValue?: string;
}

export function ProductSelectionDrawer({
  open,
  onOpenChange,
  onSelectProduct,
  products,
  title = 'Selecione um Produto',
  selectedValue,
}: ProductSelectionDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchTerm) {
      return products;
    }
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);
  
  const groupedProducts = useMemo(() => 
    filteredProducts.reduce(
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

  // CORRECTED: This now handles the product ID.
  const handleSelect = (productId: string) => {
    onSelectProduct(productId);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>Pesquise e selecione um item da lista abaixo.</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            <Input 
              placeholder="Pesquisar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
            <ScrollArea className="h-[60vh]">
              <div className="flex flex-col gap-y-1 pr-4">
                {Object.entries(groupedProducts).map(([category, productList]) => (
                  <div key={category}>
                    <p className="text-sm font-medium text-muted-foreground my-2">{category}</p>
                    {productList.map((product) => (
                      <Button
                        key={product.id}
                        variant="ghost"
                        className="w-full justify-between items-center"
                        // CORRECTED: Passing product.id to the handler
                        onClick={() => handleSelect(product.id)}
                      >
                        <span>{product.name}</span>
                        {/* CORRECTED: Comparing selectedValue (ID) with product.id */}
                        {selectedValue === product.id && <Check className="h-4 w-4" />}
                      </Button>
                    ))}
                  </div>
                ))}
                 {filteredProducts.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">Nenhum produto encontrado.</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
