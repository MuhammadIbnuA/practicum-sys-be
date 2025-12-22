/**
 * Comprehensive Seed Script
 * Creates: 1 admin, 30 students, 10 classes, 3 assistants per class, 10 students per class
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database with comprehensive data...\n');

    // Clean database
    await prisma.studentAttendance.deleteMany();
    await prisma.assistantAttendance.deleteMany();
    await prisma.permissionRequest.deleteMany();
    await prisma.classAssistant.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.classSession.deleteMany();
    await prisma.class.deleteMany();
    await prisma.course.deleteMany();
    await prisma.semester.deleteMany();
    await prisma.room.deleteMany();
    await prisma.timeSlot.deleteMany();
    await prisma.user.deleteMany();

    // =========================================================================
    // 1. TIME SLOTS (6 slots per day)
    // =========================================================================
    const timeSlots = await Promise.all([
        prisma.timeSlot.create({ data: { slot_number: 1, start_time: '07:00', end_time: '08:40', label: 'Sesi 1 (07:00-08:40)' } }),
        prisma.timeSlot.create({ data: { slot_number: 2, start_time: '08:50', end_time: '10:30', label: 'Sesi 2 (08:50-10:30)' } }),
        prisma.timeSlot.create({ data: { slot_number: 3, start_time: '10:40', end_time: '12:20', label: 'Sesi 3 (10:40-12:20)' } }),
        prisma.timeSlot.create({ data: { slot_number: 4, start_time: '13:00', end_time: '14:40', label: 'Sesi 4 (13:00-14:40)' } }),
        prisma.timeSlot.create({ data: { slot_number: 5, start_time: '14:50', end_time: '16:30', label: 'Sesi 5 (14:50-16:30)' } }),
        prisma.timeSlot.create({ data: { slot_number: 6, start_time: '16:40', end_time: '18:20', label: 'Sesi 6 (16:40-18:20)' } }),
    ]);
    console.log('✓ Time Slots created (6)');

    // =========================================================================
    // 2. ROOMS (3 labs)
    // =========================================================================
    const rooms = await Promise.all([
        prisma.room.create({ data: { code: 'LAB-A', name: 'Laboratorium A' } }),
        prisma.room.create({ data: { code: 'LAB-B', name: 'Laboratorium B' } }),
        prisma.room.create({ data: { code: 'LAB-C', name: 'Laboratorium C' } }),
    ]);
    console.log('✓ Rooms created (3)');

    // =========================================================================
    // 3. SEMESTER
    // =========================================================================
    const semester = await prisma.semester.create({
        data: { name: 'Ganjil 2024/2025', is_active: true }
    });
    console.log('✓ Semester created');

    // =========================================================================
    // 4. COURSES (5 courses)
    // =========================================================================
    const courses = await Promise.all([
        prisma.course.create({ data: { code: 'IF101', name: 'Pemrograman Dasar' } }),
        prisma.course.create({ data: { code: 'IF201', name: 'Struktur Data' } }),
        prisma.course.create({ data: { code: 'IF301', name: 'Basis Data' } }),
        prisma.course.create({ data: { code: 'IF401', name: 'Jaringan Komputer' } }),
        prisma.course.create({ data: { code: 'IF501', name: 'Keamanan Sistem' } }),
    ]);
    console.log('✓ Courses created (5)');

    // =========================================================================
    // 5. USERS - Admin
    // =========================================================================
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.create({
        data: {
            email: 'admin@practicum.com',
            password: adminPassword,
            name: 'Administrator',
            is_admin: true
        }
    });
    console.log('✓ Admin created');

    // =========================================================================
    // 6. USERS - Students (30 students)
    // =========================================================================
    const studentNames = [
        'Ahmad Rizki', 'Budi Santoso', 'Citra Dewi', 'Dian Kusuma', 'Eko Prasetyo',
        'Fitri Handayani', 'Gunawan Putra', 'Hana Salsabila', 'Irfan Hakim', 'Joko Widodo',
        'Kartika Putri', 'Lukman Arif', 'Maya Anggraeni', 'Nanda Pratama', 'Oscar Hariadi',
        'Putri Ayu', 'Qori Ramadhan', 'Rizal Fahmi', 'Siti Nurhaliza', 'Taufik Ibrahim',
        'Umi Kalsum', 'Vina Melati', 'Wahyu Setiawan', 'Xena Olivia', 'Yusuf Maulana',
        'Zahra Aulia', 'Anisa Rahma', 'Bagas Pramono', 'Cindy Permata', 'Deni Kurniawan'
    ];

    const students = await Promise.all(
        studentNames.map((name, i) =>
            prisma.user.create({
                data: {
                    email: `student${i + 1}@student.com`,
                    password: hashedPassword,
                    name,
                    is_admin: false
                }
            })
        )
    );
    console.log('✓ Students created (30)');

    // =========================================================================
    // 7. CLASSES (10 classes with unique schedules)
    // =========================================================================
    const classConfigs = [
        { course: 0, name: 'A', day: 1, slot: 0, room: 0 },
        { course: 0, name: 'B', day: 1, slot: 1, room: 0 },
        { course: 1, name: 'A', day: 1, slot: 2, room: 0 },
        { course: 1, name: 'B', day: 2, slot: 0, room: 0 },
        { course: 2, name: 'A', day: 2, slot: 1, room: 1 },
        { course: 2, name: 'B', day: 2, slot: 2, room: 1 },
        { course: 3, name: 'A', day: 3, slot: 0, room: 1 },
        { course: 3, name: 'B', day: 3, slot: 1, room: 2 },
        { course: 4, name: 'A', day: 4, slot: 0, room: 2 },
        { course: 4, name: 'B', day: 4, slot: 1, room: 2 },
    ];

    const classes = [];
    for (const config of classConfigs) {
        const newClass = await prisma.class.create({
            data: {
                course_id: courses[config.course].id,
                semester_id: semester.id,
                name: `Kelas ${config.name}`,
                quota: 15,
                day_of_week: config.day,
                time_slot_id: timeSlots[config.slot].id,
                room_id: rooms[config.room].id
            }
        });
        classes.push(newClass);
    }
    console.log('✓ Classes created (10)');

    // =========================================================================
    // 8. SESSIONS (11 sessions per class = 110 sessions)
    // =========================================================================
    for (const cls of classes) {
        const sessions = [];
        for (let i = 1; i <= 11; i++) {
            sessions.push({
                class_id: cls.id,
                session_number: i,
                topic: i === 11 ? 'Responsi' : `Pertemuan ${i}: Materi ${i}`,
                type: i === 11 ? 'EXAM' : 'REGULAR'
            });
        }
        await prisma.classSession.createMany({ data: sessions });
    }
    console.log('✓ Sessions created (110)');

    // =========================================================================
    // 9. CLASS ASSISTANTS (3 per class from student pool)
    // =========================================================================
    // First 15 students can be assistants to various classes
    const assistantPool = students.slice(0, 15);

    for (let i = 0; i < classes.length; i++) {
        // Assign 3 different assistants to each class (rotating through pool)
        const assistants = [
            assistantPool[(i * 3) % assistantPool.length],
            assistantPool[(i * 3 + 1) % assistantPool.length],
            assistantPool[(i * 3 + 2) % assistantPool.length],
        ];

        for (const asst of assistants) {
            await prisma.classAssistant.create({
                data: {
                    class_id: classes[i].id,
                    user_id: asst.id
                }
            });
        }
    }
    console.log('✓ Class Assistants assigned (30 assignments)');

    // =========================================================================
    // 10. ENROLLMENTS (10 students per class)
    // =========================================================================
    // Distribute students across classes (students 10-30 are enrolled)
    const enrollableStudents = students.slice(10); // Last 20 students

    for (let i = 0; i < classes.length; i++) {
        // Each class gets a mix of students
        const startIdx = (i * 3) % enrollableStudents.length;
        const classStudents = [];
        for (let j = 0; j < 10; j++) {
            classStudents.push(enrollableStudents[(startIdx + j) % enrollableStudents.length]);
        }

        for (const student of classStudents) {
            try {
                await prisma.enrollment.create({
                    data: {
                        class_id: classes[i].id,
                        user_id: student.id
                    }
                });
            } catch (e) {
                // Skip duplicate enrollments
            }
        }
    }
    console.log('✓ Enrollments created (~100)');

    // =========================================================================
    // 11. ATTENDANCE RECORDS (random sample for first 3 sessions)
    // =========================================================================
    const statuses = ['HADIR', 'HADIR', 'HADIR', 'HADIR', 'ALPHA', 'PENDING', 'IZIN_SAKIT'];

    for (const cls of classes) {
        const sessions = await prisma.classSession.findMany({
            where: { class_id: cls.id, session_number: { lte: 3 } }
        });

        const enrollments = await prisma.enrollment.findMany({
            where: { class_id: cls.id }
        });

        for (const session of sessions) {
            for (const enrollment of enrollments) {
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                await prisma.studentAttendance.create({
                    data: {
                        enrollment_class_id: enrollment.class_id,
                        enrollment_user_id: enrollment.user_id,
                        session_id: session.id,
                        status,
                        submitted_at: new Date(),
                        grade: status === 'HADIR' ? Math.floor(Math.random() * 30) + 70 : null
                    }
                });
            }
        }
    }
    console.log('✓ Attendance records created (~300)');

    // =========================================================================
    // 12. PENDING ATTENDANCE for Assistant Approval (Session 4)
    // =========================================================================
    // Create explicit PENDING records in session 4 for assistant to approve
    for (const cls of classes.slice(0, 3)) { // First 3 classes
        const session4 = await prisma.classSession.findFirst({
            where: { class_id: cls.id, session_number: 4 }
        });

        const enrollments = await prisma.enrollment.findMany({
            where: { class_id: cls.id },
            take: 5 // First 5 students per class
        });

        for (const enrollment of enrollments) {
            await prisma.studentAttendance.create({
                data: {
                    enrollment_class_id: enrollment.class_id,
                    enrollment_user_id: enrollment.user_id,
                    session_id: session4.id,
                    status: 'PENDING', // Waiting for assistant approval
                    submitted_at: new Date()
                }
            });
        }
    }
    console.log('✓ PENDING attendance for assistant approval (15 records)');

    // =========================================================================
    // 13. PERMISSION REQUESTS for Admin Approval
    // =========================================================================
    // Students request permission (IZIN) - requires admin approval
    const permissionReasons = ['SAKIT', 'KEGIATAN_KAMPUS', 'LAIN_LAIN'];

    for (const cls of classes.slice(0, 5)) { // First 5 classes
        const session5 = await prisma.classSession.findFirst({
            where: { class_id: cls.id, session_number: 5 }
        });

        const enrollments = await prisma.enrollment.findMany({
            where: { class_id: cls.id },
            take: 3 // 3 students per class request permission
        });

        for (let i = 0; i < enrollments.length; i++) {
            const enrollment = enrollments[i];
            const reason = permissionReasons[i % permissionReasons.length];
            await prisma.permissionRequest.create({
                data: {
                    session_id: session5.id,
                    student_id: enrollment.user_id,  // Correct field name
                    reason: reason,
                    file_name: `surat_izin_${enrollment.user_id}.pdf`, // Required
                    file_data: 'data:application/pdf;base64,JVBERi0xLjQKMQ==', // Dummy base64
                    status: 'PENDING' // Waiting for admin approval
                }
            });
        }
    }
    console.log('✓ Permission requests for admin approval (15 records)');

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n======================================');
    console.log('          SEEDING COMPLETE           ');
    console.log('======================================');
    console.log(`Admin:      admin@practicum.com / admin123`);
    console.log(`Students:   student1@student.com to student30@student.com / password123`);
    console.log(`Classes:    10 classes, 3 assistants each`);
    console.log(`Enrollments: 10 students per class`);
    console.log('');
    console.log('TESTING APPROVAL WORKFLOWS:');
    console.log('  - Assistant approval: 15 PENDING records in Session 4');
    console.log('  - Admin approval: 15 Permission Requests in Session 5');
    console.log('======================================\n');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
