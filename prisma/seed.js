// Seed script for TimeSlots and Rooms
// Run with: npx prisma db seed

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // ==========================================================================
    // Seed Time Slots (6 fixed slots)
    // ==========================================================================
    const timeSlots = [
        { slot_number: 1, start_time: '07:00', end_time: '08:40', label: 'Sesi 1 (07:00-08:40)' },
        { slot_number: 2, start_time: '08:45', end_time: '10:25', label: 'Sesi 2 (08:45-10:25)' },
        { slot_number: 3, start_time: '10:30', end_time: '12:10', label: 'Sesi 3 (10:30-12:10)' },
        { slot_number: 4, start_time: '12:30', end_time: '14:10', label: 'Sesi 4 (12:30-14:10)' },
        { slot_number: 5, start_time: '14:15', end_time: '16:05', label: 'Sesi 5 (14:15-16:05)' },
        { slot_number: 6, start_time: '16:10', end_time: '17:40', label: 'Sesi 6 (16:10-17:40)' },
    ];

    for (const slot of timeSlots) {
        await prisma.timeSlot.upsert({
            where: { slot_number: slot.slot_number },
            update: slot,
            create: slot,
        });
    }
    console.log('✓ Time slots seeded');

    // ==========================================================================
    // Seed Rooms (2 labs)
    // ==========================================================================
    const rooms = [
        { code: 'PSI', name: 'Laboratorium PSI' },
        { code: 'SBTI', name: 'Laboratorium SBTI' },
    ];

    for (const room of rooms) {
        await prisma.room.upsert({
            where: { code: room.code },
            update: room,
            create: room,
        });
    }
    console.log('✓ Rooms seeded');

    // ==========================================================================
    // Seed Admin User
    // ==========================================================================
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@practicum.com' },
        update: {},
        create: {
            email: 'admin@practicum.com',
            password: adminPassword,
            name: 'System Admin',
            is_admin: true,
        },
    });
    console.log('✓ Admin user seeded:', admin.email);

    // ==========================================================================
    // Seed Sample Semester
    // ==========================================================================
    const semester = await prisma.semester.upsert({
        where: { id: 1 },
        update: { is_active: true },
        create: {
            name: 'Ganjil 2024/2025',
            is_active: true,
        },
    });
    console.log('✓ Semester seeded:', semester.name);

    // ==========================================================================
    // Seed Sample Courses
    // ==========================================================================
    const courses = [
        { code: 'IF101', name: 'Dasar Pemrograman' },
        { code: 'IF201', name: 'Struktur Data' },
        { code: 'IF301', name: 'Basis Data' },
    ];

    for (const course of courses) {
        await prisma.course.upsert({
            where: { code: course.code },
            update: course,
            create: course,
        });
    }
    console.log('✓ Courses seeded');

    console.log('\n✅ Database seeding completed!');
    console.log('\nAdmin credentials:');
    console.log('  Email: admin@practicum.com');
    console.log('  Password: admin123');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
