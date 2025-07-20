'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { useEffect } from 'react';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import type { Product } from '@/types';

const productFormSchema = z.object({
  name: z.string().min(2, "O nome do produto é obrigatório."),
  category: z.enum(['Pizza', 'Bebida', 'Adicional'], {
    required_error: "Selecione uma categoria.",
  }),
  description: z.string().optional(),
  price: z.coerce.number().optional(),
  pizzaSizes: z.object({
    broto: z.coerce.number().optional(),
    media: z.coerce.number().optional(),
    grande: z.coerce.number().optional(),
    familia: z.coerce.number().optional(),
  }).optional(),
  drinkSizes: z.array(z.object({
    name: z.string().min(1, "Nome do tamanho é obrigatório"),
    price: z.coerce.number().min(0.1, "Preço é obrigatório"),
  })).optional(),
}).refine(data => {
  if (data.category === 'Pizza') return data.pizzaSizes?.broto || data.pizzaSizes?.media || data.pizzaSizes?.grande || data.pizzaSizes?.familia;
  if (data.category === 'Bebida') return data.drinkSizes && data.drinkSizes.length > 0;
  if (data.category === 'Adicional') return data.price !== undefined;
  return true;
}, {
  message: "Forneça pelo menos um preço para a categoria selecionada.",
  path: ["price"], 
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductFormValues) => void;
  product?: Product | null;
}

// Helper function to get default values based on the mode
const get_default_values = (product: Product | null | undefined): ProductFormValues => {
    if (product) { // Edit mode
        return {
            name: product.name || '',
            category: product.category,
            description: product.description || '',
            price: product.price || 0,
            pizzaSizes: product.category === 'Pizza' ? product.sizes : { broto: 0, media: 0, grande: 0, familia: 0 },
            drinkSizes: product.category === 'Bebida' && product.sizes 
                ? Object.entries(product.sizes).map(([name, price]) => ({name, price: Number(price)}))
                : [{ name: '', price: 0 }],
        };
    }
    // Create mode
    return {
        name: '',
        // Using `'' as any` is a pragmatic way to satisfy TypeScript for the initial state,
        // allowing the placeholder to show. Zod validation on submit will still enforce a real category selection.
        category: '' as any,
        description: '',
        price: 0,
        pizzaSizes: { broto: 0, media: 0, grande: 0, familia: 0 },
        drinkSizes: [{ name: '', price: 0 }],
    };
}

export function AddProductDialog({ open, onOpenChange, onSubmit, product }: AddProductDialogProps) {
  const isEditMode = !!product;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: get_default_values(null), // Always start with empty defaults
  });

  // Reset form with appropriate values when dialog opens or product changes
  useEffect(() => {
    if (open) {
      const values = get_default_values(product);
      form.reset(values);
    }
  }, [open, product?.id, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "drinkSizes",
  });

  const category = form.watch('category');

  function handleFormSubmit(data: ProductFormValues) {
    onSubmit(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? `Editar Produto` : 'Adicionar Novo Produto'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? `Editando "${product.name}". Preencha os novos dados.`
              : "Preencha os detalhes para criar um novo produto."
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Produto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Pizza Calabresa" {...field} />
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
                            <SelectValue placeholder="Selecione uma categoria" />
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
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ex: Molho de tomate, mussarela, calabresa..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {category === 'Pizza' && (
                  <div className="space-y-2 rounded-md border p-4">
                    <FormLabel>Preços por Tamanho</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="pizzaSizes.broto" render={({ field }) => (<FormItem><FormLabel>Broto</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="pizzaSizes.media" render={({ field }) => (<FormItem><FormLabel>Média</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="pizzaSizes.grande" render={({ field }) => (<FormItem><FormLabel>Grande</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="pizzaSizes.familia" render={({ field }) => (<FormItem><FormLabel>Família</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                    </div>
                  </div>
                )}
                {category === 'Bebida' && (
                  <div className="space-y-4 rounded-md border p-4">
                    <FormLabel>Tamanhos e Preços</FormLabel>
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-end gap-2">
                        <FormField control={form.control} name={`drinkSizes.${index}.name`} render={({ field }) => (<FormItem className="flex-1"><FormLabel>Tamanho</FormLabel><FormControl><Input placeholder="Ex: Lata 350ml" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name={`drinkSizes.${index}.price`} render={({ field }) => (<FormItem><FormLabel>Preço</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', price: 0 })}>Adicionar Tamanho</Button>
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
                          <Input type="number" placeholder="Ex: 12.50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
            <DialogFooter className="pt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button type="submit">{isEditMode ? 'Salvar Alterações' : 'Adicionar Produto'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
