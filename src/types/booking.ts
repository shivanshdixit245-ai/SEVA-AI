export type ServiceType =
    | 'Deep Cleaning'
    | 'Plumbing'
    | 'Electrician'
    | 'Painting'
    | 'Carpentry'
    | 'Appliance Repair'
    | 'Pest Control'
    | 'AC Service';

export type UrgencyLevel = 'Normal' | 'Urgent' | 'Emergency';

export type BookingStatus = 'Pending' | 'pending_acceptance' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';

export interface BookingRequest {
    serviceType: ServiceType;
    description: string;
    location: string;
    urgency: UrgencyLevel;
    confidence?: number;
    date?: string;
    latitude?: number;
    longitude?: number;
}

export interface Booking {
    id: string;
    userId: string;
    serviceType: ServiceType;
    status: BookingStatus;
    urgency: UrgencyLevel;
    description: string;
    location: string;
    createdAt: string;
    scheduledDate: string;
    helperId?: string;
    workerId?: string; // ID of the worker who accepted
    price?: number;
    otp?: string;
    latitude?: number;
    longitude?: number;
    liveLat?: number;
    liveLng?: number;
    acceptedAt?: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    isBooking?: boolean;
    bookingData?: BookingRequest;
    timestamp: number;
}

export interface Review {
    id: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    date: string;
}

export interface Helper {
    _id?: string; // MongoDB ID
    id: string;   // Public ID (slug or custom ID)
    name: string;
    avatar: string;
    skills: ServiceType[];
    rating: number;
    completedJobs: number;
    isAvailable: boolean;
    location: string;
    description: string;
    reviews: Review[];
    experience: number; // Years of experience
    phone: string;
    supabaseId?: string; // Supabase Auth UUID
}

export interface ServiceCategory {
    id: string;
    name: ServiceType;
    icon: string;
    description: string;
    basePrice: number;
}
export interface DirectMessage {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: number;
    bookingId?: string;
    isRead?: boolean;
}
