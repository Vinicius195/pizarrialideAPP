'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type {
  UserProfile,
  UserRole,
  UserStatus,
  Customer,
  Order,
  OrderStatus,
  Product,
  PizzaSize,
  OrderItem,
} from '@/types';
import type { AddOrderFormValues } from '@/components/app/add-order-dialog';
import { useToast } from '@/hooks/use-toast';
import type { ProductFormValues } from '@/components/app/add-product-dialog';
import { auth, db } from '@/lib/firebase-client';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ChefHat, Bike, Pizza, Package } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

// --- Helper Types ---
export type RegisterDetails = Omit<UserProfile, 'key' | 'status' | 'avatar' | 'fallback' | 'password'> & { password_str: string; };
export type LoginResult = { success: boolean; message: string };
export type RegisterResult = { success: boolean; message: string; user?: UserProfile; };
export type CustomerData = Partial<Omit<Customer, 'id'>> & { id?: string; orderTotal?: number; name: string; phone: string; };

export const kanbanStatuses: { status: OrderStatus; icon: React.ElementType; color: string; }[] = [
  { status: 'Recebido', icon: Package, color: 'bg-chart-3 text-white' },
  { status: 'Preparando', icon: ChefHat, color: 'bg-chart-4 text-white' },
  { status: 'Pronto', icon: Pizza, color: 'bg-chart-2 text-white' },
  { status: 'Em Entrega', icon: Bike, color: 'bg-primary text-white' },
];

