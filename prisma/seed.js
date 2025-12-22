// Comprehensive Seed Script with Full Dummy Data
// Run with: npx prisma db seed

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database with full dummy data...\n');

    // ==========================================================================
    // 1. SEED TIME SLOTS (6 fixed)
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
    console.log('✓ Time slots seeded (6)');

    // ==========================================================================
    // 2. SEED ROOMS (2 labs)
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
    console.log('✓ Rooms seeded (2)');

    // ==========================================================================
    // 3. SEED USERS (Admin + Assistants + Students)
    // ==========================================================================
    const password = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    // Admin
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
    console.log('✓ Admin seeded:', admin.email);

    // Assistants (3)
    const assistantData = [
        { email: 'asst1@practicum.com', name: 'Budi Santoso' },
        { email: 'asst2@practicum.com', name: 'Siti Rahayu' },
        { email: 'asst3@practicum.com', name: 'Ahmad Wijaya' },
    ];

    const assistants = [];
    for (const a of assistantData) {
        const user = await prisma.user.upsert({
            where: { email: a.email },
            update: {},
            create: { ...a, password, is_admin: false },
        });
        assistants.push(user);
    }
    console.log('✓ Assistants seeded (3)');

    // Students (5)
    const studentData = [
        { email: 'student1@student.com', name: 'Andi Pratama' },
        { email: 'student2@student.com', name: 'Dewi Lestari' },
        { email: 'student3@student.com', name: 'Rizki Maulana' },
        { email: 'student4@student.com', name: 'Putri Ayu' },
        { email: 'student5@student.com', name: 'Fajar Hidayat' },
    ];

    const students = [];
    for (const s of studentData) {
        const user = await prisma.user.upsert({
            where: { email: s.email },
            update: {},
            create: { ...s, password, is_admin: false },
        });
        students.push(user);
    }
    console.log('✓ Students seeded (5)');

    // ==========================================================================
    // 4. SEED SEMESTER
    // ==========================================================================
    const semester = await prisma.semester.upsert({
        where: { id: 1 },
        update: { is_active: true },
        create: { name: 'Ganjil 2024/2025', is_active: true },
    });
    console.log('✓ Semester seeded:', semester.name);

    // ==========================================================================
    // 5. SEED COURSES (3)
    // ==========================================================================
    const courseData = [
        { code: 'IF101', name: 'Dasar Pemrograman' },
        { code: 'IF201', name: 'Struktur Data' },
        { code: 'IF301', name: 'Basis Data' },
    ];

    const courses = [];
    for (const c of courseData) {
        const course = await prisma.course.upsert({
            where: { code: c.code },
            update: c,
            create: c,
        });
        courses.push(course);
    }
    console.log('✓ Courses seeded (3)');

    // ==========================================================================
    // 6. SEED CLASSES (4 classes with different schedules)
    // ==========================================================================
    const fetchedSlots = await prisma.timeSlot.findMany();
    const fetchedRooms = await prisma.room.findMany();

    const classData = [
        { course_id: courses[0].id, name: 'Kelas A', quota: 30, day_of_week: 1, time_slot_id: fetchedSlots[0].id, room_id: fetchedRooms[0].id },
        { course_id: courses[0].id, name: 'Kelas B', quota: 30, day_of_week: 1, time_slot_id: fetchedSlots[0].id, room_id: fetchedRooms[1].id },
        { course_id: courses[1].id, name: 'Kelas A', quota: 25, day_of_week: 2, time_slot_id: fetchedSlots[1].id, room_id: fetchedRooms[0].id },
        { course_id: courses[2].id, name: 'Kelas A', quota: 25, day_of_week: 3, time_slot_id: fetchedSlots[2].id, room_id: fetchedRooms[1].id },
    ];

    const classes = [];
    for (const c of classData) {
        // Check if class exists
        const existing = await prisma.class.findFirst({
            where: { course_id: c.course_id, semester_id: semester.id, name: c.name }
        });

        if (existing) {
            classes.push(existing);
            continue;
        }

        const cls = await prisma.class.create({
            data: { ...c, semester_id: semester.id },
        });

        // Create 11 sessions
        for (let i = 1; i <= 11; i++) {
            await prisma.classSession.create({
                data: {
                    class_id: cls.id,
                    session_number: i,
                    topic: i === 11 ? 'Responsi' : `Pertemuan ${i}`,
                    type: i === 11 ? 'EXAM' : 'REGULAR',
                },
            });
        }
        classes.push(cls);
    }
    console.log('✓ Classes seeded (4) with 11 sessions each');

    // ==========================================================================
    // 7. ASSIGN ASSISTANTS TO CLASSES
    // ==========================================================================
    const assignments = [
        { class_id: classes[0].id, user_id: assistants[0].id },
        { class_id: classes[0].id, user_id: assistants[1].id },
        { class_id: classes[1].id, user_id: assistants[1].id },
        { class_id: classes[2].id, user_id: assistants[2].id },
        { class_id: classes[3].id, user_id: assistants[0].id },
    ];

    for (const a of assignments) {
        await prisma.classAssistant.upsert({
            where: { class_id_user_id: { class_id: a.class_id, user_id: a.user_id } },
            update: {},
            create: a,
        });
    }
    console.log('✓ Assistants assigned to classes');

    // ==========================================================================
    // 8. ENROLL STUDENTS IN CLASSES
    // ==========================================================================
    // Students 1-3 in Class 1, Student 4-5 in Class 2
    const enrollments = [
        { class_id: classes[0].id, user_id: students[0].id },
        { class_id: classes[0].id, user_id: students[1].id },
        { class_id: classes[0].id, user_id: students[2].id },
        { class_id: classes[1].id, user_id: students[3].id },
        { class_id: classes[1].id, user_id: students[4].id },
        { class_id: classes[2].id, user_id: students[0].id },
        { class_id: classes[2].id, user_id: students[1].id },
    ];

    for (const e of enrollments) {
        await prisma.enrollment.upsert({
            where: { class_id_user_id: { class_id: e.class_id, user_id: e.user_id } },
            update: {},
            create: e,
        });
    }
    console.log('✓ Students enrolled in classes');

    // ==========================================================================
    // 9. CREATE ATTENDANCE RECORDS (some with various statuses)
    // ==========================================================================
    const sessions = await prisma.classSession.findMany({
        where: { class_id: classes[0].id },
        orderBy: { session_number: 'asc' },
        take: 4,
    });

    // Create attendance for first 3 sessions for enrolled students
    for (let i = 0; i < 3; i++) {
        const session = sessions[i];
        for (let j = 0; j < 3; j++) {
            const student = students[j];
            const statuses = ['HADIR', 'HADIR', 'ALPHA'];
            const grades = [85 + j * 2, 90, null];

            await prisma.studentAttendance.upsert({
                where: {
                    enrollment_class_id_enrollment_user_id_session_id: {
                        enrollment_class_id: classes[0].id,
                        enrollment_user_id: student.id,
                        session_id: session.id,
                    },
                },
                update: {},
                create: {
                    enrollment_class_id: classes[0].id,
                    enrollment_user_id: student.id,
                    session_id: session.id,
                    status: statuses[i],
                    grade: statuses[i] === 'HADIR' ? grades[j] : null,
                    submitted_at: new Date(),
                    approved_by_id: assistants[0].id,
                    approved_at: new Date(),
                },
            });
        }
    }

    // Create PENDING attendance for session 4
    for (const student of [students[0], students[1]]) {
        await prisma.studentAttendance.upsert({
            where: {
                enrollment_class_id_enrollment_user_id_session_id: {
                    enrollment_class_id: classes[0].id,
                    enrollment_user_id: student.id,
                    session_id: sessions[3].id,
                },
            },
            update: {},
            create: {
                enrollment_class_id: classes[0].id,
                enrollment_user_id: student.id,
                session_id: sessions[3].id,
                status: 'PENDING',
                submitted_at: new Date(),
            },
        });
    }
    console.log('✓ Attendance records created');

    // ==========================================================================
    // 10. CREATE ASSISTANT ATTENDANCE (check-ins)
    // ==========================================================================
    for (const session of sessions.slice(0, 3)) {
        await prisma.assistantAttendance.upsert({
            where: { user_id_session_id: { user_id: assistants[0].id, session_id: session.id } },
            update: {},
            create: {
                user_id: assistants[0].id,
                session_id: session.id,
                status: 'HADIR',
            },
        });
    }
    console.log('✓ Assistant check-ins created');

    // ==========================================================================
    // SUMMARY
    // ==========================================================================
    console.log('\n' + '='.repeat(50));
    console.log('✅ DATABASE SEEDING COMPLETED!');
    console.log('='.repeat(50));
    console.log('\n📋 SEEDED DATA:');
    console.log('   • 6 Time Slots');
    console.log('   • 2 Rooms (PSI, SBTI)');
    console.log('   • 1 Admin + 3 Assistants + 5 Students');
    console.log('   • 1 Active Semester');
    console.log('   • 3 Courses');
    console.log('   • 4 Classes (11 sessions each)');
    console.log('   • Enrollments & Attendance Records');
    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log('   Admin:     admin@practicum.com / admin123');
    console.log('   Assistant: asst1@practicum.com / password123');
    console.log('   Student:   student1@student.com / password123');
    console.log('='.repeat(50));
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
