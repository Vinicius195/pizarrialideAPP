'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import {
  Form,
  FormControl,
  FormDescription as FormDescriptionUI,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Order, Product, PizzaSize, Customer } from '@/types';
import {
  ChevronsUpDown,
  Link,
  Phone,
  PlusCircle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getMockSettings } from '@/lib/settings-data';
import { Switch } from '../ui/switch';
import { useUser } from '@/contexts/user-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProductSelectionDialog } from './product-selection-dialog';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Selecione um produto.'),
  product2Id: z.string().optional(),
  isHalfHalf: z.boolean().default(false),
  quantity: z.coerce.number().min(1, 'A quantidade deve ser pelo menos 1.'),
  size: z.string().optional(),
});

const addOrderSchema = z
  .object({
    customerName: z.string().min(2, 'O nome do cliente é obrigatório.'),
    customerPhone: z.string().optional(),
    orderType: z.enum(['entrega', 'retirada'], {
      required_error: 'Selecione o tipo de pedido.',
    }),
    items: z
      .array(orderItemSchema)
      .min(1, 'Adicione pelo menos um item ao pedido.'),
    addressType: z.enum(['manual', 'link']).default('manual'),
    address: z.string().optional(),
    locationLink: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.orderType === 'entrega') {
      if (data.addressType === 'manual') {
        if (!data.address || data.address.trim().length < 10) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'O endereço é obrigatório e deve ter pelo menos 10 caracteres.',
            path: ['address'],
          });
        }
      } else if (data.addressType === 'link') {
        if (
          !data.locationLink ||
          !z.string().url().safeParse(data.locationLink).success
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Por favor, insira um link de localização válido.',
            path: ['locationLink'],
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
  onUpdate: (orderId: string, data: AddOrderFormValues) => void;
  order?: Order | null;
}

export function AddOrderDialog({ open, onOpenChange, onSubmit, onUpdate, order }: AddOrderDialogProps) {
    const isMobile = useIsMobile();
    const isEditMode = !!order;
    const { currentUser, products: allProducts, getAuthToken } = useUser();
    const isManager = currentUser?.role === 'Administrador';
  
    const availableProducts = useMemo(() => allProducts.filter((p) => p.isAvailable), [allProducts]);
    const availablePizzas = useMemo(() => availableProducts.filter((p) => p.category === 'Pizza'), [availableProducts]);

    const form = useForm<AddOrderFormValues>({
        resolver: zodResolver(addOrderSchema),
        // The form will ALWAYS start with clean, default values.
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

    // This effect resets the form to appropriate values when the dialog opens or when editing different orders.
    useEffect(() => {
        if (open) {
            if (isEditMode && order) {
                // When editing, populate form with order data
                const orderData: AddOrderFormValues = {
                    customerName: order.customerName,
                    customerPhone: order.customerPhone || '',
                    orderType: order.orderType,
                    items: [{ productId: '', product2Id: undefined, isHalfHalf: false, quantity: 1, size: undefined }], // Reset to default items for editing
                    addressType: order.locationLink ? 'link' : 'manual',
                    address: order.address || '',
                    locationLink: order.locationLink || '',
                    notes: order.notes || '',
                };
                form.reset(orderData);
            } else {
                // When adding new order, reset to default values
                form.reset({
                    customerName: '',
                    customerPhone: '',
                    orderType: 'retirada',
                    items: [{ productId: '', product2Id: undefined, isHalfHalf: false, quantity: 1, size: undefined }],
                    addressType: 'manual',
                    address: '',
                    locationLink: '',
                    notes: '',
                });
            }
        }
    }, [open, isEditMode, order?.id, form]);

    const { control, watch, setValue, trigger, handleSubmit } = form;
    const { fields, append, remove } = useFieldArray({ control, name: 'items' });
    const watchedItems = watch('items');
    const orderType = watch('orderType');
    const addressType = watch('addressType');
    const customerPhone = watch('customerPhone');

    const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
    const [productSelectorIndex, setProductSelectorIndex] = useState<number | null>(null);
    const [productSelectorType, setProductSelectorType] = useState<'primary' | 'secondary' | null>(null);

    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    useEffect(() => {
        const cleanedPhone = customerPhone?.replace(/\D/g, '');
        if (isEditMode || !cleanedPhone || cleanedPhone.length < 10) {
          setSearchError(null);
          return;
        }
        const searchCustomer = async () => {
          setIsSearchingCustomer(true);
          setSearchError(null);
          const token = await getAuthToken();
          if (!token) { setIsSearchingCustomer(false); setSearchError('Erro de autenticação.'); return; }
          try {
            const response = await fetch(`/api/customers?phone=${cleanedPhone}`, { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) {
              const foundCustomer: Customer = await response.json();
              setValue('customerName', foundCustomer.name, { shouldValidate: true });
              const hasLink = !!foundCustomer.locationLink;
              setValue('addressType', hasLink ? 'link' : 'manual');
              setValue('address', hasLink ? '' : foundCustomer.address || '');
              setValue('locationLink', hasLink ? foundCustomer.locationLink || '' : '');
              trigger(['customerName', 'address', 'locationLink']);
            }
          } catch (error) { setSearchError('Erro ao contatar o servidor.'); } 
          finally { setIsSearchingCustomer(false); }
        };
        const handler = setTimeout(() => { searchCustomer(); }, 500);
        return () => { clearTimeout(handler); };
    }, [customerPhone, setValue, trigger, getAuthToken, isEditMode]);

    const openProductSelector = (index: number, type: 'primary' | 'secondary') => {
        setProductSelectorIndex(index);
        setProductSelectorType(type);
        setIsProductSelectorOpen(true);
    };

    const handleProductSelection = (productId: string) => {
        if (productSelectorIndex === null || productSelectorType === null) return;
        if (productSelectorType === 'primary') {
            setValue(`items.${productSelectorIndex}.productId`, productId, { shouldValidate: true });
            setValue(`items.${productSelectorIndex}.size`, undefined, { shouldValidate: true });
            setValue(`items.${productSelectorIndex}.isHalfHalf`, false, { shouldValidate: true });
            setValue(`items.${productSelectorIndex}.product2Id`, undefined, { shouldValidate: true });
        } else {
            setValue(`items.${productSelectorIndex}.product2Id`, productId, { shouldValidate: true });
        }
        setIsProductSelectorOpen(false);
        setProductSelectorIndex(null);
        setProductSelectorType(null);
    };

    const handleFormSubmit = (data: AddOrderFormValues) => {
        if (isEditMode && order) {
            onUpdate(order.id, data);
        } else {
            onSubmit(data);
        }
    };

    const formContent = (
        <Form {...form}>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
                <ProductSelectionDialog open={isProductSelectorOpen} onOpenChange={setIsProductSelectorOpen} onProductSelect={handleProductSelection} products={productSelectorType === 'secondary' ? availablePizzas : availableProducts} currentProductId={productSelectorIndex !== null && productSelectorType !== null ? watchedItems[productSelectorIndex]?.[productSelectorType === 'primary' ? 'productId' : 'product2Id'] : undefined} title={productSelectorType === 'secondary' ? "Selecione o 2º Sabor" : "Selecione um Produto"} />
                <div className={cn("space-y-6", isMobile ? "px-4" : "max-h-[70vh] sm:max-h-[60vh] overflow-y-auto p-1 pr-4")}>
                    {/* All form fields go here */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Nome do Cliente</FormLabel><FormControl><Input placeholder="Ex: João da Silva" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={control} name="customerPhone" render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><div className="relative"><div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Phone className="h-4 w-4 text-muted-foreground" /></div><Input type="tel" placeholder="Digite para buscar..." className="pl-10" {...field} disabled={isEditMode} />{isSearchingCustomer && (<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"><Loader2 className="h-4 w-4 text-muted-foreground animate-spin" /></div>)}</div></FormControl><FormMessage />{searchError && <FormDescriptionUI className="text-destructive text-xs pt-1">{searchError}</FormDescriptionUI>}</FormItem>)} />
                    </div>
                    <FormField control={control} name="orderType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Tipo do Pedido</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="retirada" /></FormControl><FormLabel className="font-normal cursor-pointer">Retirada</FormLabel></FormItem>{isManager && (<FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="entrega" /></FormControl><FormLabel className="font-normal cursor-pointer">Entrega</FormLabel></FormItem>)}</RadioGroup></FormControl><FormMessage /></FormItem>)} />
                    {orderType === 'entrega' && isManager && (<div className="space-y-4 rounded-md border bg-muted/50 p-4">
                        <FormField control={control} name="addressType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Como informar o endereço?</FormLabel><FormControl><RadioGroup onValueChange={(value) => { field.onChange(value); setValue('address', ''); setValue('locationLink', ''); }} defaultValue={field.value} className="flex flex-col space-y-2 pt-1"><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="manual" /></FormControl><FormLabel className="font-normal cursor-pointer">Digitar Endereço Manualmente</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="link" /></FormControl><FormLabel className="font-normal cursor-pointer">Colar Link de Localização</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                        {addressType === 'manual' && (<FormField control={control} name="address" render={({ field }) => (<FormItem><FormLabel>Endereço Completo</FormLabel><FormControl><Textarea placeholder="Ex: Rua das Flores, 123, Bairro Jardim..." {...field} /></FormControl><FormMessage /></FormItem>)} />)}
                        {addressType === 'link' && (<FormField control={control} name="locationLink" render={({ field }) => (<FormItem><FormLabel>Link do Google Maps</FormLabel><FormControl><div className="relative"><div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Link className="h-4 w-4 text-muted-foreground" /></div><Input placeholder="https://maps.app.goo.gl/..." className="pl-10" {...field} /></div></FormControl><FormMessage /></FormItem>)} />)}
                    </div>)}
                    <Separator />
                    <div>
                        <FormLabel>Itens do Pedido</FormLabel>
                        <div className="space-y-4 mt-2">
                            {fields.map((field, index) => {
                                const selectedProduct = availableProducts.find((p) => p.id === watchedItems[index]?.productId);
                                const selectedProduct2 = availablePizzas.find((p) => p.id === watchedItems[index]?.product2Id);
                                const isPizza = selectedProduct?.category === 'Pizza';
                                const isHalfHalf = watchedItems[index]?.isHalfHalf ?? false;
                                return (<div key={field.id} className="flex flex-col gap-3 rounded-md border p-4">
                                    <div className="flex items-start gap-2">
                                        <FormField control={control} name={`items.${index}.productId`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Button variant="outline" type="button" className={cn("w-full justify-between",!field.value && "text-muted-foreground")} onClick={() => openProductSelector(index, 'primary')}>{selectedProduct?.name || "Selecione um produto"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={control} name={`items.${index}.quantity`} render={({ field }) => (<FormItem className="w-24"><FormControl><Input type="number" min="1" placeholder="Qtd." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4" /><span className="sr-only">Remover item</span></Button>
                                    </div>
                                    {isPizza && (<FormField control={control} name={`items.${index}.isHalfHalf`} render={({ field: switchField }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border bg-muted/30 p-3 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-sm font-medium">Pizza Meio a Meio?</FormLabel><FormDescriptionUI className="text-xs">Será cobrado o valor do sabor mais caro.</FormDescriptionUI></div><FormControl><Switch checked={switchField.value} onCheckedChange={(checked) => { switchField.onChange(checked); if (!checked) { setValue(`items.${index}.product2Id`, undefined, {shouldValidate: true,}); } }} /></FormControl></FormItem>)} />)}
                                    {isPizza && isHalfHalf && (<FormField control={control} name={`items.${index}.product2Id`} render={({ field }) => (<FormItem className="flex-1"><FormLabel>2º Sabor da Pizza</FormLabel><FormControl><Button variant="outline" type="button" className={cn("w-full justify-between", !field.value && "text-muted-foreground")} onClick={() => openProductSelector(index, 'secondary')}>{selectedProduct2?.name || "Selecione o segundo sabor"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl><FormMessage /></FormItem>)} />)}
                                    {selectedProduct && selectedProduct.sizes && (<FormField control={control} name={`items.${index}.size`} render={({ field }) => (<FormItem className="pt-2"><FormLabel className="text-sm">Tamanho</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">{Object.keys(selectedProduct.sizes!).filter((size) => selectedProduct.category !== 'Pizza' || getMockSettings().sizeAvailability[size as PizzaSize]).map((size) => (<FormItem key={size} className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value={size} /></FormControl><FormLabel className="font-normal capitalize cursor-pointer">{size}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>)} />)}
                                </div>);
                            })}
                        </div>
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ productId: '', product2Id: undefined, isHalfHalf: false, quantity: 1, size: undefined })}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Item</Button>
                        <FormField control={control} name="items" render={() => <FormMessage className="mt-2" />} />
                    </div>
                    <Separator className="my-4" />
                    <FormField control={control} name="notes" render={({ field }) => (<FormItem><FormLabel>Observações (Opcional)</FormLabel><FormControl><Textarea placeholder="Ex: Pizza sem cebola, troco para R$100, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            </form>
        </Form>
    );

    const dialogHeader = (<DialogHeader><DialogTitle>{isEditMode ? `Editando Pedido #${order?.orderNumber}` : 'Adicionar Novo Pedido'}</DialogTitle><DialogDescription>{isEditMode ? 'Os dados atuais serão sobrescritos.' : 'Preencha os detalhes abaixo.'}</DialogDescription></DialogHeader>);
    const drawerHeader = (<DrawerHeader className="text-left"><DrawerTitle>{isEditMode ? `Editando Pedido #${order?.orderNumber}` : 'Adicionar Novo Pedido'}</DrawerTitle><DrawerDescription>{isEditMode ? 'Os dados atuais serão sobrescritos.' : 'Preencha os detalhes abaixo.'}</DrawerDescription></DrawerHeader>);
    
    const dialogFooter = (<DialogFooter className="pt-4 border-t"><DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose><Button onClick={handleSubmit(handleFormSubmit)}>{isEditMode ? 'Salvar Alterações' : 'Salvar Pedido'}</Button></DialogFooter>);
    const drawerFooter = (<DrawerFooter className="pt-2"><Button onClick={handleSubmit(handleFormSubmit)}>{isEditMode ? 'Salvar Alterações' : 'Salvar Pedido'}</Button><DrawerClose asChild><Button variant="outline">Cancelar</Button></DrawerClose></DrawerFooter>);
    
    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent>{drawerHeader}{formContent}{drawerFooter}</DrawerContent>
            </Drawer>
        );
    }
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">{dialogHeader}{formContent}{dialogFooter}</DialogContent>
        </Dialog>
    );
}
