/**
 * Optimized Seed Script for Practicum Attendance System
 * Uses batch operations for better performance
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
    console.log('🌱 Seeding database...\n');

    // Clean database
    console.log('⏳ Cleaning existing data...');
    try {
        await prisma.$executeRaw`TRUNCATE TABLE student_attendances, assistant_attendances, permission_requests, enrollments, class_assistants, class_sessions, classes, courses, semesters, rooms, time_slots, users RESTART IDENTITY CASCADE`;
    } catch (e) {
        // Tables might not exist yet, that's okay
        console.log('Note: Some tables may not exist yet, continuing...');
    }
    console.log('✓ Database cleaned\n');

    // 1. TIME SLOTS
    await prisma.timeSlot.createMany({
        data: [
            { slot_number: 1, start_time: '07:00', end_time: '08:40', label: 'Sesi 1 (07:00-08:40)' },
            { slot_number: 2, start_time: '08:50', end_time: '10:30', label: 'Sesi 2 (08:50-10:30)' },
            { slot_number: 3, start_time: '10:40', end_time: '12:20', label: 'Sesi 3 (10:40-12:20)' },
            { slot_number: 4, start_time: '13:00', end_time: '14:40', label: 'Sesi 4 (13:00-14:40)' },
            { slot_number: 5, start_time: '14:50', end_time: '16:30', label: 'Sesi 5 (14:50-16:30)' },
            { slot_number: 6, start_time: '16:40', end_time: '18:20', label: 'Sesi 6 (16:40-18:20)' },
        ]
    });
    const timeSlots = await prisma.timeSlot.findMany({ orderBy: { slot_number: 'asc' } });
    console.log('✓ Time Slots: 6');

    // 2. ROOMS
    await prisma.room.createMany({
        data: [
            { code: 'LAB-A', name: 'Laboratorium A' },
            { code: 'LAB-B', name: 'Laboratorium B' },
            { code: 'LAB-C', name: 'Laboratorium C' },
            { code: 'LAB-D', name: 'Laboratorium D' },
        ]
    });
    const rooms = await prisma.room.findMany({ orderBy: { code: 'asc' } });
    console.log('✓ Rooms: 4');

    // 3. SEMESTERS
    await prisma.semester.createMany({
        data: [
            { name: 'Genap 2023/2024', is_active: false },
            { name: 'Ganjil 2024/2025', is_active: true },
        ]
    });
    const semesters = await prisma.semester.findMany();
    const activeSemester = semesters.find(s => s.is_active);
    console.log('✓ Semesters: 2');

    // 4. COURSES
    await prisma.course.createMany({
        data: [
            { code: 'IF101', name: 'Pemrograman Dasar' },
            { code: 'IF102', name: 'Algoritma dan Struktur Data' },
            { code: 'IF201', name: 'Pemrograman Berorientasi Objek' },
            { code: 'IF202', name: 'Basis Data' },
            { code: 'IF301', name: 'Pemrograman Web' },
            { code: 'IF302', name: 'Jaringan Komputer' },
            { code: 'IF401', name: 'Keamanan Sistem' },
            { code: 'IF402', name: 'Machine Learning' },
        ]
    });
    const courses = await prisma.course.findMany({ orderBy: { code: 'asc' } });
    console.log('✓ Courses: 8');

    // 5. USERS
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    const studentNames = [
        'Ahmad Rizki', 'Budi Santoso', 'Citra Dewi', 'Dian Kusuma', 'Eko Prasetyo',
        'Fitri Handayani', 'Gunawan Putra', 'Hana Salsabila', 'Irfan Hakim', 'Joko Widodo',
        'Kartika Putri', 'Lukman Arif', 'Maya Anggraeni', 'Nanda Pratama', 'Oscar Hariadi',
        'Putri Ayu', 'Qori Ramadhan', 'Rizal Fahmi', 'Siti Nurhaliza', 'Taufik Ibrahim',
        'Umi Kalsum', 'Vina Melati', 'Wahyu Setiawan', 'Xena Olivia', 'Yusuf Maulana',
        'Zahra Aulia', 'Anisa Rahma', 'Bagas Pramono', 'Cindy Permata', 'Deni Kurniawan',
        'Eka Saputra', 'Fajar Nugroho', 'Gita Savitri', 'Hendra Wijaya', 'Indah Permatasari',
        'Jihan Aulia', 'Kevin Pratama', 'Lina Marlina', 'Muhammad Fadli', 'Nadia Safitri',
    ];

    // Create admin user
    try {
        await prisma.user.create({
            data: { 
                email: 'admin@practicum.com', 
                password: adminPassword, 
                name: 'Administrator', 
                is_admin: true,
                nim: null  // NIM is optional
            }
        });
    } catch (e) {
        if (e.code === 'P2002') {
            console.log('Admin user already exists, skipping...');
        } else {
            throw e;
        }
    }

    // Create student users with NIM
    const studentData = studentNames.map((name, i) => ({
        email: `student${i + 1}@student.com`,
        password: hashedPassword,
        name,
        nim: `2024${String(i + 1).padStart(5, '0')}`,
        is_admin: false
    }));

    // Try to create with NIM, if it fails (column doesn't exist), create without NIM
    try {
        await prisma.user.createMany({
            data: studentData,
            skipDuplicates: true
        });
    } catch (e) {
        if (e.code === 'P2022' && e.meta?.column === 'users.nim') {
            console.log('⚠️  NIM column not found, creating users without NIM...');
            // Create without NIM field
            const studentDataWithoutNim = studentNames.map((name, i) => ({
                email: `student${i + 1}@student.com`,
                password: hashedPassword,
                name,
                is_admin: false
            }));
            await prisma.user.createMany({
                data: studentDataWithoutNim,
                skipDuplicates: true
            });
        } else {
            throw e;
        }
    }
    const users = await prisma.user.findMany({ where: { is_admin: false }, orderBy: { id: 'asc' } });
    console.log('✓ Users: 41 (1 admin + 40 students)');


    // 6. CLASSES (20 classes)
    const classConfigs = [
        { course: 0, name: 'A', day: 1, slot: 0, room: 0 },
        { course: 0, name: 'B', day: 1, slot: 1, room: 0 },
        { course: 1, name: 'A', day: 1, slot: 2, room: 0 },
        { course: 1, name: 'B', day: 1, slot: 0, room: 1 },
        { course: 2, name: 'A', day: 2, slot: 0, room: 0 },
        { course: 2, name: 'B', day: 2, slot: 1, room: 0 },
        { course: 3, name: 'A', day: 2, slot: 2, room: 0 },
        { course: 3, name: 'B', day: 2, slot: 0, room: 1 },
        { course: 4, name: 'A', day: 3, slot: 0, room: 0 },
        { course: 4, name: 'B', day: 3, slot: 1, room: 0 },
        { course: 5, name: 'A', day: 3, slot: 2, room: 0 },
        { course: 5, name: 'B', day: 3, slot: 0, room: 1 },
        { course: 6, name: 'A', day: 4, slot: 0, room: 0 },
        { course: 6, name: 'B', day: 4, slot: 1, room: 0 },
        { course: 7, name: 'A', day: 4, slot: 2, room: 0 },
        { course: 7, name: 'B', day: 4, slot: 0, room: 1 },
        { course: 0, name: 'C', day: 5, slot: 0, room: 2 },
        { course: 1, name: 'C', day: 5, slot: 1, room: 2 },
        { course: 2, name: 'C', day: 5, slot: 2, room: 2 },
        { course: 3, name: 'C', day: 5, slot: 0, room: 3 },
    ];

    for (const config of classConfigs) {
        await prisma.class.create({
            data: {
                course_id: courses[config.course].id,
                semester_id: activeSemester.id,
                name: `Kelas ${config.name}`,
                quota: 25,
                day_of_week: config.day,
                time_slot_id: timeSlots[config.slot].id,
                room_id: rooms[config.room].id
            }
        });
    }
    const classes = await prisma.class.findMany({ where: { semester_id: activeSemester.id }, orderBy: { id: 'asc' } });
    console.log('✓ Classes: 20');

    // 7. SESSIONS (11 per class)
    const sessionTopics = [
        'Pengenalan', 'Konsep Dasar', 'Implementasi Dasar', 'Latihan 1', 'Studi Kasus 1',
        'Implementasi Lanjutan', 'Latihan 2', 'Studi Kasus 2', 'Project Mini', 'Review', 'Responsi'
    ];

    const sessionsData = [];
    for (const cls of classes) {
        for (let i = 1; i <= 11; i++) {
            sessionsData.push({
                class_id: cls.id,
                session_number: i,
                topic: sessionTopics[i - 1],
                type: i === 11 ? 'EXAM' : 'REGULAR',
                is_finalized: i <= 3
            });
        }
    }
    await prisma.classSession.createMany({ data: sessionsData });
    console.log('✓ Sessions: 220');

    // 8. CLASS ASSISTANTS (2 per class)
    const assistants = users.slice(0, 10);
    const assistantData = [];
    for (let i = 0; i < classes.length; i++) {
        assistantData.push({ class_id: classes[i].id, user_id: assistants[i % 10].id });
        assistantData.push({ class_id: classes[i].id, user_id: assistants[(i + 1) % 10].id });
    }
    await prisma.classAssistant.createMany({ data: assistantData });
    console.log('✓ Assistant Assignments: 40');

    // 9. ENROLLMENTS (15 students per class)
    const enrollableStudents = users.slice(10);
    const enrollmentData = [];
    for (let i = 0; i < classes.length; i++) {
        for (let j = 0; j < 15; j++) {
            const studentIdx = (i * 3 + j) % enrollableStudents.length;
            enrollmentData.push({
                class_id: classes[i].id,
                user_id: enrollableStudents[studentIdx].id
            });
        }
    }
    // Remove duplicates
    const uniqueEnrollments = [...new Map(enrollmentData.map(e => [`${e.class_id}-${e.user_id}`, e])).values()];
    await prisma.enrollment.createMany({ data: uniqueEnrollments, skipDuplicates: true });
    const enrollmentCount = await prisma.enrollment.count();
    console.log(`✓ Enrollments: ${enrollmentCount}`);


    // 10. ATTENDANCE RECORDS (batch insert)
    console.log('Creating attendance records (this may take a moment)...');
    
    const sessions = await prisma.classSession.findMany({
        where: { session_number: { lte: 5 } },
        orderBy: { id: 'asc' }
    });
    const enrollments = await prisma.enrollment.findMany();
    const classAssistants = await prisma.classAssistant.findMany();

    const attendanceStatuses = ['HADIR', 'HADIR', 'HADIR', 'HADIR', 'ALPHA', 'PENDING', 'IZIN_SAKIT'];
    const attendanceData = [];

    for (const session of sessions) {
        const sessionEnrollments = enrollments.filter(e => e.class_id === session.class_id);
        const approvers = classAssistants.filter(ca => ca.class_id === session.class_id);

        for (const enrollment of sessionEnrollments) {
            let status, grade = null, approvedById = null;

            if (session.session_number <= 3) {
                status = randomElement(attendanceStatuses);
                if (status === 'HADIR') grade = randomInt(65, 100);
                if (status !== 'ALPHA' && status !== 'PENDING' && approvers.length > 0) {
                    approvedById = approvers[0].user_id;
                }
            } else {
                status = Math.random() < 0.4 ? 'PENDING' : (Math.random() < 0.7 ? 'HADIR' : 'ALPHA');
                if (status === 'HADIR') grade = randomInt(65, 100);
            }

            attendanceData.push({
                enrollment_class_id: enrollment.class_id,
                enrollment_user_id: enrollment.user_id,
                session_id: session.id,
                status,
                grade,
                submitted_at: status !== 'ALPHA' ? new Date() : null,
                approved_by_id: approvedById
            });
        }
    }

    // Batch insert in chunks
    const chunkSize = 500;
    for (let i = 0; i < attendanceData.length; i += chunkSize) {
        const chunk = attendanceData.slice(i, i + chunkSize);
        await prisma.studentAttendance.createMany({ data: chunk, skipDuplicates: true });
    }
    console.log(`✓ Attendance Records: ${attendanceData.length}`);

    // 11. PERMISSION REQUESTS
    const permissionReasons = ['SAKIT', 'KEGIATAN_KAMPUS', 'LAIN_LAIN'];
    const permissionData = [];
    
    const session5s = await prisma.classSession.findMany({ where: { session_number: 5 }, take: 10 });
    for (const session of session5s) {
        const sessionEnrollments = enrollments.filter(e => e.class_id === session.class_id).slice(0, 3);
        for (const enrollment of sessionEnrollments) {
            permissionData.push({
                student_id: enrollment.user_id,
                session_id: session.id,
                reason: randomElement(permissionReasons),
                file_name: `surat_izin_${enrollment.user_id}.pdf`,
                file_data: 'data:application/pdf;base64,JVBERi0xLjQK',
                status: randomElement(['PENDING', 'PENDING', 'APPROVED'])
            });
        }
    }
    await prisma.permissionRequest.createMany({ data: permissionData, skipDuplicates: true });
    console.log(`✓ Permission Requests: ${permissionData.length}`);

    // 12. ASSISTANT CHECK-INS
    const checkInData = [];
    const checkInSessions = await prisma.classSession.findMany({ where: { session_number: { lte: 3 } } });
    for (const session of checkInSessions) {
        const sessionAssistants = classAssistants.filter(ca => ca.class_id === session.class_id);
        for (const ca of sessionAssistants) {
            if (Math.random() < 0.8) {
                checkInData.push({
                    user_id: ca.user_id,
                    session_id: session.id,
                    status: 'HADIR'
                });
            }
        }
    }
    await prisma.assistantAttendance.createMany({ data: checkInData, skipDuplicates: true });
    console.log(`✓ Assistant Check-ins: ${checkInData.length}`);

    // 13. SAMPLE PAYMENTS (for testing payment system)
    const paymentData = [];
    const enrollableStudentsForPayment = users.slice(10, 20); // First 10 enrollable students
    const classesForPayment = classes.slice(0, 5); // First 5 classes
    
    for (let i = 0; i < enrollableStudentsForPayment.length; i++) {
        const classIdx = i % classesForPayment.length;
        paymentData.push({
            student_id: enrollableStudentsForPayment[i].id,
            class_id: classesForPayment[classIdx].id,
            amount: 5000,
            proof_file_name: `bukti_transfer_${i + 1}.jpg`,
            proof_file_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
            status: i % 3 === 0 ? 'VERIFIED' : (i % 3 === 1 ? 'PENDING' : 'REJECTED'),
            verified_by_id: i % 3 === 0 ? 1 : null, // Admin verified some
            verified_at: i % 3 === 0 ? new Date() : null
        });
    }
    await prisma.payment.createMany({ data: paymentData, skipDuplicates: true });
    console.log(`✓ Sample Payments: ${paymentData.length}`);

    // SUMMARY
    console.log('\n' + '='.repeat(50));
    console.log('         SEEDING COMPLETE');
    console.log('='.repeat(50));
    console.log(`
📊 STATISTICS:
   Users:          ${await prisma.user.count()}
   Classes:        ${await prisma.class.count()}
   Sessions:       ${await prisma.classSession.count()}
   Enrollments:    ${await prisma.enrollment.count()}
   Attendances:    ${await prisma.studentAttendance.count()}
   Permissions:    ${await prisma.permissionRequest.count()}
   Payments:       ${await prisma.payment.count()}

🔐 LOGIN:
   Admin:    admin@practicum.com / admin123
   Students: student1@student.com ... / password123
   (student1-10 are also assistants)

💳 PAYMENT STATUS:
   - Some payments are VERIFIED (auto-enrolled)
   - Some payments are PENDING (waiting for admin verification)
   - Some payments are REJECTED (for testing rejection flow)
`);
    console.log('='.repeat(50));
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
