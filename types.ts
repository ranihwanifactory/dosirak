export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: 'premium' | 'regular' | 'diet';
  calories?: number;
  available: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
  address: string;
  contact: string;
  deliveryDate: string; // YYYY-MM-DD
  deliveryTime: 'lunch' | 'dinner';
  createdAt: number; // Timestamp
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
}

export const ADMIN_EMAIL = 'acehwan69@gmail.com';