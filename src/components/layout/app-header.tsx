'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  User,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeToggle } from '../theme-toggle'
import { useUser } from '@/contexts/user-context'
import { NotificationBell } from '../app/notification-bell'

const getPageTitle = (pathname: string) => {
  if (pathname.startsWith('/dashboard')) return 'Dashboard'
  if (pathname.startsWith('/pedidos')) return 'Pedidos'
  if (pathname.startsWith('/entregas')) return 'Entregas'
  if (pathname.startsWith('/produtos')) return 'Produtos'
  if (pathname.startsWith('/clientes')) return 'Clientes'
  if (pathname.startsWith('/configuracoes')) return 'Configurações'
  return 'Pizzaria Bela Massa'
}

const navLinks = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/pedidos', icon: ShoppingCart, label: 'Pedidos' },
  { href: '/produtos', icon: Package, label: 'Produtos' },
  { href: '/clientes', icon: Users, label: 'Clientes' },
  { href: '/entregas', icon: Truck, label: 'Entregas' },
]

export function AppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const title = getPageTitle(pathname)
  const { currentUser, logout } = useUser()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (!currentUser) {
    return null
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline">
              <Home className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Navegação</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {navLinks.map((link) => (
              <DropdownMenuItem key={link.href} asChild>
                <Link href={link.href} className="flex items-center gap-2">
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex w-full items-center gap-4 md:gap-2 lg:gap-4">
        <h1 className="font-headline text-xl font-semibold">{title}</h1>
        <div className="ml-auto flex items-center gap-4">
          <ThemeToggle />
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar className="h-10 w-10 border-2 border-primary">
                  <AvatarImage
                    src={currentUser.avatar}
                    alt={`@${currentUser.name}`}
                    data-ai-hint="user avatar"
                  />
                  <AvatarFallback>{currentUser.fallback}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {currentUser.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {currentUser.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              {currentUser.role === 'Administrador' && (
                <DropdownMenuItem asChild>
                  <Link href="/configuracoes">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
