
import { MongoClient } from 'mongodb';
import { Helper } from '@/types/booking';

const MONGODB_URI = process.env.MONGODB_URI!;

const INITIAL_HELPERS: Helper[] = [
    {
        id: 'rahul-sharma',
        name: 'Rahul Sharma',
        avatar: 'https://ui-avatars.com/api/?name=Rahul+Sharma&background=random',
        skills: ['Deep Cleaning', 'Pest Control'],
        rating: 4.8,
        completedJobs: 520,
        isAvailable: true,
        location: 'Sector 45, Gurgaon',
        experience: 5,
        phone: '+919876543210',
        description: 'Professional cleaner with 5 years of experience in deep home cleaning. Specialized in pest control services with eco-friendly products. Committed to delivering spotless results and customer satisfaction.',
        reviews: [
            { id: 'r1', userId: 'u1', userName: 'Amit K.', rating: 5, comment: 'Excellent service! Very thorough cleaning.', date: '2023-10-15' },
            { id: 'r2', userId: 'u2', userName: 'Priya S.', rating: 4, comment: 'Good job, but arrived slightly late.', date: '2023-09-20' }
        ]
    },
    {
        id: 'vikram-singh',
        name: 'Vikram Singh',
        avatar: 'https://ui-avatars.com/api/?name=Vikram+Singh&background=random',
        skills: ['Plumbing', 'Carpentry'],
        rating: 4.5,
        completedJobs: 310,
        isAvailable: false,
        location: 'DLF Phase 3',
        experience: 8,
        phone: '+919876543211',
        description: 'Expert plumber and carpenter. I handle everything from leaky faucets to custom furniture assembly. Known for quick diagnosis and durable repairs.',
        reviews: [
            { id: 'r3', userId: 'u3', userName: 'Rajesh G.', rating: 5, comment: 'Fixed the leak in minutes. Very professional.', date: '2023-11-01' }
        ]
    },
    {
        id: 'anita-desai',
        name: 'Anita Desai',
        avatar: 'https://ui-avatars.com/api/?name=Anita+Desai&background=random',
        skills: ['Painting', 'Deep Cleaning'],
        rating: 4.9,
        completedJobs: 800,
        isAvailable: true,
        location: 'Sohna Road',
        experience: 6,
        phone: '+919876543212',
        description: 'Detail-oriented painter and cleaner. I bring color to your walls and sparkle to your floors. Precision and cleanliness are my priorities.',
        reviews: [
            { id: 'r4', userId: 'u4', userName: 'Meera L.', rating: 5, comment: 'Amazing painting work! My living room looks brand new.', date: '2023-10-25' },
            { id: 'r5', userId: 'u5', userName: 'Sanjay M.', rating: 5, comment: 'Highly recommended for deep cleaning.', date: '2023-10-10' }
        ]
    },
    {
        id: 'suresh-kumar',
        name: 'Suresh Kumar',
        avatar: 'https://ui-avatars.com/api/?name=Suresh+Kumar&background=random',
        skills: ['Electrician', 'AC Service'],
        rating: 4.7,
        completedJobs: 450,
        isAvailable: true,
        location: 'Sector 56',
        experience: 10,
        phone: '+919876543213',
        description: 'Certified electrician and AC technician. 10 years of experience in residential and commercial electrical systems. Safety first approach.',
        reviews: [
            { id: 'r6', userId: 'u6', userName: 'Vivek R.', rating: 4, comment: 'Knowledgeable electrician. Solved a complex wiring issue.', date: '2023-09-15' }
        ]
    },
    {
        id: 'deepak-verma',
        name: 'Deepak Verma',
        avatar: 'https://ui-avatars.com/api/?name=Deepak+Verma&background=random',
        skills: ['Appliance Repair'],
        rating: 4.6,
        completedJobs: 200,
        isAvailable: true,
        location: 'Galleria Market',
        experience: 4,
        phone: '+919876543214',
        description: 'Specialist in home appliance repair. Washing machines, refrigerators, microwaves - I fix them all. Honest pricing and genuine parts.',
        reviews: [
            { id: 'r7', userId: 'u7', userName: 'Kavita P.', rating: 5, comment: 'Fixed my washing machine quickly. Very polite.', date: '2023-11-05' }
        ]
    }
];

export async function seedHelpers() {
    if (!MONGODB_URI) return;

    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db('sevaai');
        const collection = db.collection('helpers');

        const count = await collection.countDocuments();
        if (count === 0) {
            console.log('Seeding Helpers...');
            // @ts-expect-error - MongoDB types vs Frontend types mismatch for _id
            await collection.insertMany(INITIAL_HELPERS);
            console.log('Helpers seeded successfully!');
        }

        await client.close();
    } catch (error) {
        console.error('Error seeding helpers:', error);
    }
}
