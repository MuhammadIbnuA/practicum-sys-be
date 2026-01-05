import prisma from '../lib/prisma.js';
import { apiResponse } from '../utils/helpers.js';
import { uploadBase64File, uploadMultipleBase64Files, BUCKETS, deleteMultipleFiles, parseMinioUrl } from '../services/minioService.js';

export const uploadFaceImages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { images } = req.body;
        if (!images || !Array.isArray(images) || images.length < 5 || images.length > 10) {
            return apiResponse.error(res, 'Need 5-10 images.', 400);
        }
        
        // Upload images to MinIO
        const imageUrls = await uploadMultipleBase64Files(images, BUCKETS.FACES, user-);
        
        // Delete old images if exists
        const existing = await prisma.faceData.findUnique({ where: { user_id: userId } });
        if (existing && existing.sample_images) {
            const oldUrls = JSON.parse(existing.sample_images);
            for (const url of oldUrls) {
                const parsed = parseMinioUrl(url);
                if (parsed) await deleteMultipleFiles(parsed.bucket, [parsed.filename]);
            }
        }
        
        const faceData = await prisma.faceData.upsert({
            where: { user_id: userId },
            update: { sample_images: JSON.stringify(imageUrls), sample_count: imageUrls.length, is_trained: false, updated_at: new Date() },
            create: { user_id: userId, sample_images: JSON.stringify(imageUrls), sample_count: imageUrls.length, face_descriptors: [], is_trained: false }
        });
        return apiResponse.success(res, faceData, 'Uploaded.', 201);
    } catch (error) {
        console.error('Upload error:', error);
        return apiResponse.error(res, 'Error.', 500);
    }
};

export const saveFaceDescriptors = async (req, res) => {
    try {
        const userId = req.user.id;
        const { descriptors } = req.body;
        if (!descriptors || !Array.isArray(descriptors)) return apiResponse.error(res, 'Descriptors required.', 400);
        const faceData = await prisma.faceData.update({
            where: { user_id: userId },
            data: { face_descriptors: descriptors, is_trained: true, trained_at: new Date() }
        });
        return apiResponse.success(res, faceData, 'Saved.');
    } catch (error) {
        return apiResponse.error(res, 'Error.', 500);
    }
};

export const getFaceStatus = async (req, res) => {
    try {
        const faceData = await prisma.faceData.findUnique({
            where: { user_id: req.user.id },
            select: { id: true, sample_count: true, is_trained: true, trained_at: true, created_at: true, updated_at: true }
        });
        return apiResponse.success(res, faceData ? { registered: true, ...faceData } : { registered: false });
    } catch (error) {
        return apiResponse.error(res, 'Error.', 500);
    }
};

export const deleteFaceData = async (req, res) => {
    try {
        const faceData = await prisma.faceData.findUnique({ where: { user_id: req.user.id } });
        if (faceData && faceData.sample_images) {
            const urls = JSON.parse(faceData.sample_images);
            for (const url of urls) {
                const parsed = parseMinioUrl(url);
                if (parsed) await deleteMultipleFiles(parsed.bucket, [parsed.filename]);
            }
        }
        await prisma.faceData.delete({ where: { user_id: req.user.id } });
        return apiResponse.success(res, null, 'Deleted.');
    } catch (error) {
        return apiResponse.error(res, error.code === 'P2025' ? 'Not found.' : 'Error.', error.code === 'P2025' ? 404 : 500);
    }
};

export const getSessionFaceDescriptors = async (req, res) => {
    try {
        const session = await prisma.classSession.findUnique({
            where: { id: parseInt(req.params.sessionId) },
            include: { class: { include: { enrollments: { include: { user: { select: { id: true, name: true, nim: true, faceData: { select: { face_descriptors: true, is_trained: true } } } } } } } } }
        });
        if (!session) return apiResponse.error(res, 'Not found.', 404);
        const faceDescriptors = session.class.enrollments.filter(e => e.user.faceData?.is_trained).map(e => ({ userId: e.user.id, name: e.user.name, nim: e.user.nim, descriptors: e.user.faceData.face_descriptors }));
        return apiResponse.success(res, { sessionId: session.id, totalEnrolled: session.class.enrollments.length, withFaceData: faceDescriptors.length, faceDescriptors });
    } catch (error) {
        return apiResponse.error(res, 'Error.', 500);
    }
};

