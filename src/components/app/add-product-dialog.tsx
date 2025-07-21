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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Product, PizzaSize } from '@/types';
import { pizzaSizes } from '@/types';
import { useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { getMockSettings } from '@/lib/settings-data';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '../ui/separator';

const productSchema = z.object({
  name: z.string().min(3, "O nome do produto deve ter pelo menos 3 caracteres."),
  category: z.enum(['Pizza', 'Bebida', 'Adicional'], {
    required_error: "Selecione uma categoria.",
  }),
  description: z.string().optional(),
  
  // For 'Adicional'
  price: z.coerce.number().optional(),

  // For 'Pizza'
  pizzaSizes: z.object({
    pequeno: z.coerce.number().optional(),
    medio: z.coerce.number().optional(),
    grande: z.coerce.number().optional(),
    GG: z.coerce.number().optional(),
  }).optional(),
  
  // For 'Bebida'
  drinkSizes: z.array(z.object({
    name: z.string().min(1, "O nome do tamanho é obrigatório (ex: 2L, Lata)."),
    price: z.coerce.number().min(0.01, "O preço deve ser positivo.")
  })).optional(),

}).superRefine((data, ctx) => {
    if (data.category === 'Pizza') {
        const hasAtLeastOneSize = data.pizzaSizes && Object.values(data.pizzaSizes).some(p => p && p > 0);
        if (!hasAtLeastOneSize) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["pizzaSizes"],
                message: "Pelo menos um tamanho de pizza deve ter um preço maior que zero.",
            });
        }
    } else if (data.category === 'Bebida') {
        if (!data.drinkSizes || data.drinkSizes.length === 0) {
           ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["drinkSizes"],
                message: "Adicione pelo menos um tamanho/volume para a bebida.",
            });
        }
    } else if (data.category === 'Adicional') {
        if (!data.price || data.price <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["price"],
                message: "O preço deve ser maior que zero.",
            });
        }
    }
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductFormValues) => void;
  product?: Product | null;
}

export function AddProductDialog({ open, onOpenChange, onSubmit, product }: AddProductDialogProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      category: undefined,
      price: 0,
      description: '',
      pizzaSizes: { pequeno: 0, medio: 0, grande: 0, GG: 0 },
      drinkSizes: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "drinkSizes",
  });

  const { reset, watch } = form;
  const category = watch('category');

  useEffect(() => {
    if (open) {
      if (product) {
        reset({
          name: product.name,
          category: product.category,
          description: product.description || '',
          price: product.price || 0,
          pizzaSizes: {
            pequeno: product.sizes?.pequeno || 0,
            medio: product.sizes?.medio || 0,
            grande: product.sizes?.grande || 0,
            GG: product.sizes?.GG || 0,
          },
          drinkSizes: product.category === 'Bebida' && product.sizes 
            ? Object.entries(product.sizes).map(([name, price]) => ({ name, price: price as number }))
            : [],
        });
      } else {
        reset({
          name: '',
          category: undefined,
          price: 0,
          description: '',
          pizzaSizes: getMockSettings().basePrices,
          drinkSizes: [],
        });
      }
    }
  }, [product, open, reset]);

  const handleDialogClose = () => {
    onOpenChange(false);
  }

  const handleFormSubmit = (data: ProductFormValues) => {
    onSubmit(data);
    handleDialogClose();
  }
  
  const dialogTitle = product ? "Editar Produto" : "Adicionar Novo Produto";
  const dialogDescription = product ? "Atualize as informações do produto." : "Preencha os detalhes para criar um novo produto.";

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-4 overflow-y-auto p-1 pr-2 sm:pr-4 max-h-[70vh] sm:max-h-[60vh]">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Pizza de Calabresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pizza">Pizza</SelectItem>
                        <SelectItem value="Bebida">Bebida</SelectItem>
                        <SelectItem value="Adicional">Adicional</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {category === 'Pizza' && (
                <>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ingredientes (Descrição)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Molho de tomate, mussarela, etc."
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-4 rounded-md border p-4">
                    <FormLabel>Preços por Tamanho</FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {pizzaSizes.map((size) => (
                        <FormField
                          key={size}
                          control={form.control}
                          name={`pizzaSizes.${size}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="capitalize font-normal">{size}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-sm">R$</span>
                                  <Input type="number" step="0.01" placeholder="0,00" className="pl-8" {...field} />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormField
                      control={form.control}
                      name="pizzaSizes"
                      render={() => <FormMessage />}
                    />
                  </div>
                </>
              )}

              {category === 'Bebida' && (
                  <div className="space-y-4 rounded-md border p-4">
                     <FormLabel>Tamanhos / Volumes</FormLabel>
                     <div className="space-y-3">
                        {fields.map((field, index) => (
                          <div key={field.id} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                              <FormField
                                control={form.control}
                                name={`drinkSizes.${index}.name`}
                                render={({ field }) => (
                                    <FormItem className='flex-1'>
                                        <FormLabel className='text-xs'>Volume</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: 2L, Lata" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`drinkSizes.${index}.price`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-xs'>Preço</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-sm">R$</span>
                                                <Input type="number" step="0.01" placeholder="0,00" className="pl-8 w-full sm:w-28" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                              />
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="self-end">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                          </div>
                        ))}
                     </div>
                     <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', price: 0 })}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Tamanho
                     </Button>
                      <FormField
                        control={form.control}
                        name="drinkSizes"
                        render={() => <FormMessage />}
                      />
                  </div>
              )}

              {category === 'Adicional' && (
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Preço</FormLabel>
                      <FormControl>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-sm">R$</span>
                            <Input type="number" step="0.01" placeholder="0,00" className="pl-8" {...field} value={field.value || ''} />
                          </div>
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter className="pt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button type="submit">{product ? 'Salvar Alterações' : 'Adicionar Produto'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
