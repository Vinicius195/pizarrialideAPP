export type OrderStatus = "Recebido" | "Preparando" | "Pronto" | "Em Entrega" | "Entregue" | "Cancelado" | "Arquivado";

export type PizzaSize = 'pequeno' | 'medio' | 'grande' | 'GG';

export const pizzaSizes: PizzaSize[] = ['pequeno', 'medio', 'grande', 'GG'];

export interface Product {
  id: string;
  name: string;
  category: 'Pizza' | 'Bebida' | 'Adicional';
  sizes?: Record<string, number>;
  price?: number;
  isAvailable: boolean;
  description?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  locationLink?: string;
  lastOrderDate: string;
  totalSpent: number;
  orderCount: number;
}

export interface OrderItem {
  productId: string;
  product2Id?: string;
  isHalfHalf: boolean;
  productName: string;
  quantity: number;
  size?: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  timestamp: string;
  orderType: 'entrega' | 'retirada';
  address?: string;
  locationLink?: string;
  notes?: string;
}

export type UserRole = 'Administrador' | 'Funcionário';
export type UserStatus = 'Aprovado' | 'Pendente' | 'Reprovado';

export interface UserProfile {
  key: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  avatar: string;
  fallback: string;
  fcmToken?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  relatedUrl?: string;
  read: boolean;
  timestamp: string;
  priority?: 'high' | 'normal';
}
