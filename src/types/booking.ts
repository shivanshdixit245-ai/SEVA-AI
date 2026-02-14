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

export type BookingStatus = 'Pending' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';

export interface BookingRequest {
    serviceType: ServiceType;
    description: string;
    location: string;
    urgency: UrgencyLevel;
    confidence?: number;
    date?: string;
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
    price?: number;
    otp?: string;
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
}

export interface ServiceCategory {
    id: string;
    name: ServiceType;
    icon: string;
    description: string;
    basePrice: number;
}
