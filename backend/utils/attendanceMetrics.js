export const summarizeAttendance = ({ studentCount, sessionCount, totalMarked, presentCount }) => {
    const totalExpected = studentCount * sessionCount;

    return {
        totalExpected,
        absentCount: Math.max(0, totalExpected - presentCount),
        unmarkedCount: Math.max(0, totalExpected - totalMarked),
        averageAttendance: totalExpected
            ? Math.round((presentCount / totalExpected) * 100)
            : 0
    };
};