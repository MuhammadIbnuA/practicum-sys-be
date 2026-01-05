import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPayments() {
    console.log('\n📊 PAYMENT TRANSACTIONS REPORT\n');
    console.log('='.repeat(80));

    // Get all payments
    const payments = await prisma.payment.findMany({
        include: {
            student: { select: { id: true, email: true, name: true, nim: true } },
            class: { select: { id: true, name: true } },
            verified_by: { select: { id: true, email: true, name: true } }
        },
        orderBy: { created_at: 'desc' }
    });

    // Count by status
    const statusCounts = {};
    payments.forEach(p => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });

    console.log('\n📈 PAYMENT STATUS SUMMARY:');
    console.log('-'.repeat(80));
    Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status.padEnd(15)} : ${count} transactions`);
    });
    console.log(`  ${'TOTAL'.padEnd(15)} : ${payments.length} transactions`);

    console.log('\n\n📋 DETAILED PAYMENT TRANSACTIONS:');
    console.log('-'.repeat(80));

    payments.forEach((p, idx) => {
        console.log(`\n[${idx + 1}] Payment ID: ${p.id}`);
        console.log(`    Student: ${p.student.name} (${p.student.email}) - NIM: ${p.student.nim}`);
        console.log(`    Class: ${p.class.name}`);
        console.log(`    Amount: IDR ${p.amount.toLocaleString('id-ID')}`);
        console.log(`    Status: ${p.status}`);
        console.log(`    Created: ${p.created_at.toLocaleString('id-ID')}`);
        if (p.verified_by) {
            console.log(`    Verified By: ${p.verified_by.name} (${p.verified_by.email})`);
            console.log(`    Verified At: ${p.verified_at?.toLocaleString('id-ID')}`);
        }
        console.log(`    Proof File: ${p.proof_file_name}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ PAYMENT VARIANTS FOUND:');
    console.log('-'.repeat(80));
    const variants = Object.keys(statusCounts);
    variants.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v} (${statusCounts[v]} records)`);
    });

    console.log('\n');
    await prisma.$disconnect();
}

checkPayments().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
