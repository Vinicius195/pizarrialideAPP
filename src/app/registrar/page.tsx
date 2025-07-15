'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Pizza, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { UserRole } from '@/types';

const registerSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('Por favor, insira um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

type FormFeedback = {
    type: 'success' | 'error';
    message: string;
};

export default function RegisterPage() {
    const router = useRouter();
    const { registerUser } = useUser();
    const [formFeedback, setFormFeedback] = useState<FormFeedback | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<RegisterFormValues>({
      resolver: zodResolver(registerSchema),
      defaultValues: {
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      },
    });

    const handleRegister = async (data: RegisterFormValues) => {
        setFormFeedback(null);
        const result = await registerUser({
            name: data.name,
            email: data.email,
            role: 'Funcionário', // Always register as 'Funcionário'
            password_str: data.password,
        });

        if (result.success) {
            setFormFeedback({ type: 'success', message: 'Cadastro realizado com sucesso! Aguarde a aprovação de um administrador.' });
            setTimeout(() => router.push('/'), 3000);
        } else {
            setFormFeedback({ type: 'error', message: result.message });
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
                <Pizza className="mx-auto h-14 w-14 text-primary" />
                <h1 className="mt-4 font-headline text-4xl font-bold tracking-tighter">
                  Criar Conta
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Preencha seus dados para solicitar acesso
                </p>
            </div>
            <Card className="shadow-2xl">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-6">
                  <CardContent className="space-y-4 pt-6">
                    {formFeedback && (
                       <Alert variant={formFeedback.type === 'error' ? 'destructive' : 'default'} 
                              className={formFeedback.type === 'success' ? 'border-green-500/50' : ''}>
                          {formFeedback.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4" />}
                          <AlertTitle>{formFeedback.type === 'error' ? 'Erro no Cadastro' : 'Sucesso!'}</AlertTitle>
                          <AlertDescription>{formFeedback.message}</AlertDescription>
                        </Alert>
                    )}
                    <FormField name="name" control={form.control} render={({ field }) => (
                      <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Seu Nome" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField name="email" control={form.control} render={({ field }) => (
                      <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input placeholder="exemplo@belamassa.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField name="password" control={form.control} render={({ field }) => (
                      <FormItem><FormLabel>Senha</FormLabel><FormControl><div className="relative"><Input type={showPassword ? 'text' : 'password'} {...field} /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField name="confirmPassword" control={form.control} render={({ field }) => (
                      <FormItem><FormLabel>Confirmar Senha</FormLabel><FormControl><div className="relative"><Input type={showConfirmPassword ? 'text' : 'password'} {...field} /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff /> : <Eye />}</Button></div></FormControl><FormMessage /></FormItem>
                    )}/>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                      Solicitar Acesso
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        Já tem uma conta? <Link href="/" className="text-primary hover:underline">Faça login aqui</Link>
                    </p>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </div>
        </div>
      );
}
