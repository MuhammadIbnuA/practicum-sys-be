import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const payments = await prisma.payment.findMany({
            select: {
                id: true,
                student_id: true,
                class_id: true,
                amount: true,
                status: true,
                verified_by_id: true,
                verified_at: true,
                created_at: true
            },
            orderBy: { created_at: 'desc' }
        });

        console.log('\n=== PAYMENT TRANSACTIONS ===\n');
        console.log(`Total Payments: ${payments.length}\n`);

        // Group by status
        const byStatus = {};
        payments.forEach(p => {
            if (!byStatus[p.status]) byStatus[p.status] = [];
            byStatus[p.status].push(p);
        });

        console.log('Status Summary:');
        Object.entries(byStatus).forEach(([status, records]) => {
            console.log(`  ${status}: ${records.length}`);
        });

        console.log('\nAll Payments:');
        payments.forEach((p, i) => {
            console.log(`${i + 1}. ID:${p.id} | Student:${p.student_id} | Class:${p.class_id} | Amount:${p.amount} | Status:${p.status} | Verified:${p.verified_by_id ? 'Yes' : 'No'}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
