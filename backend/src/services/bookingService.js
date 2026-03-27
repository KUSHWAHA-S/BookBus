const pool = require("../config/db")
const redis = require("../config/redis")
const { LOCK_TTL_SECONDS } = require("../config/constants")

exports.createBooking = async ({ userId, tripId, seats }) => {
    if (!userId || !tripId || !Array.isArray(seats) || seats.length === 0) {
        throw new Error("userId, tripId and non-empty seats array are required")
    }

    const client = await pool.connect()

    try {
        await client.query("BEGIN")

        const uniqueSeats = [...new Set(seats)]
        const lockKeys = uniqueSeats.map((seat) => `seat:${tripId}:${seat}`)
        const lockedBy = await redis.mget(lockKeys)

        // Every requested seat must be currently locked by this user.
        const notLockedByUser = []
        for (let i = 0; i < uniqueSeats.length; i += 1) {
            if (lockedBy[i] !== userId) {
                notLockedByUser.push(uniqueSeats[i])
            }
        }

        if (notLockedByUser.length > 0) {
            throw new Error(`Seats not locked by this user: ${notLockedByUser.join(", ")}`)
        }

        // Prevent duplicate confirmed seat booking for this trip.
        const existingRes = await client.query(
            `
            SELECT bs.seat_number
            FROM booking_seats bs
            JOIN bookings b ON b.id = bs.booking_id
            WHERE b.trip_id = $1
              AND b.status = 'confirmed'
              AND bs.seat_number = ANY($2::text[])
            `,
            [tripId, uniqueSeats]
        )

        if (existingRes.rowCount > 0) {
            const seatsTaken = existingRes.rows.map((r) => r.seat_number).join(", ")
            throw new Error(`Already booked seats: ${seatsTaken}`)
        }

        const tripRes = await client.query("SELECT price FROM trips WHERE id = $1", [tripId])
        if (tripRes.rowCount === 0) {
            throw new Error("Trip not found")
        }

        const price = Number(tripRes.rows[0].price)
        const totalAmount = price * uniqueSeats.length
        const lockExpiresAt = new Date(Date.now() + LOCK_TTL_SECONDS * 1000)

        const bookingRes = await client.query(
            `
            INSERT INTO bookings (user_id, trip_id, total_amount, status, lock_expires_at)
            VALUES ($1,$2,$3,'pending',$4)
            RETURNING *
            `,
            [userId, tripId, totalAmount, lockExpiresAt]
        )

        const bookingId = bookingRes.rows[0].id

        for (const seat of uniqueSeats) {
            await client.query(
                `
                INSERT INTO booking_seats (booking_id, seat_number)
                VALUES ($1,$2)
                `,
                [bookingId, seat]
            )
        }

        await client.query("COMMIT")

        return {
            ...bookingRes.rows[0],
            seats: uniqueSeats,
        }
    } catch (err) {
        await client.query("ROLLBACK")
        throw err
    } finally {
        client.release()
    }
}

exports.confirmBooking = async ({ bookingId, userId }) => {
    if (!bookingId || !userId) {
        throw new Error("bookingId and userId are required")
    }

    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        const bookingRes = await client.query(
            `
            SELECT id, user_id, trip_id, status, created_at, lock_expires_at
            FROM bookings
            WHERE id = $1
            FOR UPDATE
            `,
            [bookingId]
        )

        if (bookingRes.rowCount === 0) {
            throw new Error("Booking not found")
        }

        const booking = bookingRes.rows[0]
        if (booking.user_id !== userId) {
            throw new Error("Unauthorized")
        }

        if (booking.status !== "pending") {
            throw new Error("Invalid booking status")
        }

        const now = new Date()
        const expiry = booking.lock_expires_at
            ? new Date(booking.lock_expires_at)
            : new Date(new Date(booking.created_at).getTime() + LOCK_TTL_SECONDS * 1000)

        if (now > expiry) {
            await client.query(
                `
                UPDATE bookings
                SET status = 'cancelled', updated_at = now()
                WHERE id = $1 AND status = 'pending'
                `,
                [bookingId]
            )

            await client.query(
                `
                INSERT INTO notifications (user_id, message)
                VALUES ($1, $2)
                `,
                [userId, "Your booking session expired. Please select seats again."]
            )

            throw new Error("Booking expired. Please select seats again.")
        }

        const seatsRes = await client.query(
            "SELECT seat_number FROM booking_seats WHERE booking_id = $1",
            [bookingId]
        )
        const seats = seatsRes.rows.map((r) => r.seat_number)

        // Verify every seat is still locked by this user before confirming.
        const lockKeys = seats.map((seat) => `seat:${booking.trip_id}:${seat}`)
        const lockedBy = lockKeys.length > 0 ? await redis.mget(lockKeys) : []
        for (let i = 0; i < seats.length; i += 1) {
            if (lockedBy[i] !== userId) {
                throw new Error(`Seat ${seats[i]} not locked by user`)
            }
        }

        const updateRes = await client.query(
            `
            UPDATE bookings
            SET status = 'confirmed', updated_at = now()
            WHERE id = $1
            RETURNING *
            `,
            [bookingId]
        )

        await client.query("COMMIT")

        // Clear temp locks after successful confirmation.
        if (lockKeys.length > 0) {
            await redis.del(...lockKeys)
        }

        return {
            message: "Booking confirmed",
            booking: updateRes.rows[0],
            seats,
        }
    } catch (err) {
        await client.query("ROLLBACK")
        throw err
    } finally {
        client.release()
    }
}