// --- Context Definition ---
interface UserContextType {
  currentUser: UserProfile | null;
  isLoading: boolean;
  users: UserProfile[];
  customers: Customer[];
  products: Product[];
  orders: Order[];
  orderStatuses: OrderStatus[];
  getAuthToken: () => Promise<string | null>;
  login: (email: string, pass: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  registerUser: (details: RegisterDetails) => Promise<RegisterResult>;
  updateUser: (key: string, data: Partial<UserProfile>) => Promise<RegisterResult>;
  deleteUser: (key: string) => Promise<void>;
  updateUserStatus: (user: UserProfile, status: UserStatus) => Promise<void>;
  updateUserRole: (key: string, role: UserRole) => Promise<void>;
  addOrUpdateCustomer: (data: CustomerData) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  toggleProductAvailability: (productId: string, isAvailable: boolean) => Promise<void>;
  addProduct: (productData: ProductFormValues) => Promise<void>;
  updateProduct: (productId: string, productData: ProductFormValues) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addOrder: (data: AddOrderFormValues) => Promise<Order | null>;
  updateOrder: (orderId: string, data: AddOrderFormValues) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  advanceOrderStatus: (orderId: string) => Promise<void>;
  deleteAllOrders: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// --- Provider Component ---
export function UserProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const orderStatuses: OrderStatus[] = ['Recebido', 'Preparando', 'Pronto', 'Em Entrega', 'Entregue', 'Cancelado'];

  const getAuthToken = useCallback(async () => {
    const user = auth.currentUser;
    return user ? user.getIdToken() : null;
  }, []);

  const fetchAPI = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getAuthToken();
    options.headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    const res = await fetch(url, options);
    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(errorBody || `Request failed: ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }, [getAuthToken]);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch user profile initially to check status
          const userProfile = await fetchAPI(`/api/users/${user.uid}`);
          if (!userProfile || userProfile.status !== 'Aprovado') {
            throw new Error(`Acesso negado. Status: ${userProfile?.status || 'Pendente'}`);
          }
          setCurrentUser(userProfile);

          // Setup realtime listeners
          const collections = {
            users: setUsers,
            products: setProducts,
            customers: setCustomers,
            orders: setOrders,
          };

          const unsubscribes = Object.entries(collections).map(([name, setter]) => {
            const q = query(collection(db, name));
            return onSnapshot(q, (snapshot) => {
              const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
              setter(data);
            });
          });
          
          setIsLoading(false);

          // Return a cleanup function for all listeners
          return () => unsubscribes.forEach(unsub => unsub());

        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Falha no Acesso', description: error.message, duration: 10000 });
          await signOut(auth);
          setCurrentUser(null);
          setIsLoading(false);
        }
      } else {
        setCurrentUser(null);
        setIsLoading(false);
      }
    });

    return () => authUnsubscribe();
}, [fetchAPI, toast]);
  
    const login = async (email: string, pass: string): Promise<LoginResult> => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return { success: true, message: 'Login bem-sucedido!' };
    } catch {
      return { success: false, message: 'E-mail ou senha inválidos.' };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  const registerUser = async (details: RegisterDetails): Promise<RegisterResult> => {
    try {
      const newUser = await fetchAPI('/api/users', {
        method: 'POST', body: JSON.stringify({ ...details, password: details.password_str }),
      });
      // Listener will auto-update state
      toast({ title: 'Solicitação Enviada!', description: 'Seu acesso precisa ser aprovado por um administrador.' });
      return { success: true, message: 'Usuário registrado!', user: newUser };
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro no Registro', description: error.message });
      return { success: false, message: error.message };
    }
  };

  const updateUser = async (key: string, data: Partial<UserProfile>): Promise<RegisterResult> => {
    try {
      const updatedUser = await fetchAPI(`/api/users/${key}`, { method: 'PUT', body: JSON.stringify(data) });
      // Listener will auto-update state
      if (currentUser?.key === key) setCurrentUser((prev) => (prev ? { ...prev, ...updatedUser } : null));
      return { success: true, message: 'Usuário atualizado!' };
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
      return { success: false, message: e.message };
    }
  };

  const deleteUser = async (key: string) => {
    await fetchAPI(`/api/users/${key}`, { method: 'DELETE' });
    // Listener will auto-update state
    toast({ title: 'Sucesso', description: 'Usuário removido.' });
  };

  const updateUserStatus = async (user: UserProfile, status: UserStatus) => {
    await updateUser(user.key, { status });
    toast({ title: 'Usuário Atualizado!', description: `O status de ${user.name} foi alterado para ${status}.` });
  };

  const updateUserRole = async (key: string, role: UserRole) => {
    await updateUser(key, { role });
    toast({ title: 'Função Atualizada!', description: `A função do usuário foi alterada para ${role}.` });
  };

  const transformProductForm = (data: ProductFormValues): Omit<Product, 'id' | 'isAvailable'> => {
    if (data.category === 'Pizza') return { name: data.name, category: 'Pizza', description: data.description, sizes: data.pizzaSizes };
    if (data.category === 'Bebida') {
      const sizes = data.drinkSizes?.reduce((acc, v) => (v.name && v.price ? { ...acc, [v.name]: v.price } : acc), {});
      return { name: data.name, category: 'Bebida', sizes };
    }
    return { name: data.name, category: 'Adicional', price: data.price };
  };

  const addProduct = async (data: ProductFormValues) => {
    await fetchAPI('/api/products', { method: 'POST', body: JSON.stringify({ ...transformProductForm(data), isAvailable: true }) });
    // Listener will auto-update state
    toast({ title: 'Sucesso!', description: 'Produto adicionado.' });
  };

  const updateProduct = async (id: string, data: ProductFormValues) => {
    const updatedData = transformProductForm(data);
    await fetchAPI(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(updatedData) });
    // Listener will auto-update state
    toast({ title: 'Sucesso!', description: 'Produto atualizado.' });
  };
  
  const toggleProductAvailability = async (id: string, isAvailable: boolean) => {
    await fetchAPI(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify({ isAvailable }) });
    // Listener will auto-update state
  };

  const deleteProduct = async (id: string) => {
    await fetchAPI(`/api/products/${id}`, { method: 'DELETE' });
    // Listener will auto-update state
    toast({ variant: 'destructive', title: 'Sucesso!', description: 'Produto removido.' });
  };

  const addOrUpdateCustomer = async (data: CustomerData) => {
    const existing = customers.find((c) => (data.id && c.id === data.id) || (data.phone && c.phone === data.phone));
    const endpoint = existing ? `/api/customers/${existing.id}` : '/api/customers';
    const method = existing ? 'PUT' : 'POST';
    const payload = { ...data, orderCount: (existing?.orderCount || 0) + 1, totalSpent: (existing?.totalSpent || 0) + (data.orderTotal || 0) };
    await fetchAPI(endpoint, { method, body: JSON.stringify(payload) });
    // Listener will auto-update state
  };
  
  const deleteCustomer = async (customerId: string) => {
    await fetchAPI(`/api/customers/${customerId}`, { method: 'DELETE' });
    // Listener will auto-update state
    toast({ variant: 'destructive', title: 'Cliente Removido!', description: 'O cliente foi removido com sucesso.' });
  };

  const calculateOrderTotal = (items: AddOrderFormValues['items'], products: Product[]): number => items.reduce((acc, item) => {
    const p1 = products.find(p => p.id === item.productId);
    if (!p1) return acc;
    if (item.isHalfHalf && item.size) {
      const p2 = products.find(p => p.id === item.product2Id);
      const price1 = p1.sizes?.[item.size as PizzaSize] ?? 0;
      const price2 = p2?.sizes?.[item.size as PizzaSize] ?? 0;
      return acc + Math.max(price1, price2) * item.quantity;
    }
    const price = p1.sizes && item.size ? p1.sizes[item.size] || 0 : p1.price || 0;
    return acc + price * item.quantity;
  }, 0);

  const transformOrderItems = (items: AddOrderFormValues['items'], products: Product[]): OrderItem[] => items.map(item => {
    const p1 = products.find(p => p.id === item.productId);
    let productName = p1?.name ?? 'N/A';
    if (item.isHalfHalf && item.product2Id) {
      const p2 = products.find(p => p.id === item.product2Id);
      productName = `½ ${productName}, ½ ${p2?.name ?? ''}`;
    }
    return { productName, quantity: item.quantity, size: item.size };
  });

  const _updateOrderAPI = async (orderId: string, data: Partial<Order>) => {
    const updatedOrder = await fetchAPI(`/api/orders/${orderId}`, { method: 'PUT', body: JSON.stringify(data) });
    // Listener will auto-update state
    return updatedOrder;
  };

  const addOrder = async (data: AddOrderFormValues): Promise<Order | null> => {
    try {
      const total = calculateOrderTotal(data.items, products);
      const newOrder = await fetchAPI('/api/orders', { method: 'POST', body: JSON.stringify({ ...data, total, items: transformOrderItems(data.items, products) }) });
      // Listener will auto-update state
      await addOrUpdateCustomer({ name: data.customerName, phone: data.customerPhone || '', orderTotal: total });
      toast({ title: 'Sucesso!', description: 'Pedido adicionado.' });
      return newOrder;
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro!', description: 'Não foi possível criar o pedido.' });
      return null;
    }
  };

  const updateOrder = async (orderId: string, data: AddOrderFormValues) => {
    const total = calculateOrderTotal(data.items, products);
    await _updateOrderAPI(orderId, { ...data, total, items: transformOrderItems(data.items, products) });
    toast({ title: 'Sucesso!', description: 'Pedido atualizado.' });
  };
  
  const advanceOrderStatus = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const currentIndex = orderStatuses.indexOf(order.status);
    if (currentIndex < 0 || currentIndex >= orderStatuses.length - 2) return;
    const nextStatus = (order.status === 'Pronto' && order.orderType === 'retirada') ? 'Entregue' : orderStatuses[currentIndex + 1];
    await _updateOrderAPI(orderId, { status: nextStatus });
    toast({ title: 'Status do Pedido Atualizado!' });
  };

  const cancelOrder = async (orderId: string) => {
    await _updateOrderAPI(orderId, { status: 'Cancelado' });
    toast({ title: 'Pedido Cancelado' });
  };

  const deleteAllOrders = async () => {
    await fetchAPI('/api/orders/delete-all', { method: 'DELETE' });
    // Listener will auto-update state
    toast({ title: 'Sucesso!', description: 'Todos os pedidos foram arquivados.' });
  };
  
  return (
    <UserContext.Provider value={{ currentUser, isLoading, users, customers, products, orders, orderStatuses, getAuthToken, login, logout, registerUser, updateUser, deleteUser, updateUserStatus, updateUserRole, addOrUpdateCustomer, deleteCustomer, toggleProductAvailability, addProduct, updateProduct, deleteProduct, addOrder, updateOrder, cancelOrder, advanceOrderStatus, deleteAllOrders }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) throw new Error('useUser must be used within a UserProvider');
  return context;
}
