/**
 * Utility Helper Functions
 */

/**
 * Calculate attendance percentage
 * @param {number} presentCount - Number of sessions attended
 * @param {number} totalSessions - Total number of past sessions
 * @returns {number} Percentage (0-100)
 */
export const calculateAttendancePercentage = (presentCount, totalSessions) => {
    if (totalSessions === 0) return 0;
    return Math.round((presentCount / totalSessions) * 100 * 100) / 100;
};

/**
 * Calculate average grade
 * @param {number[]} grades - Array of grades
 * @returns {number|null} Average grade or null if no grades
 */
export const calculateAverageGrade = (grades) => {
    const validGrades = grades.filter(g => g !== null && g !== undefined);
    if (validGrades.length === 0) return null;
    const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
    return Math.round((sum / validGrades.length) * 100) / 100;
};

/**
 * Generate session dates for a class
 * @param {Date} startDate - Start date of the semester
 * @param {string} day - Day of the week (e.g., "Monday")
 * @param {number} count - Number of sessions to generate
 * @returns {Date[]} Array of session dates
 */
export const generateSessionDates = (startDate, day, count = 11) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = days.indexOf(day);

    if (targetDay === -1) return [];

    const dates = [];
    const current = new Date(startDate);

    // Find first occurrence of the target day
    while (current.getDay() !== targetDay) {
        current.setDate(current.getDate() + 1);
    }

    // Generate dates
    for (let i = 0; i < count; i++) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 7); // Next week
    }

    return dates;
};

/**
 * Map attendance status to permission type
 * @param {string} reason - Permission reason
 * @returns {string} Attendance status
 */
export const mapReasonToStatus = (reason) => {
    const reasonLower = reason.toLowerCase();
    if (reasonLower.includes('sakit') || reasonLower.includes('sick')) {
        return 'IZIN_SAKIT';
    }
    if (reasonLower.includes('kampus') || reasonLower.includes('university') || reasonLower.includes('official')) {
        return 'IZIN_KAMPUS';
    }
    return 'IZIN_LAIN';
};

/**
 * Standardized API response
 */
export const apiResponse = {
    success: (res, data, message = 'Success', statusCode = 200) => {
        return res.status(statusCode).json({
            success: true,
            message,
            data
        });
    },

    error: (res, message = 'Error', statusCode = 400, errors = null) => {
        const response = {
            success: false,
            message
        };
        if (errors) response.errors = errors;
        return res.status(statusCode).json(response);
    },

    paginated: (res, data, page, limit, total, message = 'Success') => {
        return res.status(200).json({
            success: true,
            message,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
};

export default {
    calculateAttendancePercentage,
    calculateAverageGrade,
    generateSessionDates,
    mapReasonToStatus,
    apiResponse
};
