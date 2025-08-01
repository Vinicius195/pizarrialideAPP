'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import type { UserProfile, UserRole, UserStatus, Customer, Order, OrderStatus, Product, PizzaSize, OrderItem, Notification } from '@/types';
import type { AddOrderFormValues } from '@/components/app/add-order-dialog';
import { useToast } from '@/hooks/use-toast';
import type { ProductFormValues } from '@/components/app/add-product-dialog';
import { auth, db } from '@/lib/firebase-client';
import { onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ChefHat, Bike, Pizza, Package } from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, limit, writeBatch, doc } from 'firebase/firestore';

// --- Audio Utilities (para alertas no app) ---
let audioContext: AudioContext | null = null;
if (typeof window !== 'undefined') {
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch (e) {
    console.error("Web Audio API não é suportada neste navegador.", e);
  }
}

export const resumeAudioContext = () => {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(e => console.error("Falha ao reativar o AudioContext.", e));
  }
};

const playNotificationAlert = () => {
  if (!audioContext || audioContext.state !== 'running') return;
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.error("Falha ao tocar o som de notificação.", e);
  }
};


// --- Helper Types ---
export type RegisterDetails = Omit<UserProfile, 'key' | 'status' | 'avatar' | 'fallback' | 'password'> & { password_str: string; };
export type LoginResult = { success: boolean; message: string };
export type RegisterResult = { success: boolean; message: string; user?: UserProfile; };
export type CustomerData = Partial<Omit<Customer, 'id' | 'orderCount' | 'totalSpent' | 'lastOrderDate'>> & { id?: string; name:string; phone: string; };

export const kanbanStatuses: { status: OrderStatus; icon: React.ElementType; color: string; }[] = [
  { status: 'Recebido', icon: Package, color: 'bg-chart-3 text-white' },
  { status: 'Preparando', icon: ChefHat, color: 'bg-chart-4 text-white' },
  { status: 'Pronto', icon: Pizza, color: 'bg-chart-2 text-white' },
  { status: 'Em Entrega', icon: Bike, color: 'bg-primary text-white' },
];

