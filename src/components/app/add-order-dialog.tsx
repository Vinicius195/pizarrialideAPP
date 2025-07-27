'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription as FormDescriptionUI,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Order, Product, PizzaSize, Customer } from '@/types';
import { Link, Phone, PlusCircle, Trash2, Loader2, ChevronsUpDown, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { cn, normalizePhoneNumber } from '@/lib/utils';
import { getMockSettings } from '@/lib/settings-data';
import { useUser } from '@/contexts/user-context';
import { ProductSelectionDrawer } from './product-selection-drawer';
import { Switch } from '@/components/ui/switch';

// Schema uses the new robust structure with IDs
const orderItemSchema = z.object({
  productId: z.string().min(1, "Selecione um produto."),
  product2Id: z.string().optional(),
  isHalfHalf: z.boolean().default(false),
  quantity: z.coerce.number().min(1, "A quantidade deve ser pelo menos 1."),
  size: z.string().optional(),
}).superRefine((data, ctx) => {
    // If half-and-half is selected, a second flavor is required.
    if (data.isHalfHalf && !data.product2Id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O 2º sabor é obrigatório para pizzas meio a meio.",
            path: ["product2Id"],
        });
    }
});

const addOrderSchema = z.object({
  customerName: z.string().min(2, "O nome do cliente é obrigatório."),
  customerPhone: z.string().optional(),
  orderType: z.enum(['entrega', 'retirada'], {
    required_error: 'Selecione o tipo de pedido.',
  }),
  items: z.array(orderItemSchema).min(1, "Adicione pelo menos um item ao pedido."),
  addressType: z.enum(['manual', 'link']).default('manual'),
  address: z.string().optional(),
  locationLink: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.orderType === 'entrega') {
        if (data.addressType === 'manual') {
            if (!data.address || data.address.trim().length < 10) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "O endereço é obrigatório.",
                    path: ["address"],
                });
            }
        } else if (data.addressType === 'link') {
            if (!data.locationLink || !z.string().url().safeParse(data.locationLink).success) {
                 ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Por favor, insira um link de localização válido.",
                    path: ["locationLink"],
                });
            }
        }
    }
});

export type AddOrderFormValues = z.infer<typeof addOrderSchema>;

interface AddOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AddOrderFormValues) => void;
  order?: Order | null;
}

