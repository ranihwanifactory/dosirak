import React, { useState, useEffect, useMemo } from 'react';
import { 
  Menu, ShoppingBag, User, LogOut, Plus, Trash2, Edit, 
  CheckCircle, Truck, Utensils, X, ChevronRight, BarChart3, Home,
  Leaf, Info, Loader2, Calendar, Clock
} from 'lucide-react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  User as FirebaseUser,
  AuthError
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  where
} from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

import { auth, googleProvider, db } from './firebase';
import { MenuItem, CartItem, UserProfile, ADMIN_EMAIL, Order } from './types';

// --- Utils ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
};

// --- Components ---

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000); // Increased duration for error reading
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 z-50 flex items-center ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
      <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// --- Pages ---

const HeroSection = ({ onOrderNow }: { onOrderNow: () => void }) => (
  <div className="relative bg-brand-900 overflow-hidden">
    <div className="absolute inset-0">
      <img 
        src="https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" 
        alt="Delicious Korean Food" 
        className="w-full h-full object-cover opacity-30"
      />
    </div>
    <div className="relative max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 text-center sm:text-left">
      <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
        <span className="block">건강하고 맛있는</span>
        <span className="block text-brand-500">도시락 딜라이트</span>
      </h1>
      <p className="mt-3 text-base text-gray-300 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-0 md:mt-5 md:text-xl">
        신선한 재료와 균형 잡힌 영양, 집밥 같은 정성을 담았습니다. 매일 새로운 도시락을 간편하게 주문해보세요.
      </p>
      
      {/* Delivery Info Banner */}
      <div className="mt-6 inline-flex flex-col sm:flex-row bg-black/40 backdrop-blur-sm rounded-lg p-4 text-white border border-white/20">
        <div className="flex items-center mr-6 mb-2 sm:mb-0">
          <Clock className="w-5 h-5 text-brand-500 mr-2" />
          <span className="font-semibold mr-2">점심 배송:</span> 11:00 ~ 12:00
        </div>
        <div className="flex items-center">
          <Clock className="w-5 h-5 text-brand-500 mr-2" />
          <span className="font-semibold mr-2">저녁 배송:</span> 17:00 ~ 18:00
        </div>
      </div>

      <div className="mt-8 sm:mt-10 sm:flex sm:justify-start">
        <div className="rounded-md shadow">
          <button
            onClick={onOrderNow}
            className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 md:py-4 md:text-lg md:px-10 transition-all"
          >
            메뉴 보기
          </button>
        </div>
      </div>
    </div>
  </div>
);

