export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  role?: 'user' | 'admin';
}

export interface Property {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  property_type: 'house' | 'room' | 'barraca' | 'land' | 'commercial' | 'warehouse';
  listing_type: 'rent' | 'sale';
  city: string;
  district: string;
  neighborhood: string;
  latitude?: number;
  longitude?: number;
  photos: string[];
  contact_phone: string;
  contact_whatsapp?: string;
  is_premium: boolean;
  is_approved: boolean;
  is_featured: boolean;
  view_count: number;
  status: 'active' | 'pending' | 'approved' | 'rejected' | 'deleted';
  created_at: string;
  updated_at: string;
  user_profiles?: {
    username: string;
    email: string;
  };
}

export interface Favorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  property_id: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  property_id?: string;
  message_text?: string;
  image_url?: string;
  location_lat?: number;
  location_lng?: number;
  is_read: boolean;
  created_at: string;
}

export interface SearchFilters {
  city?: string;
  district?: string;
  neighborhood?: string;
  property_type?: string;
  listing_type?: string;
  min_price?: number;
  max_price?: number;
  with_photos?: boolean;
  keyword?: string;
}
