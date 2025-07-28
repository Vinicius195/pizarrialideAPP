'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import type { Customer } from '@/types';
import { MoreHorizontal, PlusCircle, Link as LinkIcon, Trash2, History, Users } from 'lucide-react';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { AddCustomerDialog, type CustomerFormValues } from '@/components/app/add-customer-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';
import { useIsMobile } from '@/hooks/use-mobile';


export default function ClientesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();
  const { customers, addOrUpdateCustomer, deleteCustomer } = useUser();
  const isMobile = useIsMobile();

  // --- FILTERING LOGIC ---
  // Only show customers who have a phone, address, or location link for unique identification.
  const manageableCustomers = useMemo(() => {
    return customers.filter(c => c.phone || c.address || c.locationLink);
  }, [customers]);

  const handleOpenDialog = (customer: Customer | null = null) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: CustomerFormValues) => {
    addOrUpdateCustomer({
      id: editingCustomer?.id,
      name: data.name,
      phone: data.phone,
      address: data.addressType === 'manual' ? (data.address || undefined) : undefined,
      locationLink: data.addressType === 'link' ? (data.locationLink || undefined) : undefined,
    });
    
    toast({
      title: editingCustomer ? 'Cliente Atualizado!' : 'Cliente Adicionado!',
      description: `As informações de ${data.name} foram salvas.`,
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingCustomer) return;
    deleteCustomer(deletingCustomer.id);
    setDeletingCustomer(null);
  }

  const renderMobileCard = (customer: Customer) => (
    <Card key={customer.id} className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-headline">{customer.name}</CardTitle>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem asChild><Link href={`/clientes/${customer.id}`}><History className="mr-2 h-4 w-4" />Ver Histórico</Link></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenDialog(customer)}>Editar</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => setDeletingCustomer(customer)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
            <p className="text-muted-foreground">{customer.phone}</p>
            <div className="text-xs">
                {customer.address ? (<p className="truncate" title={customer.address}>{customer.address}</p>) : customer.locationLink ? (<a href={customer.locationLink} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1"><LinkIcon className="h-3 w-3" /> Ver Localização</a>) : <p className="text-muted-foreground">Endereço não informado</p>}
            </div>
        </CardContent>
        <CardFooter className="bg-muted/40 text-xs flex justify-between p-3">
            <div className="flex flex-col"><span className="font-semibold">{customer.orderCount}</span><span className="text-muted-foreground">Pedidos</span></div>
            <div className="flex flex-col text-right"><span className="font-semibold">{customer.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span className="text-muted-foreground">Total Gasto</span></div>
        </CardFooter>
    </Card>
  );

  return (
    <>
      <AddCustomerDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSubmit={handleSubmit} customer={editingCustomer} />
      <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita. Isso irá deletar permanentemente o cliente <span className="font-bold">"{deletingCustomer?.name}"</span> e todo o seu histórico.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className={buttonVariants({ variant: "destructive" })}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold font-headline">Gestão de Clientes</h1>
                <p className="text-muted-foreground">Visualize e gerencie as informações dos seus clientes identificáveis.</p>
            </div>
            <Button onClick={() => handleOpenDialog()} className='w-full sm:w-auto'><PlusCircle className="mr-2 h-4 w-4" />Adicionar Cliente</Button>
        </div>

        {isMobile ? (
             <div className="grid gap-4 sm:grid-cols-2">
                {manageableCustomers.map(renderMobileCard)}
            </div>
        ) : (
            <Card className="shadow-lg">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[25%]">Nome</TableHead>
                                    <TableHead>Telefone</TableHead>
                                    <TableHead className="hidden md:table-cell">Endereço / Localização</TableHead>
                                    <TableHead className="hidden sm:table-cell text-center">Pedidos</TableHead>
                                    <TableHead className="hidden lg:table-cell">Último Pedido</TableHead>
                                    <TableHead className="text-right">Total Gasto</TableHead>
                                    <TableHead><span className="sr-only">Ações</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {manageableCustomers.length > 0 ? manageableCustomers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                    <TableCell>{customer.phone}</TableCell>
                                    <TableCell className="hidden md:table-cell max-w-xs">{customer.address ? (<span className="truncate block" title={customer.address}>{customer.address}</span>) : customer.locationLink ? (<a href={customer.locationLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary underline hover:text-primary/80"><LinkIcon className="h-4 w-4" /> Ver no mapa</a>) : ('Não informado')}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-center">{customer.orderCount}</TableCell>
                                    <TableCell className="hidden lg:table-cell">{new Date(customer.lastOrderDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                                    <TableCell className="text-right font-mono">{customer.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <DropdownMenuItem asChild><Link href={`/clientes/${customer.id}`}><History className="mr-2 h-4 w-4" /><span>Ver Histórico</span></Link></DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenDialog(customer)}>Editar</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => setDeletingCustomer(customer)}><Trash2 className="mr-2 h-4 w-4" /><span>Excluir</span></DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                       <div className="flex flex-col items-center gap-2 text-muted-foreground"><Users className="h-8 w-8" /><span>Nenhum cliente identificável encontrado.</span></div>
                                    </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        )}
      </div>
    </>
  );
}