export const markFaceAttendance = async (req, res) => {
    try {
        const { sessionId, studentId, confidenceScore, capturedImage, deviceInfo } = req.body;
        if (!sessionId || !studentId || confidenceScore === undefined || !capturedImage) return apiResponse.error(res, 'Missing fields.', 400);
        if (confidenceScore < 0.6) return apiResponse.error(res, 'Low confidence.', 400);
        
        // Upload captured image to MinIO
        const imageUrl = await uploadBase64File(capturedImage, BUCKETS.ATTENDANCE, session--student-);
        
        const session = await prisma.classSession.findUnique({ where: { id: parseInt(sessionId) }, include: { class: true } });
        if (!session) return apiResponse.error(res, 'Not found.', 404);
        const result = await prisma.\(async (tx) => {
            const attendance = await tx.studentAttendance.upsert({
                where: { enrollment_class_id_enrollment_user_id_session_id: { enrollment_class_id: session.class_id, enrollment_user_id: parseInt(studentId), session_id: parseInt(sessionId) } },
                update: { status: 'HADIR', approved_by_id: req.user.id, approved_at: new Date() },
                create: { enrollment_class_id: session.class_id, enrollment_user_id: parseInt(studentId), session_id: parseInt(sessionId), status: 'HADIR', approved_by_id: req.user.id, approved_at: new Date() }
            });
            const log = await tx.faceAttendanceLog.create({ data: { student_id: parseInt(studentId), session_id: parseInt(sessionId), confidence_score: parseFloat(confidenceScore), captured_image: imageUrl, device_info: deviceInfo || null, recognized_by_id: req.user.id } });
            return { attendance, log };
        });
        return apiResponse.success(res, result, 'Marked.', 201);
    } catch (error) {
        return apiResponse.error(res, 'Error.', 500);
    }
};

export const getFaceStats = async (req, res) => {
    try {
        const [totalUsers, registeredUsers, trainedUsers, totalLogs] = await Promise.all([
            prisma.user.count({ where: { is_admin: false } }),
            prisma.faceData.count(),
            prisma.faceData.count({ where: { is_trained: true } }),
            prisma.faceAttendanceLog.count()
        ]);
        return apiResponse.success(res, { totalUsers, registeredUsers, trainedUsers, registrationRate: totalUsers > 0 ? ((registeredUsers / totalUsers) * 100).toFixed(1) : 0, totalFaceAttendances: totalLogs });
    } catch (error) {
        return apiResponse.error(res, 'Error.', 500);
    }
};

export const getStudentsWithFaceData = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const [students, total] = await Promise.all([
            prisma.user.findMany({ where: { is_admin: false }, include: { faceData: { select: { id: true, sample_count: true, is_trained: true, trained_at: true } } }, orderBy: { name: 'asc' }, skip, take: limit }),
            prisma.user.count({ where: { is_admin: false } })
        ]);
        return apiResponse.success(res, { data: students, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        return apiResponse.error(res, 'Error.', 500);
    }
};

export const getFaceAttendanceLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            prisma.faceAttendanceLog.findMany({ include: { student: { select: { id: true, name: true, email: true, nim: true } }, session: { include: { class: { include: { course: true } } } }, recognized_by: { select: { id: true, name: true } } }, orderBy: { created_at: 'desc' }, skip, take: limit }),
            prisma.faceAttendanceLog.count()
        ]);
        return apiResponse.success(res, { data: logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        return apiResponse.error(res, 'Error.', 500);
    }
};