// --- Context Definition ---
interface UserContextType {
  currentUser: UserProfile | null;
  authToken: string | null;
  isLoading: boolean;
  users: UserProfile[];
  customers: Customer[];
  products: Product[];
  orders: Order[];
  notifications: Notification[];
  orderStatuses: OrderStatus[];
  getAuthToken: () => Promise<string | null>;
  markNotificationsAsRead: (ids: string[]) => Promise<void>;
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
  const [rawUsers, setRawUsers] = useState<UserProfile[]>([]);
  const [rawCustomers, setRawCustomers] = useState<Customer[]>([]);
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [rawOrders, setRawOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const previousNotificationsRef = useRef<Notification[]>([]);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const orderStatuses: OrderStatus[] = ['Recebido', 'Preparando', 'Pronto', 'Em Entrega', 'Entregue', 'Cancelado', 'Arquivado'];
  
  const getAuthToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(true);
  }, []);

  const aggregatedCustomers = useMemo(() => {
    const customerMap = new Map<string, Customer>();
    rawCustomers.forEach(customer => {
      customerMap.set(customer.id, { ...customer, orderCount: 0, totalSpent: 0, lastOrderDate: 'Nunca' });
    });
    rawOrders.forEach(order => {
      if (order.customerId && customerMap.has(order.customerId)) {
        const customer = customerMap.get(order.customerId)!;
        customer.orderCount++;
        if (order.status !== 'Cancelado') customer.totalSpent += order.total;
        if (customer.lastOrderDate === 'Nunca' || new Date(order.timestamp) > new Date(customer.lastOrderDate)) {
          customer.lastOrderDate = order.timestamp;
        }
      }
    });
    return Array.from(customerMap.values());
  }, [rawCustomers, rawOrders]);

  const fetchAPI = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getAuthToken();
    options.headers = { ...options.headers, 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    const res = await fetch(url, options);
    if (!res.ok) {
      if (res.status === 401) {
        console.error("Erro de autenticação (401). Forçando logout.");
        await signOut(auth);
      }
      const errorBody = await res.text();
      throw new Error(errorBody || `Request failed: ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }, [getAuthToken]);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        setIsLoading(true);
        try {
          const idToken = await user.getIdToken(true);
          setAuthToken(idToken);
          const userProfile = await fetchAPI(`/api/users/${user.uid}`);
          if (!userProfile || userProfile.status !== 'Aprovado') {
            throw new Error(`Acesso negado. Status: ${userProfile?.status || 'Pendente'}`);
          }
          setCurrentUser(userProfile);
        } catch (error: any) {
          console.error("Erro na sessão de autenticação:", error);
          toast({ variant: "destructive", title: "Sessão inválida", description: error.message });
          await signOut(auth);
        } finally {
          setIsLoading(false);
        }
      } else {
        setCurrentUser(null);
        setAuthToken(null);
        setNotifications([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchAPI, toast]);

  // Listener para dados principais (usuários, clientes, etc.)
  useEffect(() => {
    if (!currentUser) return;
  
    const collections: { [key: string]: (data: any) => void } = {
      users: (data) => setRawUsers(data.map((u: any) => ({ ...u, key: u.id }))),
      customers: setRawCustomers,
      products: setRawProducts,
    };
  
    const unsubscribers = Object.entries(collections).map(([name, setter]) =>
      onSnapshot(collection(db, name), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setter(data);
      }, (error) => console.error(`Erro ao buscar ${name}:`, error))
    );
  
    const activeStatuses: OrderStatus[] = ['Recebido', 'Preparando', 'Pronto', 'Em Entrega', 'Entregue', 'Cancelado'];
    const ordersQuery = query(collection(db, 'orders'), where('status', 'in', activeStatuses), orderBy('timestamp', 'desc'));
    const ordersUnsubscriber = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      setRawOrders(ordersData);
    }, (error) => console.error("Erro ao buscar pedidos:", error));
  
    return () => { [...unsubscribers, ordersUnsubscriber].forEach(unsub => unsub()); };
  }, [currentUser]);

  // Listener para Notificações em tempo real
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', currentUser.key), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
      setNotifications(newNotifications);
    }, (error) => {
      console.error("Erro ao buscar notificações em tempo real:", error);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Efeito para disparar alertas sonoros/vibratórios para novas notificações
  useEffect(() => {
    const newUnread = notifications.filter(n => !n.read && !previousNotificationsRef.current.some(pn => pn.id === n.id));
    if (newUnread.length > 0) {
      console.log('Nova notificação detectada. Disparando alerta.');
      playNotificationAlert();
      if (navigator.vibrate) navigator.vibrate(200);
    }
    previousNotificationsRef.current = notifications;
  }, [notifications]);

  const markNotificationsAsRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await fetchAPI('/api/notifications', {
        method: 'PUT',
        body: JSON.stringify({ notificationIds: ids }),
      });
    } catch (error: any) {
      console.error("Falha ao marcar notificações como lidas:", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar as notificações.' });
    }
  };
  
  const login = async (email: string, pass: string): Promise<LoginResult> => { try { await signInWithEmailAndPassword(auth, email, pass); return { success: true, message: 'Login bem-sucedido!' }; } catch { return { success: false, message: 'E-mail ou senha inválidos.' }; } };
  const logout = async () => { await signOut(auth); };
  const registerUser = async (details: RegisterDetails): Promise<RegisterResult> => { try { const newUser = await fetchAPI('/api/users', { method: 'POST', body: JSON.stringify({ ...details, password: details.password_str }) }); toast({ title: 'Solicitação Enviada!', description: 'Seu acesso precisa ser aprovado.' }); return { success: true, message: 'Usuário registrado!', user: newUser }; } catch (error: any) { toast({ variant: 'destructive', title: 'Erro no Registro', description: error.message }); return { success: false, message: error.message }; } };
  const updateUser = async (key: string, data: Partial<UserProfile>): Promise<RegisterResult> => { try { const updatedUser = await fetchAPI(`/api/users/${key}`, { method: 'PUT', body: JSON.stringify(data) }); if (currentUser?.key === key) setCurrentUser((prev) => (prev ? { ...prev, ...updatedUser } : null)); return { success: true, message: 'Usuário atualizado!' }; } catch (e: any) { toast({ variant: 'destructive', title: 'Erro', description: e.message }); return { success: false, message: e.message }; } };
  const deleteUser = async (key: string) => { await fetchAPI(`/api/users/${key}`, { method: 'DELETE' }); toast({ title: 'Sucesso', description: 'Usuário removido.' }); };
  const updateUserStatus = async (user: UserProfile, status: UserStatus) => { await updateUser(user.key, { status }); toast({ title: 'Usuário Atualizado!', description: `O status de ${user.name} foi alterado para ${status}.` }); };
  const updateUserRole = async (key: string, role: UserRole) => { await updateUser(key, { role }); toast({ title: 'Função Atualizada!', description: `A função do usuário foi alterada para ${role}.` }); };
  const addOrUpdateCustomer = async (data: CustomerData) => { if (data.id) { await fetchAPI(`/api/customers/${data.id}`, { method: 'PUT', body: JSON.stringify(data) }); } else { await fetchAPI('/api/customers', { method: 'POST', body: JSON.stringify(data) }); } };
  const deleteCustomer = async (customerId: string) => { await fetchAPI(`/api/customers/${customerId}`, { method: 'DELETE' }); toast({ variant: 'destructive', title: 'Cliente Removido!', description: 'O cliente foi removido com sucesso.' }); };
  const transformProductForm = (data: ProductFormValues): Omit<Product, 'id' | 'isAvailable'> => { if (data.category === 'Pizza') return { name: data.name, category: 'Pizza', description: data.description, sizes: data.pizzaSizes }; if (data.category === 'Bebida') { const sizes = data.drinkSizes?.reduce((acc, v) => (v.name && v.price ? { ...acc, [v.name]: v.price } : acc), {}); return { name: data.name, category: 'Bebida', sizes }; } return { name: data.name, category: 'Adicional', price: data.price }; };
  const addProduct = async (data: ProductFormValues) => { await fetchAPI('/api/products', { method: 'POST', body: JSON.stringify({ ...transformProductForm(data), isAvailable: true }) }); toast({ title: 'Sucesso!', description: 'Produto adicionado.' }); };
  const updateProduct = async (id: string, data: ProductFormValues) => { await fetchAPI(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(transformProductForm(data)) }); toast({ title: 'Sucesso!', description: 'Produto atualizado.' }); };
  const toggleProductAvailability = async (id: string, isAvailable: boolean) => { await fetchAPI(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify({ isAvailable }) }); };
  const deleteProduct = async (id: string) => { await fetchAPI(`/api/products/${id}`, { method: 'DELETE' }); toast({ variant: 'destructive', title: 'Sucesso!', description: 'Produto removido.' }); };
  const calculateOrderTotal = (items: AddOrderFormValues['items']): number => { return items.reduce((acc, item) => { const product = rawProducts.find(p => p.id === item.productId); if (!product) return acc; let price = 0; if (item.isHalfHalf && item.product2Id) { const product2 = rawProducts.find(p => p.id === item.product2Id); const price1 = (item.size && product.sizes) ? product.sizes[item.size as PizzaSize] : 0; const price2 = (item.size && product2?.sizes) ? product2.sizes[item.size as PizzaSize] : 0; price = Math.max(price1, price2); } else { price = (item.size && product.sizes) ? product.sizes[item.size as PizzaSize] : (product.price || 0); } return acc + (price * item.quantity); }, 0); };
  const transformOrderItems = (items: AddOrderFormValues['items']): OrderItem[] => { return items.map(item => { const product1 = rawProducts.find(p => p.id === item.productId); let productName = product1?.name || 'Produto não encontrado'; if (item.isHalfHalf && item.product2Id) { const product2 = rawProducts.find(p => p.id === item.product2Id); productName = `Meio a Meio: ${product1?.name.replace('Pizza ', '')} / ${product2?.name.replace('Pizza ', '')}`; } return { ...item, productName: productName, }; }); };
  const findOrCreateCustomer = async (name: string, phone: string | undefined): Promise<Customer | undefined> => { if (!phone) return undefined; const normalizedPhone = phone.replace(/\D/g, ''); const existingCustomer = rawCustomers.find(c => c.phone === normalizedPhone); if (existingCustomer) return existingCustomer; const newCustomerData: CustomerData = { name, phone: normalizedPhone }; const newCustomer = await fetchAPI('/api/customers', { method: 'POST', body: JSON.stringify(newCustomerData) }); return newCustomer; };
  const addOrder = async (data: AddOrderFormValues): Promise<Order | null> => { try { const customer = await findOrCreateCustomer(data.customerName, data.customerPhone); const total = calculateOrderTotal(data.items); const payload = { ...data, items: transformOrderItems(data.items), total, customerId: customer?.id }; const newOrder = await fetchAPI('/api/orders', { method: 'POST', body: JSON.stringify(payload) }); toast({ title: 'Sucesso!', description: 'Pedido adicionado.' }); return newOrder; } catch (e: any) { toast({ variant: 'destructive', title: 'Erro!', description: `Não foi possível criar o pedido: ${e.message}` }); return null; } };
  const updateOrder = async (orderId: string, data: AddOrderFormValues) => { const total = calculateOrderTotal(data.items); const customer = await findOrCreateCustomer(data.customerName, data.customerPhone); const payload = { ...data, items: transformOrderItems(data.items), total, customerId: customer?.id }; await fetchAPI(`/api/orders/${orderId}`, { method: 'PUT', body: JSON.stringify(payload) }); toast({ title: 'Sucesso!', description: 'Pedido atualizado.' }); };
  const advanceOrderStatus = async (orderId: string) => { const order = rawOrders.find((o) => o.id === orderId); if (!order) return; let nextStatus: OrderStatus | undefined; if (order.status === 'Em Entrega') { nextStatus = 'Entregue'; } else { const currentIndex = kanbanStatuses.map(s => s.status).indexOf(order.status); if (currentIndex >= 0 && currentIndex < kanbanStatuses.length - 1) { nextStatus = kanbanStatuses[currentIndex + 1].status; } } if (order.status === 'Pronto' && order.orderType === 'retirada') { nextStatus = 'Entregue'; } if (nextStatus) { await fetchAPI(`/api/orders/${orderId}`, { method: 'PUT', body: JSON.stringify({ status: nextStatus }) }); toast({ title: 'Status do Pedido Atualizado!' }); } };
  const cancelOrder = async (orderId: string) => { await fetchAPI(`/api/orders/${orderId}`, { method: 'PUT', body: JSON.stringify({ status: 'Cancelado' }) }); toast({ title: 'Pedido Cancelado' }); };
  const deleteAllOrders = async () => { await fetchAPI('/api/orders/delete-all', { method: 'DELETE' }); toast({ title: 'Sucesso!', description: 'Todos os pedidos foram arquivados.' }); };
  
  return (
    <UserContext.Provider value={{ currentUser, authToken, isLoading, users: rawUsers, customers: aggregatedCustomers, products: rawProducts, orders: rawOrders, notifications, orderStatuses, getAuthToken, markNotificationsAsRead, login, logout, registerUser, updateUser, deleteUser, updateUserStatus, updateUserRole, addOrUpdateCustomer, deleteCustomer, toggleProductAvailability, addProduct, updateProduct, deleteProduct, addOrder, updateOrder, cancelOrder, advanceOrderStatus, deleteAllOrders }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) throw new Error('useUser must be used within a UserProvider');
  return context;
}
