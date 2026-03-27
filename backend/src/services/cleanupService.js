const pool = require("../config/db")

exports.cleanupExpiredBookings = async () => {
    const result = await pool.query(
        `
        WITH expired AS (
            UPDATE bookings
            SET status = 'cancelled',
                updated_at = now()
            WHERE status = 'pending'
              AND lock_expires_at < now()
            RETURNING id, user_id
        ),
        notifications_insert AS (
            INSERT INTO notifications (user_id, message)
            SELECT
                user_id,
                'Your booking session expired. Please select seats again.'
            FROM expired
            RETURNING id
        )
        SELECT id, user_id
        FROM expired
        `
    )

    return {
        cancelledCount: result.rowCount,
        expiredBookings: result.rows,
    }
}

