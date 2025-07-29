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

// This now matches the more robust structure the context expects.
export interface OrderItem {
  productId: string;
  product2Id?: string; // For half-and-half pizzas
  isHalfHalf: boolean;
  productName: string; // This will be denormalized for easy display
  quantity: number;
  size?: string;
}

// This now includes the customerId for better data linking.
export interface Order {
  id: string;
  orderNumber: number;
  customerId?: string; // Important for linking back to the customer
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
  message: string;
  relatedUrl?: string;
  isRead: boolean;
  timestamp: string; // ISO string
  priority?: 'high' | 'normal';
}
