import fs from 'fs';
import path from 'path';
import { Booking, BookingRequest, BookingStatus } from '@/types/booking';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'bookings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Ensure DB file exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

export function getBookings(): Booking[] {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading bookings:', error);
        return [];
    }
}

export function saveBooking(request: BookingRequest): Booking {
    const bookings = getBookings();

    const newBooking: Booking = {
        id: `BK-${1000 + bookings.length + 1}`,
        userId: 'guest-user', // Simplified for demo
        serviceType: request.serviceType,
        status: 'Confirmed', // Default status for new AI bookings
        urgency: request.urgency,
        description: request.description,
        location: request.location,
        createdAt: new Date().toISOString(),
        scheduledDate: request.date || new Date(Date.now() + 86400000).toISOString(),
        price: estimatePrice(request.serviceType),
        otp: String(Math.floor(1000 + Math.random() * 9000)) // Random 4-digit OTP
    };

    bookings.unshift(newBooking); // Add to beginning of list

    fs.writeFileSync(DB_FILE, JSON.stringify(bookings, null, 2));

    return newBooking;
}

function estimatePrice(serviceType: string): number {
    const prices: Record<string, number> = {
        'Deep Cleaning': 1999,
        'Plumbing': 499,
        'Electrician': 399,
        'Painting': 5000,
        'Carpentry': 599,
        'Appliance Repair': 699,
        'Pest Control': 899,
        'AC Service': 799
    };
    return prices[serviceType] || 500;
}

export function deleteBookings(ids: string[]): void {
    let bookings = getBookings();
    bookings = bookings.filter(b => !ids.includes(b.id));
    fs.writeFileSync(DB_FILE, JSON.stringify(bookings, null, 2));
}