const MenuList = ({ 
  user, 
  menus, 
  addToCart,
  isAdmin
}: { 
  user: UserProfile | null, 
  menus: MenuItem[], 
  addToCart: (item: MenuItem) => void,
  isAdmin: boolean
}) => {
  const [filter, setFilter] = useState<'all' | 'premium' | 'regular' | 'diet'>('all');

  const filteredMenus = useMemo(() => {
    return filter === 'all' ? menus : menus.filter(m => m.category === filter);
  }, [menus, filter]);

  const categoryLabels: Record<string, string> = {
    all: '전체',
    premium: '프리미엄',
    regular: '일반',
    diet: '다이어트'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">오늘의 메뉴</h2>
          <p className="mt-2 text-gray-600">매일 신선하게 준비되는 도시락을 만나보세요.</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2 overflow-x-auto pb-2 md:pb-0">
          {(['all', 'premium', 'regular', 'diet'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === cat 
                  ? 'bg-brand-600 text-white' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {filteredMenus.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <Utensils className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">등록된 메뉴가 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">나중에 다시 확인해주세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMenus.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden border border-gray-100 flex flex-col">
              <div className="h-48 w-full relative bg-gray-200">
                <img 
                  src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/300`} 
                  alt={item.name} 
                  className="w-full h-full object-cover"
                />
                {!item.available && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">매진</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                    item.category === 'premium' ? 'bg-amber-100 text-amber-800' :
                    item.category === 'diet' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {categoryLabels[item.category]}
                  </span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
                  <span className="text-lg font-semibold text-brand-600">{formatCurrency(item.price)}</span>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">{item.description}</p>
                
                {item.calories && (
                  <div className="flex items-center text-xs text-gray-500 mb-4">
                    <Leaf className="w-4 h-4 mr-1 text-green-500" />
                    {item.calories} kcal
                  </div>
                )}

                <button
                  onClick={() => addToCart(item)}
                  disabled={!item.available}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  장바구니 담기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CartDrawer = ({ 
  cart, 
  isOpen, 
  onClose, 
  updateQuantity, 
  removeFromCart, 
  onCheckout 
}: { 
  cart: CartItem[], 
  isOpen: boolean, 
  onClose: () => void,
  updateQuantity: (id: string, delta: number) => void,
  removeFromCart: (id: string) => void,
  onCheckout: () => void
}) => {
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md">
          <div className="h-full flex flex-col bg-white shadow-xl">
            <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-medium text-gray-900">장바구니</h2>
                <div className="ml-3 h-7 flex items-center">
                  <button onClick={onClose} className="-m-2 p-2 text-gray-400 hover:text-gray-500">
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="mt-8">
                {cart.length === 0 ? (
                  <div className="text-center py-10">
                    <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-gray-500">장바구니가 비어있습니다</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {cart.map((item) => (
                      <li key={item.id} className="py-6 flex">
                        <div className="flex-shrink-0 w-24 h-24 border border-gray-200 rounded-md overflow-hidden">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-center object-cover" />
                        </div>
                        <div className="ml-4 flex-1 flex flex-col">
                          <div>
                            <div className="flex justify-between text-base font-medium text-gray-900">
                              <h3>{item.name}</h3>
                              <p className="ml-4">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                          </div>
                          <div className="flex-1 flex items-end justify-between text-sm">
                            <div className="flex items-center border rounded-md">
                              <button 
                                onClick={() => updateQuantity(item.id, -1)}
                                className="px-2 py-1 hover:bg-gray-100 disabled:text-gray-300"
                                disabled={item.quantity <= 1}
                              >-</button>
                              <span className="px-2">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, 1)}
                                className="px-2 py-1 hover:bg-gray-100"
                              >+</button>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => removeFromCart(item.id)}
                              className="font-medium text-brand-600 hover:text-brand-500 flex items-center"
                            >
                              <Trash2 className="w-4 h-4 mr-1" /> 삭제
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {cart.length > 0 && (
              <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
                <div className="flex justify-between text-base font-medium text-gray-900">
                  <p>소계</p>
                  <p>{formatCurrency(total)}</p>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">배송비는 결제 시 계산됩니다.</p>
                <div className="mt-6">
                  <button
                    onClick={onCheckout}
                    className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-600 hover:bg-brand-700"
                  >
                    주문하기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckoutModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  total 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSubmit: (details: { address: string, contact: string, deliveryDate: string, deliveryTime: 'lunch' | 'dinner' }) => void, 
  total: number 
}) => {
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState<'lunch'|'dinner'>('lunch');

  // Set default date to tomorrow
  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDeliveryDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <Truck className="h-6 w-6 text-green-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">배송 정보 입력</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  총 결제 금액: <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-6 space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700">배송 희망일</label>
                 <input 
                   type="date" 
                   required
                   min={new Date().toISOString().split('T')[0]}
                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                   value={deliveryDate}
                   onChange={(e) => setDeliveryDate(e.target.value)}
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700">배송 시간</label>
                 <select
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value as 'lunch' | 'dinner')}
                 >
                   <option value="lunch">점심 (11:00 ~ 12:00)</option>
                   <option value="dinner">저녁 (17:00 ~ 18:00)</option>
                 </select>
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700">배송지 주소</label>
               <input 
                 type="text" 
                 required
                 className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                 placeholder="서울시 강남구 테헤란로 123"
                 value={address}
                 onChange={(e) => setAddress(e.target.value)}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700">연락처</label>
               <input 
                 type="tel" 
                 required
                 className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                 placeholder="010-1234-5678"
                 value={contact}
                 onChange={(e) => setContact(e.target.value)}
               />
             </div>
          </div>
          <div className="mt-5 sm:mt-6 flex gap-3">
             <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none sm:text-sm disabled:bg-gray-400"
              onClick={() => onSubmit({ address, contact, deliveryDate, deliveryTime })}
              disabled={!address || !contact || !deliveryDate}
            >
              주문 완료
            </button>
             <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
              onClick={onClose}
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Admin Section ---

const AdminDashboard = ({ menus, orders, onAddMenu, onDeleteMenu, onUpdateStatus }: {
  menus: MenuItem[],
  orders: Order[],
  onAddMenu: (item: Omit<MenuItem, 'id'>) => void,
  onDeleteMenu: (id: string) => void,
  onUpdateStatus: (orderId: string, status: Order['status']) => void
}) => {
  const [activeTab, setActiveTab] = useState<'menus' | 'orders'>('menus');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMenu, setNewMenu] = useState<Partial<MenuItem>>({
    name: '', description: '', price: 0, category: 'regular', available: true
  });

  const chartData = useMemo(() => {
    // Simple mock stats from real orders
    const stats: Record<string, number> = {};
    orders.forEach(o => {
      const date = new Date(o.createdAt).toLocaleDateString('ko-KR', { weekday: 'short' });
      stats[date] = (stats[date] || 0) + o.totalAmount;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMenu.name && newMenu.price) {
      onAddMenu({
        name: newMenu.name!,
        description: newMenu.description || '',
        price: Number(newMenu.price),
        category: newMenu.category as any || 'regular',
        available: newMenu.available ?? true,
        imageUrl: newMenu.imageUrl || `https://picsum.photos/400/300?random=${Math.random()}`,
        calories: newMenu.calories
      });
      setIsAddModalOpen(false);
      setNewMenu({ name: '', description: '', price: 0, category: 'regular', available: true });
    }
  };

  const statusLabels: Record<string, string> = {
    pending: '접수대기',
    preparing: '준비중',
    delivering: '배달중',
    completed: '완료됨',
    cancelled: '취소됨'
  };

  const categoryLabels: Record<string, string> = {
    premium: '프리미엄',
    regular: '일반',
    diet: '다이어트'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-900">관리자 대시보드</h2>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <div className="bg-gray-100 p-1 rounded-lg flex space-x-1">
            <button
              onClick={() => setActiveTab('menus')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'menus' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-900'}`}
            >
              메뉴 관리
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'orders' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-900'}`}
            >
              주문 현황
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'menus' ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              새 메뉴 추가
            </button>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {menus.map((item) => (
                <li key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center">
                    <img className="h-10 w-10 rounded-full object-cover" src={item.imageUrl} alt="" />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-brand-600">{item.name}</div>
                      <div className="text-sm text-gray-500">{formatCurrency(item.price)} • {categoryLabels[item.category] || item.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.available ? '판매중' : '품절'}
                    </span>
                    <button onClick={() => onDeleteMenu(item.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chart Section */}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4">주간 매출 요약</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    cursor={{fill: '#f3f4f6'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => [formatCurrency(value), '매출']}
                  />
                  <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
             <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
               <h3 className="text-lg leading-6 font-medium text-gray-900">최근 주문</h3>
             </div>
             <ul className="divide-y divide-gray-200">
               {orders.length === 0 ? (
                 <li className="px-6 py-4 text-center text-gray-500">주문 내역이 없습니다</li>
               ) : (
                 orders.map((order) => (
                   <li key={order.id} className="p-6 hover:bg-gray-50">
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">주문번호 #{order.id.slice(-6)}</span>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span className="mr-2">{order.deliveryDate}</span>
                          <Clock className="w-3 h-3 mr-1" />
                          <span>{order.deliveryTime === 'lunch' ? '점심' : '저녁'}</span>
                        </div>
                     </div>
                     <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{order.userEmail}</p>
                          <p className="text-sm text-gray-500">{order.address}</p>
                          <p className="text-sm text-gray-500">{order.contact}</p>
                          <div className="mt-2 text-sm text-gray-600">
                            {order.items.map(i => `${i.name} ${i.quantity}개`).join(', ')}
                          </div>
                        </div>
                        <div className="text-right">
                           <p className="text-lg font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                           <select
                              value={order.status}
                              onChange={(e) => onUpdateStatus(order.id, e.target.value as any)}
                              className={`mt-2 block w-full pl-3 pr-8 py-1 text-xs border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md ${
                                order.status === 'completed' ? 'text-green-600 font-bold' : 
                                order.status === 'pending' ? 'text-amber-600 font-bold' : ''
                              }`}
                           >
                             <option value="pending">접수대기</option>
                             <option value="preparing">준비중</option>
                             <option value="delivering">배달중</option>
                             <option value="completed">완료됨</option>
                             <option value="cancelled">취소됨</option>
                           </select>
                        </div>
                     </div>
                   </li>
                 ))
               )}
             </ul>
          </div>
        </div>
      )}

      {/* Add Menu Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">새 메뉴 추가</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <input 
                placeholder="메뉴명" 
                required 
                className="w-full border p-2 rounded" 
                value={newMenu.name}
                onChange={e => setNewMenu({...newMenu, name: e.target.value})}
              />
              <textarea 
                placeholder="설명" 
                required 
                className="w-full border p-2 rounded"
                value={newMenu.description}
                onChange={e => setNewMenu({...newMenu, description: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" 
                  placeholder="가격 (원)" 
                  required 
                  className="w-full border p-2 rounded"
                  value={newMenu.price || ''}
                  onChange={e => setNewMenu({...newMenu, price: parseFloat(e.target.value)})}
                />
                <input 
                  type="number" 
                  placeholder="칼로리 (kcal)" 
                  className="w-full border p-2 rounded"
                  value={newMenu.calories || ''}
                  onChange={e => setNewMenu({...newMenu, calories: parseFloat(e.target.value)})}
                />
              </div>
              <select 
                className="w-full border p-2 rounded"
                value={newMenu.category}
                onChange={e => setNewMenu({...newMenu, category: e.target.value as any})}
              >
                <option value="regular">일반</option>
                <option value="premium">프리미엄</option>
                <option value="diet">다이어트</option>
              </select>
              <input 
                placeholder="이미지 URL (선택사항)" 
                className="w-full border p-2 rounded"
                value={newMenu.imageUrl || ''}
                onChange={e => setNewMenu({...newMenu, imageUrl: e.target.value})}
              />
              <div className="flex gap-2 justify-end mt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">취소</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700">추가하기</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activePage, setActivePage] = useState<'home' | 'menu' | 'admin'>('home');
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.email);
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isAdmin: firebaseUser.email === ADMIN_EMAIL
        });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Menus
  useEffect(() => {
    const q = query(collection(db, 'menus'), orderBy('category'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
      setMenus(items);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Orders (Admin Only)
  useEffect(() => {
    if (user?.isAdmin) {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(items);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Auth Actions
  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // State updates via onAuthStateChanged
    } catch (error: any) {
      console.error("Login failed:", error);
      let msg = "로그인에 실패했습니다.";
      
      // Known Firebase error codes
      if (error.code === 'auth/popup-closed-by-user') {
        msg = "로그인 창이 닫혔습니다.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        msg = "다른 로그인 팝업이 이미 열려있습니다.";
      } else if (error.code === 'auth/popup-blocked') {
        msg = "팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.";
      } else if (error.code === 'auth/operation-not-allowed') {
        msg = "구글 로그인이 활성화되지 않았습니다. Firebase Console에서 Google 로그인을 사용 설정해주세요.";
      } else if (error.code === 'auth/unauthorized-domain') {
        msg = "승인되지 않은 도메인입니다. Firebase Console에서 도메인을 추가해주세요.";
      } else if (error.message) {
        msg = `로그인 오류: ${error.message}`;
      }
      
      setToast({ msg, type: 'error' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setCart([]);
    setActivePage('home');
    setToast({ msg: "로그아웃 되었습니다.", type: 'success' });
  };

  // Cart Actions
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setToast({ msg: `${item.name} 장바구니에 담김`, type: 'success' });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  // Order Action
  const handleCheckout = async ({ address, contact, deliveryDate, deliveryTime }: { address: string, contact: string, deliveryDate: string, deliveryTime: 'lunch' | 'dinner' }) => {
    if (!user) {
      setToast({ msg: "주문하려면 로그인이 필요합니다", type: 'error' });
      handleLogin();
      return;
    }

    try {
      const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const orderData: Omit<Order, 'id'> = {
        userId: user.uid,
        userEmail: user.email || '알 수 없음',
        items: cart,
        totalAmount,
        status: 'pending',
        address,
        contact,
        deliveryDate,
        deliveryTime,
        createdAt: Date.now()
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      setToast({ msg: "주문이 완료되었습니다!", type: 'success' });
    } catch (error) {
      console.error(error);
      setToast({ msg: "주문 처리에 실패했습니다", type: 'error' });
    }
  };

  // Admin Actions
  const addMenu = async (item: Omit<MenuItem, 'id'>) => {
    try {
      await addDoc(collection(db, 'menus'), item);
      setToast({ msg: "메뉴가 추가되었습니다", type: 'success' });
    } catch (e) {
      setToast({ msg: "메뉴 추가 실패", type: 'error' });
    }
  };

  const deleteMenu = async (id: string) => {
    if(!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, 'menus', id));
      setToast({ msg: "메뉴가 삭제되었습니다", type: 'success' });
    } catch (e) {
      setToast({ msg: "메뉴 삭제 실패", type: 'error' });
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      setToast({ msg: "주문 상태가 변경되었습니다", type: 'success' });
    } catch (e) {
      setToast({ msg: "상태 변경 실패", type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={() => setActivePage('home')}>
              <Utensils className="h-8 w-8 text-brand-600" />
              <span className="ml-2 text-xl font-bold text-gray-900 tracking-tight">도시락<span className="text-brand-600">딜라이트</span></span>
            </div>
            
            <div className="hidden md:flex space-x-8 items-center">
              <button onClick={() => setActivePage('home')} className={`${activePage === 'home' ? 'text-brand-600' : 'text-gray-500'} hover:text-gray-900 font-medium`}>홈</button>
              <button onClick={() => setActivePage('menu')} className={`${activePage === 'menu' ? 'text-brand-600' : 'text-gray-500'} hover:text-gray-900 font-medium`}>메뉴</button>
              {user?.isAdmin && (
                <button onClick={() => setActivePage('admin')} className={`${activePage === 'admin' ? 'text-brand-600' : 'text-gray-500'} hover:text-gray-900 font-medium`}>관리자</button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-gray-400 hover:text-brand-600 transition-colors">
                <ShoppingBag className="h-6 w-6" />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                )}
              </button>

              {user ? (
                <div className="flex items-center space-x-3">
                   {user.photoURL ? (
                     <img src={user.photoURL} alt="User" className="h-8 w-8 rounded-full" />
                   ) : (
                     <User className="h-6 w-6 text-gray-400" />
                   )}
                   <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-gray-900">
                     <LogOut className="h-5 w-5" />
                   </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin} 
                  disabled={isLoggingIn}
                  className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingIn && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isLoggingIn ? '로그인 중...' : '로그인'}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        {activePage === 'home' && (
          <div>
            <HeroSection onOrderNow={() => setActivePage('menu')} />
            {/* Features Snippet */}
            <div className="py-12 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="lg:text-center">
                  <h2 className="text-base text-brand-600 font-semibold tracking-wide uppercase">Why Choose Us</h2>
                  <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                    더 맛있는 점심, 더 행복한 하루
                  </p>
                </div>

                <div className="mt-10">
                  <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
                    {[
                      { title: '신선한 재료', icon: Leaf, desc: '엄선된 로컬 식재료와 프리미엄 육류를 사용합니다.' },
                      { title: '빠른 배송', icon: Truck, desc: '점심시간 전, 약속된 시간에 정확히 도착합니다.' },
                      { title: '영양 균형', icon: CheckCircle, desc: '전문 영양사가 설계한 균형 잡힌 식단입니다.' },
                    ].map((feature) => (
                      <div key={feature.title} className="relative">
                        <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-brand-500 text-white">
                          <feature.icon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{feature.title}</p>
                        <p className="mt-2 ml-16 text-base text-gray-500">{feature.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activePage === 'menu' && (
          <MenuList 
            user={user} 
            menus={menus} 
            addToCart={addToCart} 
            isAdmin={!!user?.isAdmin}
          />
        )}

        {activePage === 'admin' && user?.isAdmin && (
          <AdminDashboard 
            menus={menus} 
            orders={orders} 
            onAddMenu={addMenu}
            onDeleteMenu={deleteMenu}
            onUpdateStatus={updateOrderStatus}
          />
        )}
        
        {activePage === 'admin' && !user?.isAdmin && (
           <div className="flex flex-col items-center justify-center h-96">
             <Info className="h-16 w-16 text-gray-300 mb-4" />
             <h3 className="text-xl font-medium text-gray-900">접근 거부</h3>
             <p className="text-gray-500 mt-2">이 페이지를 볼 수 있는 권한이 없습니다.</p>
             <button onClick={() => setActivePage('home')} className="mt-4 text-brand-600 hover:underline">홈으로 돌아가기</button>
           </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
             <Utensils className="h-6 w-6 text-brand-500 mr-2" />
             <span className="font-bold text-lg">도시락 딜라이트</span>
          </div>
          <div className="text-gray-400 text-sm">
            © 2024 Dosirak Delight. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Overlays */}
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cart={cart}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        onCheckout={() => setIsCheckoutOpen(true)}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSubmit={handleCheckout}
        total={cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
      />

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;