// Visual component for product selection
const ProductSelector = ({ 
    productId, 
    onClick, 
    placeholder,
    productName
}: { 
    productId: string | undefined;
    onClick: () => void;
    placeholder: string;
    productName?: string;
}) => {
    if (productId && productName) {
        return (
            <div className="flex items-center justify-between w-full rounded-md border border-input bg-background p-3 text-sm">
                <span className="font-medium truncate">{productName}</span>
                <Button variant="ghost" size="sm" type="button" onClick={onClick} className="text-primary hover:text-primary -mr-2">
                    Alterar
                </Button>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted bg-muted/50 p-4 text-center text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/80 hover:text-foreground"
        >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">{placeholder}</span>
        </button>
    );
};


export function AddOrderDialog({ open, onOpenChange, onSubmit, order }: AddOrderDialogProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerContext, setDrawerContext] = useState<{ itemIndex: number; isSecondFlavor?: boolean }>({ itemIndex: -1 });
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  
  const { currentUser, products: allProducts, getAuthToken } = useUser();
  const isManager = currentUser?.role === 'Administrador';
  const isEditMode = !!order;

  // CORREÇÃO: Schema dinâmico para validação de tamanho
  const dynamicAddOrderSchema = useMemo(() => {
    return addOrderSchema.superRefine((data, ctx) => {
        data.items.forEach((item, index) => {
            const product = allProducts.find(p => p.id === item.productId);
            // Se o produto existe, tem tamanhos, mas nenhum tamanho foi selecionado -> adicione um erro.
            if (product && product.sizes && Object.keys(product.sizes).length > 0 && !item.size) {
                 ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Por favor, selecione um tamanho.",
                    path: [`items`, index, "size"],
                });
            }
        });
    });
  }, [allProducts]);

  const form = useForm<AddOrderFormValues>({
    resolver: zodResolver(dynamicAddOrderSchema), // Usar o schema dinâmico
    defaultValues: {
      customerName: '', customerPhone: '', orderType: 'retirada',
      items: [{ productId: '', isHalfHalf: false, quantity: 1 }],
      addressType: 'manual', address: '', locationLink: '', notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const { watch, reset, setValue, trigger, getValues } = form;
  const watchedItems = watch('items');
  const orderType = watch('orderType');
  const addressType = watch('addressType');
  const customerPhone = watch('customerPhone');
  
  const availableProducts = useMemo(() => allProducts.filter(p => p.isAvailable), [allProducts]);
  const availablePizzas = useMemo(() => allProducts.filter(p => p.isAvailable && p.category === 'Pizza'), [allProducts]);

  const calculateTotal = useCallback(() => {
    let currentTotal = 0;
    const items = getValues('items');
    for (const item of items) {
      if (!item.productId || !item.size) continue;
      
      let price = 0;
      const product1 = allProducts.find(p => p.id === item.productId);
      if (!product1) continue;

      if (item.isHalfHalf && item.product2Id) {
        const product2 = allProducts.find(p => p.id === item.product2Id);
        const price1 = product1.sizes?.[item.size as PizzaSize] ?? 0;
        const price2 = product2?.sizes?.[item.size as PizzaSize] ?? 0;
        price = Math.max(price1, price2);
      } else {
        price = product1.sizes?.[item.size as PizzaSize] ?? product1.price ?? 0;
      }
      currentTotal += price * item.quantity;
    }
    setTotal(currentTotal);
  }, [getValues, allProducts]);

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name && (name.startsWith('items') || name.startsWith('total'))) {
        calculateTotal();
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, calculateTotal]);

  useEffect(() => {
    if (open) {
      if (isEditMode && order) {
        reset({
            customerName: order.customerName,
            customerPhone: order.customerPhone || '',
            orderType: order.orderType,
            address: order.address || '',
            locationLink: order.locationLink || '',
            addressType: order.locationLink ? 'link' : 'manual',
            notes: order.notes || '',
            items: order.items.map(item => ({
                productId: item.productId,
                product2Id: item.product2Id,
                isHalfHalf: item.isHalfHalf,
                quantity: item.quantity,
                size: item.size,
            })),
        });
      } else {
        reset({
          customerName: '', customerPhone: '', orderType: 'retirada',
          items: [{ productId: '', isHalfHalf: false, quantity: 1 }],
          addressType: 'manual', address: '', locationLink: '', notes: '',
        });
      }
      calculateTotal();
    }
  }, [order, open, reset, isEditMode, calculateTotal]);

  useEffect(() => {
    const cleanedPhone = normalizePhoneNumber(customerPhone || '');
    if (isEditMode || !cleanedPhone || (cleanedPhone.length < 10)) {
        setSearchError(null);
        return;
    };

    const searchCustomer = async () => {
      setIsSearchingCustomer(true);
      setSearchError(null);
      const token = await getAuthToken();
      if (!token) {
        setIsSearchingCustomer(false);
        setSearchError("Erro de autenticação.");
        return;
      }
      try {
        const response = await fetch(`/api/customers?phone=${cleanedPhone}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
          const foundCustomer: Customer = await response.json();
          setValue('customerName', foundCustomer.name, { shouldValidate: true });
          const hasLink = !!foundCustomer.locationLink;
          setValue('addressType', hasLink ? 'link' : 'manual');
          setValue('address', hasLink ? '' : foundCustomer.address || '');
          setValue('locationLink', hasLink ? foundCustomer.locationLink || '' : '');
          trigger(['customerName', 'address', 'locationLink']);
        } else if (response.status === 404) {
          setSearchError('Cliente não encontrado. O nome será mantido.');
        } else {
          const errorText = await response.text();
          throw new Error(errorText || 'Falha ao buscar cliente.');
        }
      } catch (error: any) {
        setSearchError(error.message || "Erro ao contatar o servidor.");
      } finally {
        setIsSearchingCustomer(false);
      }
    };
    const handler = setTimeout(() => searchCustomer(), 500);
    return () => clearTimeout(handler);
  }, [customerPhone, setValue, trigger, getAuthToken, isEditMode]);

  const handleOpenDrawer = (itemIndex: number, isSecondFlavor = false) => {
    setDrawerContext({ itemIndex, isSecondFlavor });
    setIsDrawerOpen(true);
  };

  const handleProductSelect = (productId: string) => {
    const { itemIndex, isSecondFlavor } = drawerContext;
    if (isSecondFlavor) {
      setValue(`items.${itemIndex}.product2Id`, productId, { shouldValidate: true });
    } else {
      setValue(`items.${itemIndex}.productId`, productId, { shouldValidate: true });
      setValue(`items.${itemIndex}.size`, undefined, { shouldValidate: true });
      setValue(`items.${itemIndex}.isHalfHalf`, false);
      setValue(`items.${itemIndex}.product2Id`, undefined);
    }
  };
  
  const handleHalfHalfSwitch = (checked: boolean, index: number) => {
    setValue(`items.${index}.isHalfHalf`, checked, { shouldValidate: true });
    if (!checked) {
      setValue(`items.${index}.product2Id`, undefined, { shouldValidate: true });
    } else {
       handleOpenDrawer(index, true);
    }
  };

  function handleFormSubmit(data: AddOrderFormValues) {
    onSubmit(data);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? `Editar Pedido #${order?.orderNumber}` : 'Adicionar Novo Pedido'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Altere os detalhes do pedido abaixo.' : 'Preencha os detalhes abaixo para criar um novo pedido.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="space-y-6 p-1 pr-4">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="customerName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Cliente</FormLabel>
                      <FormControl><Input placeholder="Ex: João da Silva" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField control={form.control} name="customerPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                           </div>
                           <Input type="tel" placeholder="Digite para buscar..." className="pl-10" {...field} disabled={isEditMode} />
                           {isSearchingCustomer && (
                             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                               <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                             </div>
                           )}
                        </div>
                      </FormControl>
                       <FormMessage />
                       {searchError && <FormDescriptionUI className="text-destructive text-xs pt-1">{searchError}</FormDescriptionUI>}
                    </FormItem>
                  )}
                />
              </div>

              <FormField control={form.control} name="orderType" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Tipo do Pedido</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="retirada" /></FormControl>
                          <FormLabel className="font-normal cursor-pointer">Retirada</FormLabel>
                        </FormItem>
                        {isManager && (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="entrega" /></FormControl>
                            <FormLabel className="font-normal cursor-pointer">Entrega</FormLabel>
                          </FormItem>
                        )}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {orderType === 'entrega' && isManager && (
                <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                   <FormField control={form.control} name="addressType" render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Como informar o endereço?</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={(value) => { field.onChange(value); setValue('address', ''); setValue('locationLink', ''); }} defaultValue={field.value} className="flex flex-col space-y-2 pt-1" >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="manual" /></FormControl>
                              <FormLabel className="font-normal cursor-pointer">Digitar Endereço</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="link" /></FormControl>
                              <FormLabel className="font-normal cursor-pointer">Colar Link de Localização</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {addressType === 'manual' && ( <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Endereço Completo</FormLabel><FormControl><Textarea placeholder="Ex: Rua das Flores, 123..." {...field} /></FormControl><FormMessage /></FormItem>)} /> )}
                  {addressType === 'link' && ( <FormField control={form.control} name="locationLink" render={({ field }) => ( <FormItem><FormLabel>Link do Google Maps</FormLabel><FormControl><div className="relative"><div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Link className="h-4 w-4 text-muted-foreground" /></div><Input placeholder="https://maps.app.goo.gl/..." className="pl-10" {...field} /></div></FormControl><FormMessage /></FormItem>)} /> )}
                </div>
              )}
              
              <Separator />
              
              <div>
                <FormLabel>Itens do Pedido</FormLabel>
                <div className="space-y-4 mt-2">
                  {fields.map((field, index) => {
                    const selectedProduct = allProducts.find(p => p.id === watchedItems[index]?.productId);
                    const isPizza = selectedProduct?.category === 'Pizza';
                    const isHalfHalf = watchedItems[index]?.isHalfHalf ?? false;
                    
                    return (
                      <div key={field.id} className="flex flex-col gap-4 rounded-md border bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium pt-2">Item {index + 1}</h3>
                            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive -mr-2 -mt-2" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                <Trash2 className="h-4 w-4" /><span className="sr-only">Remover</span>
                            </Button>
                        </div>

                         <FormField control={form.control} name={`items.${index}.productId`} render={({ field: productField }) => (
                            <FormItem>
                                <ProductSelector
                                    productId={productField.value}
                                    productName={selectedProduct?.name}
                                    onClick={() => handleOpenDrawer(index)}
                                    placeholder="Adicionar Produto"
                                />
                                <FormMessage className="pt-1"/>
                            </FormItem>
                        )}/>

                        {isPizza && (
                           <FormField control={form.control} name={`items.${index}.isHalfHalf`} render={({ field }) => (
                               <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-muted/30 p-3 shadow-sm">
                                   <div className="space-y-0.5"><FormLabel className="text-sm font-medium">Pizza Meio a Meio?</FormLabel><FormDescriptionUI className="text-xs">Será cobrado o valor do sabor mais caro.</FormDescriptionUI></div>
                                   <FormControl><Switch checked={field.value} onCheckedChange={(checked) => handleHalfHalfSwitch(checked, index)} /></FormControl>
                               </FormItem>
                             )}
                           />
                        )}

                        {isPizza && isHalfHalf && (
                            <FormField control={form.control} name={`items.${index}.product2Id`} render={({ field }) => (
                                <FormItem>
                                     <ProductSelector
                                        productId={field.value}
                                        productName={allProducts.find(p => p.id === field.value)?.name}
                                        onClick={() => handleOpenDrawer(index, true)}
                                        placeholder="Adicionar 2º Sabor"
                                    />
                                    <FormMessage className="pt-1"/>
                                </FormItem>
                            )}/>
                        )}

                        {selectedProduct?.sizes && (
                            <FormField control={form.control} name={`items.${index}.size`} render={({ field }) => (
                                <FormItem className="pt-2">
                                    <FormLabel className="text-sm">Tamanho</FormLabel>
                                    <FormControl>
                                      <RadioGroup onValueChange={(value) => { field.onChange(value); trigger(`items.${index}.size`); }} value={field.value} className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-1">
                                         {Object.keys(selectedProduct.sizes || {})
                                            .filter(size => selectedProduct.category !== 'Pizza' || getMockSettings().sizeAvailability[size as PizzaSize])
                                            .map((size) => (<FormItem key={size} className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value={size} /></FormControl><FormLabel className="font-normal capitalize cursor-pointer">{size}</FormLabel></FormItem>))}
                                      </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                              )}
                            />
                        )}
                        <div className="flex items-center justify-end gap-2 pt-2">
                           <span className="text-sm text-muted-foreground">Quantidade:</span>
                           <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => ( <FormItem className="w-20"><FormControl><Input type="number" min="1" {...field} /></FormControl></FormItem>)} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ productId: '', quantity: 1, isHalfHalf: false })}>
                  <PlusCircle className="mr-2 h-4 w-4" />Adicionar Item
                </Button>
                <FormField control={form.control} name="items" render={() => <FormMessage className="mt-2" />} />
              </div>

              <Separator className="my-4" />
              
               <div className="text-right text-xl font-bold">
                <span>Total: </span>
                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Observações (Opcional)</FormLabel><FormControl><Textarea placeholder="Ex: Pizza sem cebola, troco para R$100, etc." {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>

            <DialogFooter className="pt-4 border-t sticky bottom-0 bg-background">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit">{isEditMode ? 'Salvar Alterações' : 'Criar Pedido'}</Button>
            </DialogFooter>
          </form>
          </Form>
        </DialogContent>
      </Dialog>
      <ProductSelectionDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onSelectProduct={handleProductSelect}
        products={drawerContext.isSecondFlavor ? availablePizzas : availableProducts}
        title={drawerContext.isSecondFlavor ? 'Selecione o 2º Sabor' : 'Selecione um Produto'}
        selectedValue={drawerContext.isSecondFlavor ? watchedItems[drawerContext.itemIndex]?.product2Id : watchedItems[drawerContext.itemIndex]?.productId}
      />
    </>
  );
}
