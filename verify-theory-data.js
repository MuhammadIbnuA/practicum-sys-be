import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    console.log('='.repeat(70));
    console.log('VERIFICATION: Theory Class & Practicum Class Data');
    console.log('='.repeat(70));
    
    // Get first class with full data
    const classData = await prisma.class.findFirst({
        include: {
            course: true,
            enrollments: {
                include: {
                    user: {
                        select: { name: true, nim: true }
                    }
                },
                orderBy: { theory_class: 'asc' },
                take: 15
            }
        }
    });
    
    if (!classData) {
        console.log('No class found');
        return;
    }
    
    console.log(`\n📚 Practicum Class: ${classData.course.code} - ${classData.name}`);
    console.log(`   Total Students: ${classData.enrollments.length}\n`);
    
    console.log('Table Structure Preview:');
    console.log('─'.repeat(70));
    console.log('Mahasiswa'.padEnd(25) + '│ Kelas Teori │ Kelas Praktikum');
    console.log('─'.repeat(70));
    
    classData.enrollments.forEach(e => {
        const name = e.user.name.padEnd(25);
        const theory = (e.theory_class || '-').padEnd(11);
        const practicum = classData.name;
        console.log(`${name}│     ${theory}│ ${practicum}`);
    });
    
    console.log('─'.repeat(70));
    
    // Statistics
    const stats = {};
    classData.enrollments.forEach(e => {
        const tc = e.theory_class || 'NULL';
        stats[tc] = (stats[tc] || 0) + 1;
    });
    
    console.log('\n📊 Theory Class Distribution in this Practicum Class:');
    Object.keys(stats).sort().forEach(tc => {
        console.log(`   ${tc}: ${stats[tc]} students`);
    });
    
    // Overall stats
    const totalEnrollments = await prisma.enrollment.count();
    const withTheory = await prisma.enrollment.count({
        where: { theory_class: { not: null } }
    });
    
    console.log('\n📈 Overall Database Statistics:');
    console.log(`   Total Enrollments: ${totalEnrollments}`);
    console.log(`   With Theory Class: ${withTheory} (${Math.round(withTheory/totalEnrollments*100)}%)`);
    
    // Check requirement: theory_class is mandatory
    if (withTheory === totalEnrollments) {
        console.log('\n✅ REQUIREMENT MET: All enrollments have theory_class');
        console.log('   Theory class is mandatory for practicum enrollment');
    } else {
        console.log('\n⚠️  WARNING: Some enrollments missing theory_class');
    }
    
    console.log('\n' + '='.repeat(70));
    
    await prisma.$disconnect();
}

verify().catch(console.error);
