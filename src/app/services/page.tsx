'use client';

import { ServiceCategory, ServiceType } from '@/types/booking';
import SquishyCard from '@/components/ui/squishy-card';

const SERVICE_CATEGORIES: ServiceCategory[] = [
    {
        id: '1',
        name: 'Deep Cleaning',
        icon: '🧹',
        description: 'Complete home deep cleaning including kitchen, bathroom, and living areas.',
        basePrice: 1999
    },
    {
        id: '2',
        name: 'Plumbing',
        icon: '🚰',
        description: 'Fix leaks, install taps, clear blockages, and general plumbing repairs.',
        basePrice: 499
    },
    {
        id: '3',
        name: 'Electrician',
        icon: '⚡',
        description: 'Wiring, switch repair, fan installation, and electrical fault fixing.',
        basePrice: 399
    },
    {
        id: '4',
        name: 'Painting',
        icon: '🎨',
        description: 'Interior and exterior wall painting with expert finish.',
        basePrice: 5000
    },
    {
        id: '5',
        name: 'Carpentry',
        icon: '🪑',
        description: 'Furniture repair, door installation, and custom woodwork.',
        basePrice: 599
    },
    {
        id: '6',
        name: 'Appliance Repair',
        icon: '🔧',
        description: 'Repair for washing machines, refrigerators, microwaves, and more.',
        basePrice: 699
    },
    {
        id: '7',
        name: 'Pest Control',
        icon: '🕷️',
        description: 'Safe and effective treatment for cockroaches, ants, termites, and bugs.',
        basePrice: 899
    },
    {
        id: '8',
        name: 'AC Service',
        icon: '❄️',
        description: 'AC cleaning, gas refilling, and performance optimization.',
        basePrice: 799
    }
];

export default function ServicesPage() {
    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold font-[family-name:var(--font-display)]">Our Services</h1>
                <p className="text-white/80 max-w-2xl mx-auto">
                    Professional home services at your doorstep. Verified experts, transparent pricing.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {SERVICE_CATEGORIES.map((service, index) => (
                    <SquishyCard key={service.id} service={service} />
                ))}
            </div>
        </div>
    );
}
