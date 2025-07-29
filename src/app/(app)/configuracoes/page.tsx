'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getMockSettings, updateMockSettings } from '@/lib/settings-data';
import { pizzaSizes, type UserProfile, type UserStatus, type UserRole } from '@/types';
import { useUser } from '@/contexts/user-context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
<<<<<<< HEAD
import { Check, X, MoreHorizontal, Edit, Eye, Trash2, UserPlus, Shield, BellRing, AlertTriangle, Send } from 'lucide-react';
=======
import { Check, X, MoreHorizontal, Edit, Eye, Trash2, UserPlus, Shield, BellRing, AlertTriangle } from 'lucide-react';
>>>>>>> 89c89cc970e33ce077055fc0972bcfd494b9f177
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditUserDialog } from '@/components/app/edit-user-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFcm } from '@/hooks/useFcm';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { auth } from '@/lib/firebase-client';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
<<<<<<< HEAD
import { fontHeadline } from '@/lib/fonts'; // Corrected import path
=======
>>>>>>> 89c89cc970e33ce077055fc0972bcfd494b9f177


const settingsSchema = z.object({
  basePrices: z.object({
    pequeno: z.coerce.number().min(0, 'O preço deve ser positivo.'),
    medio: z.coerce.number().min(0, 'O preço deve ser positivo.'),
    grande: z.coerce.number().min(0, 'O preço deve ser positivo.'),
    GG: z.coerce.number().min(0, 'O preço deve ser positivo.'),
  }),
  sizeAvailability: z.object({
    pequeno: z.boolean(),
    medio: z.boolean(),
    grande: z.boolean(),
    GG: z.boolean(),
  }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

function getStatusBadgeClasses(status: UserStatus): string {
  switch (status) {
    case 'Aprovado':
      return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'Pendente':
      return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
    case 'Reprovado':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
}

// Component for the reset app dialog
const ResetAppDialog = ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => {
    const { toast } = useToast();
    const { getAuthToken } = useUser();
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleReset = async () => {
        setIsSubmitting(true);
        const user = auth.currentUser;
        if (!user || !user.email) {
            toast({ variant: 'destructive', title: 'Erro de Autenticação', description: 'Usuário não encontrado.' });
            setIsSubmitting(false);
            return;
        }

        try {
            // Step 1: Re-authenticate user to confirm their identity
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);

            // Step 2: Call the backend API to perform the reset
            const token = await getAuthToken();
            const response = await fetch('/api/app-reset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Falha ao resetar a aplicação.');

            toast({ title: 'Sucesso!', description: 'O aplicativo foi resetado. Pedidos e notificações foram apagados.' });
            onOpenChange(false);
            // Optionally, trigger a refresh of context data or a page reload
            window.location.reload();

        } catch (error: any) {
            let description = 'Ocorreu um erro desconhecido.';
            if (error.code === 'auth/wrong-password') {
                description = 'A senha informada está incorreta. Tente novamente.';
            } else if (error.message) {
                description = error.message;
            }
            toast({ variant: 'destructive', title: 'Erro na Operação', description });
        } finally {
            setIsSubmitting(false);
            setPassword('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Você tem certeza absoluta?</DialogTitle>
                    <DialogDescription>
                        Esta ação é <span className="font-bold text-destructive">irreversível</span> e apagará permanentemente todos os pedidos e notificações. Clientes, produtos e usuários serão mantidos.
                        Para confirmar, digite sua senha de login abaixo.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input 
                        type="password"
                        placeholder="Digite sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
                    <Button 
                        variant="destructive" 
                        onClick={handleReset} 
                        disabled={isSubmitting || password.length < 6}
                    >
                        {isSubmitting ? "Resetando..." : "Resetar Aplicativo"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


// Componente para o card de notificações, para ser reutilizado
const NotificationsCard = () => {
  const { currentUser } = useUser();
  const { toast } = useToast();
  const { requestPermissionAndGetToken, notificationPermission } = useFcm();

  const handleEnableNotifications = () => {
    if (currentUser) {
      requestPermissionAndGetToken(currentUser.key);
    } else {
      toast({
        title: 'Usuário não encontrado',
        description: 'Faça login para ativar as notificações.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Notificações Push</CardTitle>
        <CardDescription>
          Ative as notificações no seu navegador para receber atualizações importantes sobre pedidos, mesmo com o app fechado.
        </CardDescription>
      </CardHeader>
      <CardContent>
<<<<<<< HEAD
        <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-semibold">Status da Permissão</h3>
            <p className={cn(
                "text-sm",
                notificationPermission === 'granted' && "text-green-600",
                notificationPermission === 'denied' && "text-red-600",
                notificationPermission === 'default' && "text-amber-600",
            )}>
              {notificationPermission === 'loading' && 'Verificando permissões...'}
              {notificationPermission === 'granted' && 'Notificações ativadas neste navegador.'}
              {notificationPermission === 'denied' && 'Permissão bloqueada. Altere nas configurações do navegador.'}
              {notificationPermission === 'default' && 'Permissão necessária para enviar notificações.'}
            </p>
          </div>
          <Button
            onClick={handleEnableNotifications}
            disabled={notificationPermission !== 'default'}
          >
            <BellRing className="mr-2 h-4 w-4" />
            {notificationPermission === 'granted' ? 'Permissão Concedida' : 'Ativar Notificações'}
          </Button>
        </div>
=======
        {notificationPermission === 'loading' ? (
          <p className="text-muted-foreground">Verificando permissões...</p>
        ) : (
          <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="font-semibold">Status da Permissão</h3>
              <p className={cn(
                  "text-sm",
                  notificationPermission === 'granted' && "text-green-600",
                  notificationPermission === 'denied' && "text-red-600",
                  notificationPermission === 'default' && "text-amber-600",
              )}>
                {notificationPermission === 'granted' && 'Notificações ativadas neste navegador.'}
                {notificationPermission === 'denied' && 'Permissão bloqueada. Altere nas configurações do navegador.'}
                {notificationPermission === 'default' && 'Permissão necessária para enviar notificações.'}
              </p>
            </div>
            <Button
              onClick={handleEnableNotifications}
              disabled={notificationPermission === 'granted' || notificationPermission === 'denied'}
            >
              <BellRing className="mr-2 h-4 w-4" />
              Ativar Notificações
            </Button>
          </div>
        )}
>>>>>>> 89c89cc970e33ce077055fc0972bcfd494b9f177
      </CardContent>
    </Card>
  );
};

<<<<<<< HEAD
// Card para testar o envio de notificações
const TestNotificationCard = () => {
    const { getAuthToken } = useUser();
    const { toast } = useToast();
    const { notificationPermission } = useFcm();
    const [isSending, setIsSending] = useState(false);

    const handleTestNotification = async () => {
        setIsSending(true);
        try {
            const token = await getAuthToken();
            if (!token) {
                toast({ variant: 'destructive', title: 'Erro de autenticação' });
                return;
            }

            const response = await fetch('/api/test-notification', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: 'Notificação Enviada!',
                    description: 'Coloque o app em 2º plano para vê-la. A entrega pode levar alguns segundos.',
                });
            } else {
                throw new Error(result.error || 'Falha ao enviar notificação.');
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro ao Enviar Notificação',
                description: error.message,
            });
        } finally {
            setIsSending(false);
        }
    };

    const isTestDisabled = notificationPermission !== 'granted' || isSending;

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Teste de Notificações</CardTitle>
                <CardDescription>
                    Use este botão para enviar uma notificação de teste para você mesmo.
                    Certifique-se de que as notificações estejam ativadas acima.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-1">
                        <h3 className="font-semibold">Enviar um Teste</h3>
                        <p className="text-sm text-muted-foreground">
                          {notificationPermission !== 'granted' 
                            ? "Ative as notificações para poder testar."
                            : "Clique para confirmar que o sistema está funcionando."
                          }
                        </p>
                    </div>
                    <Button onClick={handleTestNotification} disabled={isTestDisabled}>
                        <Send className="mr-2 h-4 w-4" />
                        {isSending ? 'Enviando...' : 'Enviar Teste'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

=======
>>>>>>> 89c89cc970e33ce077055fc0972bcfd494b9f177

// Componente para as configurações de Administrador
const AdminSettings = () => {
  const { currentUser, users, updateUserStatus, deleteUser, updateUserRole } = useUser();
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: getMockSettings(),
  });

  const onSubmit = (data: SettingsFormValues) => {
    updateMockSettings(data);
    toast({
      title: 'Configurações Salvas!',
      description: 'Suas alterações foram salvas com sucesso.',
    });
  };

  const handleUpdateStatus = (user: UserProfile, status: UserStatus) => {
    updateUserStatus(user, status);
  };

  const handleUpdateRole = (user: UserProfile, role: UserRole) => {
    updateUserRole(user.key, role);
    toast({
        title: 'Função Atualizada!',
        description: `${user.name} agora é um(a) ${role}.`,
    })
  };

  const handleDeleteUser = () => {
    if (!deletingUser) return;
    deleteUser(deletingUser.key);
    toast({
      title: 'Usuário Excluído!',
      description: `O usuário ${deletingUser.name} foi removido.`,
    });
    setDeletingUser(null);
  };
  
  const renderUserMobileCard = (user: UserProfile) => (
    <Card key={user.key} className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-base">{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
            </div>
             {user.key !== currentUser?.key && user.status !== 'Pendente' && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Opções</span></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        {currentUser?.role === 'Administrador' && (
                            <>
                                {user.role !== 'Administrador' ? (
                                    <DropdownMenuItem onClick={() => handleUpdateRole(user, 'Administrador')}><Shield className="mr-2 h-4 w-4" />Tornar Admin</DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => handleUpdateRole(user, 'Funcionário')}><UserPlus className="mr-2 h-4 w-4" />Tornar Funcionário</DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => setDeletingUser(user)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between text-sm">
        <div>
            <span className="text-muted-foreground">Função: </span>
            <span className="font-medium">{user.role}</span>
        </div>
        <Badge variant="outline" className={cn('text-xs', getStatusBadgeClasses(user.status))}>{user.status}</Badge>
      </CardContent>
       {user.status === 'Pendente' && (
           <CardFooter className="p-2 border-t">
               <div className="flex w-full gap-2">
                   <Button size="sm" variant="outline" className="w-full text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleUpdateStatus(user, 'Aprovado')}><Check className="h-4 w-4 mr-2" />Aprovar</Button>
                   <Button size="sm" variant="outline" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleUpdateStatus(user, 'Reprovado')}><X className="h-4 w-4 mr-2" />Reprovar</Button>
               </div>
           </CardFooter>
       )}
    </Card>
  );

  return (
    <>
      <EditUserDialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)} user={editingUser} />
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita. Isso irá deletar permanentemente a conta de <span className="font-bold">"{deletingUser?.name}"</span>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className={buttonVariants({ variant: 'destructive' })}>Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ResetAppDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen} />
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Gerenciamento de Usuários</CardTitle>
          <CardDescription>Aprove ou reprove novos cadastros e visualize todos os usuários do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <div className="grid gap-4 sm:grid-cols-2">{users.map(renderUserMobileCard)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Função</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.key}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                      <TableCell className="hidden md:table-cell">{user.role}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className={cn('text-xs', getStatusBadgeClasses(user.status))}>{user.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {user.status === 'Pendente' ? (
                          <div className="flex gap-2 justify-end">
                            <Button size="icon" variant="outline" className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleUpdateStatus(user, 'Aprovado')}><Check className="h-4 w-4" /><span className="sr-only">Aprovar</span></Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleUpdateStatus(user, 'Reprovado')}><X className="h-4 w-4" /><span className="sr-only">Reprovar</span></Button>
                          </div>
                        ) : user.key === currentUser?.key ? (
                          <Badge variant="outline" className="font-medium">Você</Badge>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Opções</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              {user.role !== 'Administrador' ? (
                                <DropdownMenuItem onClick={() => handleUpdateRole(user, 'Administrador')}><Shield className="mr-2 h-4 w-4" />Tornar Admin</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleUpdateRole(user, 'Funcionário')}><UserPlus className="mr-2 h-4 w-4" />Tornar Funcionário</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => setDeletingUser(user)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive shadow-lg">
        <CardHeader>
            <div className="flex items-center gap-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                    <CardTitle>Zona de Perigo</CardTitle>
                    <CardDescription>Ações destrutivas que devem ser usadas com cautela.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div>
                    <h3 className="font-semibold">Resetar Dados do Aplicativo</h3>
                    <p className="text-sm text-muted-foreground">Apaga permanentemente todos os pedidos e notificações. Esta ação não pode ser desfeita.</p>
                </div>
                <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)}>
                    Resetar App
                </Button>
            </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Preços Base das Pizzas</CardTitle>
              <CardDescription>Defina os preços padrão para cada tamanho de pizza.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {pizzaSizes.map((size) => (
                  <FormField key={size} control={form.control} name={`basePrices.${size}`} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="capitalize font-medium">{size}</FormLabel>
                      <FormControl><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-sm">R$</span><Input type="number" step="0.01" placeholder="0,00" className="pl-8" {...field} /></div></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Disponibilidade de Tamanhos</CardTitle>
              <CardDescription>Ative ou desative tamanhos de pizza para todo o cardápio.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pizzaSizes.map((size) => (
                  <FormField key={size} control={form.control} name={`sizeAvailability.${size}`} render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm h-full">
<<<<<<< HEAD
                      <div className="space-y-0.5"><FormLabel htmlFor={`switch-${size}`} className="text-base font-semibold capitalize cursor-pointer">{size}</FormLabel></div>
                      <FormControl><Switch id={`switch-${size}`} checked={field.value} onCheckedChange={field.onChange} aria-label={`Disponibilidade do tamanho ${size}`} /></FormControl>
=======
                      <div className="space-y-0.5"><FormLabel className="text-base font-semibold capitalize cursor-pointer">{size}</FormLabel></div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} aria-label={`Disponibilidade do tamanho ${size}`} /></FormControl>
>>>>>>> 89c89cc970e33ce077055fc0972bcfd494b9f177
                    </FormItem>
                  )} />
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Form>
    </>
  );
};


export default function ConfiguracoesPage() {
  const { currentUser } = useUser();
  const isAdmin = currentUser?.role === 'Administrador';

  return (
    <div className="space-y-6">
      <div>
<<<<<<< HEAD
        <h1 className={cn("text-3xl font-bold", fontHeadline.className)}>Configurações</h1>
=======
        <h1 className="text-3xl font-bold font-headline">Configurações</h1>
>>>>>>> 89c89cc970e33ce077055fc0972bcfd494b9f177
        <p className="text-muted-foreground">
          {isAdmin 
            ? "Gerencie as configurações gerais, usuários e notificações da sua pizzaria."
            : "Gerencie as configurações da sua conta."}
        </p>
      </div>

      <NotificationsCard />

<<<<<<< HEAD
      <TestNotificationCard />

=======
>>>>>>> 89c89cc970e33ce077055fc0972bcfd494b9f177
      {isAdmin && <AdminSettings />}

    </div>
  );
}
