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
import { Link, Phone, PlusCircle, Trash2, Loader2, ChevronsUpDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getMockSettings } from '@/lib/settings-data';
import { Switch } from '../ui/switch';
import { useUser } from '@/contexts/user-context';
import { ProductSelectionDrawer } from './product-selection-drawer';

const orderItemSchema = z.object({
  productId: z.string().min(1, "Selecione um produto."),
  product2Id: z.string().optional(),
  isHalfHalf: z.boolean().default(false),
  quantity: z.coerce.number().min(1, "A quantidade deve ser pelo menos 1."),
  size: z.string().optional(),
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
                    message: "O endereço é obrigatório e deve ter pelo menos 10 caracteres.",
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

export function AddOrderDialog({ open, onOpenChange, onSubmit, order }: AddOrderDialogProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerContext, setDrawerContext] = useState<{ itemIndex: number; isSecondFlavor?: boolean }>({ itemIndex: -1 });
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const { currentUser, products: allProducts, getAuthToken } = useUser();
  const isManager = currentUser?.role === 'Administrador';
  const isEditMode = !!order;

  const form = useForm<AddOrderFormValues>({
    resolver: zodResolver(addOrderSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      orderType: 'retirada',
      items: [{ productId: '', product2Id: undefined, isHalfHalf: false, quantity: 1, size: undefined }],
      addressType: 'manual',
      address: '',
      locationLink: '',
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const { watch, reset, setValue, trigger } = form;
  const watchedItems = watch('items');
  const orderType = watch('orderType');
  const addressType = watch('addressType');
  const customerPhone = watch('customerPhone');
  
  const availableProducts = useMemo(() => allProducts.filter(p => p.isAvailable), [allProducts]);
  const availablePizzas = useMemo(() => allProducts.filter(p => p.isAvailable && p.category === 'Pizza'), [allProducts]);

  useEffect(() => {
    if (open) {
      if (isEditMode && order) {
        const allPizzas = allProducts.filter(p => p.category === 'Pizza');
        const normalizeName = (name: string) => name.toLowerCase().replace('pizza ', '').trim();
        const findPizzaByNormalizedName = (name: string): Product | undefined => {
            const normalizedName = normalizeName(name);
            return allPizzas.find(p => normalizeName(p.name) === normalizedName);
        };

        const formItems = order.items.map(item => {
            const isHalfHalf = item.productName.startsWith('Meio a Meio:');
            let productId = '';
            let product2Id: string | undefined = undefined;

            if (isHalfHalf) {
                const names = item.productName.replace('Meio a Meio:', '').split(/\/|⁄/);
                const product1 = findPizzaByNormalizedName(names[0]);
                const product2 = findPizzaByNormalizedName(names[1]);
                productId = product1?.id || '';
                product2Id = product2?.id || undefined;
            } else {
                const product = allProducts.find(p => p.name === item.productName);
                productId = product?.id || '';
            }

            return { productId, product2Id, isHalfHalf, quantity: item.quantity, size: item.size, };
        });

        reset({
            customerName: order.customerName,
            customerPhone: order.customerPhone || '',
            orderType: order.orderType,
            address: order.address || '',
            locationLink: order.locationLink || '',
            addressType: order.locationLink ? 'link' : 'manual',
            notes: order.notes || '',
            items: formItems.length > 0 ? formItems : [{ productId: '', product2Id: undefined, isHalfHalf: false, quantity: 1, size: undefined }],
        });

      } else {
        reset({
          customerName: '', customerPhone: '', orderType: 'retirada',
          items: [{ productId: '', product2Id: undefined, isHalfHalf: false, quantity: 1, size: undefined }],
          addressType: 'manual', address: '', locationLink: '', notes: '',
        });
      }
    }
  }, [order, open, reset, isEditMode, allProducts]);

  useEffect(() => {
    const cleanedPhone = customerPhone?.replace(/\D/g, '');
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
          setSearchError(null);
        } else {
          throw new Error('Falha ao buscar cliente.');
        }
      } catch (error) {
        setSearchError("Erro ao contatar o servidor.");
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
      setValue(`items.${itemIndex}.isHalfHalf`, false, { shouldValidate: true });
      setValue(`items.${itemIndex}.product2Id`, undefined, { shouldValidate: true });
    }
  };

  function handleFormSubmit(data: AddOrderFormValues) {
    onSubmit(data);
    onOpenChange(false);
  }
  
  const productToShow = (id: string | undefined) => allProducts.find((p) => p.id === id)?.name || "Selecione um produto";
  const selectedValue = drawerContext.isSecondFlavor 
    ? watchedItems[drawerContext.itemIndex]?.product2Id 
    : watchedItems[drawerContext.itemIndex]?.productId;

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
                              <FormLabel className="font-normal cursor-pointer">Digitar Endereço Manualmente</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="link" /></FormControl>
                              <FormLabel className="font-normal cursor-pointer">Colar Link de Localização</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {addressType === 'manual' && (
                    <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço Completo</FormLabel>
                          <FormControl><Textarea placeholder="Ex: Rua das Flores, 123, Bairro Jardim..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {addressType === 'link' && (
                    <FormField control={form.control} name="locationLink" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link do Google Maps</FormLabel>
                          <FormControl>
                            <div className="relative">
                               <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Link className="h-4 w-4 text-muted-foreground" /></div>
                              <Input placeholder="https://maps.app.goo.gl/..." className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
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
                      <div key={field.id} className="flex flex-col gap-3 rounded-md border p-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
                          <div className="flex-1">
                            <Button variant="outline" type="button" className={cn("w-full justify-between", !watchedItems[index]?.productId && "text-muted-foreground")} onClick={() => handleOpenDrawer(index)}>
                              {productToShow(watchedItems[index]?.productId)}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            <FormField control={form.control} name={`items.${index}.productId`} render={() => <FormMessage />} />
                          </div>
                          <div className="flex items-start gap-2">
                            <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                <FormItem className="flex-1 sm:w-24">
                                  <FormControl><Input type="number" min="1" placeholder="Qtd." {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                              <Trash2 className="h-4 w-4" /><span className="sr-only">Remover item</span>
                            </Button>
                          </div>
                        </div>

                        {isPizza && (
                            <FormField control={form.control} name={`items.${index}.isHalfHalf`} render={({ field: switchField }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-muted/30 p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-sm font-medium">Pizza Meio a Meio?</FormLabel>
                                        <FormDescriptionUI className="text-xs">Será cobrado o valor do sabor mais caro.</FormDescriptionUI>
                                    </div>
                                    <FormControl>
                                      <Switch checked={switchField.value} onCheckedChange={(checked) => {
                                          switchField.onChange(checked);
                                          if (!checked) { setValue(`items.${index}.product2Id`, undefined, { shouldValidate: true }); }
                                        }}
                                      />
                                    </FormControl>
                                </FormItem>
                              )}
                            />
                        )}

                        {isPizza && isHalfHalf && (
                           <div className="flex-1">
                              <FormLabel>2º Sabor da Pizza</FormLabel>
                              <Button variant="outline" type="button" className={cn("w-full justify-between mt-2", !watchedItems[index]?.product2Id && "text-muted-foreground")} onClick={() => handleOpenDrawer(index, true)}>
                                {productToShow(watchedItems[index]?.product2Id)}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                              <FormField control={form.control} name={`items.${index}.product2Id`} render={() => <FormMessage />} />
                            </div>
                        )}

                        {selectedProduct && selectedProduct.sizes && (
                            <FormField control={form.control} name={`items.${index}.size`} render={({ field }) => (
                                <FormItem className="pt-2">
                                    <FormLabel className="text-sm">Tamanho</FormLabel>
                                    <FormControl>
                                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-1">
                                        {Object.keys(selectedProduct.sizes!)
                                            .filter((size) => selectedProduct.category !== 'Pizza' || getMockSettings().sizeAvailability[size as PizzaSize])
                                            .map((size) => (
                                            <FormItem key={size} className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value={size} /></FormControl>
                                                <FormLabel className="font-normal capitalize cursor-pointer">{size}</FormLabel>
                                            </FormItem>
                                        ))}
                                      </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                              )}
                            />
                        )}
                      </div>
                    )
                  })}
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ productId: '', product2Id: undefined, isHalfHalf: false, quantity: 1, size: undefined })}>
                  <PlusCircle className="mr-2 h-4 w-4" />Adicionar Item
                </Button>
                <FormField control={form.control} name="items" render={() => <FormMessage className="mt-2" />} />
              </div>

              <Separator className="my-4" />

              <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Ex: Pizza sem cebola, troco para R$100, etc." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 border-t sticky bottom-0 bg-background">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit">{isEditMode ? 'Salvar Alterações' : 'Salvar Pedido'}</Button>
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
        selectedValue={selectedValue}
      />
    </>
  );
}
