'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect } from 'react';
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
import { Phone, Link as LinkIcon } from 'lucide-react';
import type { Customer } from '@/types';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const customerSchema = z.object({
  name: z.string().min(3, "O nome do cliente é obrigatório."),
  phone: z.string().min(10, "O telefone é obrigatório."),
  addressType: z.enum(['manual', 'link']).default('manual'),
  address: z.string().optional(),
  locationLink: z.string().url({ message: "Por favor, insira um link válido." }).optional().or(z.literal('')),
});


export type CustomerFormValues = z.infer<typeof customerSchema>;

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomerFormValues) => void;
  customer?: Customer | null;
}

export function AddCustomerDialog({ open, onOpenChange, onSubmit, customer }: AddCustomerDialogProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phone: '',
      addressType: 'manual',
      address: '',
      locationLink: '',
    },
  });
  
  const { reset, watch, setValue } = form;
  const addressType = watch('addressType');

  useEffect(() => {
    if (open) {
      if (customer) {
        const initialAddressType = customer.locationLink ? 'link' : 'manual';
        reset({
          name: customer.name || '',
          phone: customer.phone || '',
          addressType: initialAddressType,
          address: customer.address || '',
          locationLink: customer.locationLink || '',
        });
      } else {
        reset({
          name: '',
          phone: '',
          addressType: 'manual',
          address: '',
          locationLink: '',
        });
      }
    }
  }, [customer, open, reset]);

  const handleDialogClose = () => {
    onOpenChange(false);
  }

  const handleFormSubmit = (data: CustomerFormValues) => {
    onSubmit(data);
    handleDialogClose();
  }

  const dialogTitle = customer ? "Editar Cliente" : "Adicionar Novo Cliente";
  const dialogDescription = customer ? "Atualize as informações do cliente." : "Preencha os detalhes para criar um novo cliente.";

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <div className="relative">
                       <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                       </div>
                       <Input type="tel" placeholder="(00) 90000-0000" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="addressType"
                render={({ field }) => (
                  <FormItem className="space-y-3 pt-2">
                    <FormLabel>Endereço / Localização (Opcional)</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value === 'link') {
                            setValue('address', '');
                          } else {
                            setValue('locationLink', '');
                          }
                        }}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="manual" /></FormControl>
                          <FormLabel className="font-normal cursor-pointer">Digitar Endereço</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="link" /></FormControl>
                          <FormLabel className="font-normal cursor-pointer">Link do Mapa</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              {addressType === 'manual' && (
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: Rua das Flores, 123, Bairro Jardim, Cidade..."
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {addressType === 'link' && (
                <FormField
                  control={form.control}
                  name="locationLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            placeholder="https://maps.app.goo.gl/..."
                            className="pl-10"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

             <DialogFooter className="pt-4 border-t">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">Cancelar</Button>
                </DialogClose>
                <Button type="submit">{customer ? 'Salvar Alterações' : 'Adicionar Cliente'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
