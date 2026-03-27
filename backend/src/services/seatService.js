const pool = require("../config/db")
const redis = require("../config/redis")
const { LOCK_TTL_SECONDS } = require("../config/constants")

exports.lockSeat = async ({ tripId, seatId, userId }) => {
    if (!tripId || !seatId || !userId) {
        return { ok: false, status: 400, message: "tripId, seatId and userId are required" }
    }

    const key = `seat:${tripId}:${seatId}`

    // Atomic lock: only set if key does not exist.
    const lockResult = await redis.set(key, userId, "EX", LOCK_TTL_SECONDS, "NX")

    if (lockResult !== "OK") {
        return { ok: false, status: 400, message: "Seat already locked" }
    }

    return {
        ok: true,
        status: 200,
        message: `Seat locked for ${Math.floor(LOCK_TTL_SECONDS / 60)} minutes`,
    }
}

exports.getSeatLayout = async (tripId) => {
    if (!tripId) {
        throw new Error("tripId is required")
    }

    const tripRes = await pool.query(
        `
        SELECT b.layout_json
        FROM trips t
        JOIN buses b ON t.bus_id = b.id
        WHERE t.id = $1
        `,
        [tripId]
    )

    if (tripRes.rowCount === 0) {
        const err = new Error("Trip not found")
        err.status = 404
        throw err
    }

    const rawLayout = tripRes.rows[0].layout_json
    const layout = Array.isArray(rawLayout) ? rawLayout : rawLayout?.layout

    if (!Array.isArray(layout)) {
        throw new Error("Invalid bus layout_json format. Expected array or { layout: [...] }")
    }

    const bookedRes = await pool.query(
        `
        SELECT bs.seat_number
        FROM booking_seats bs
        JOIN bookings b ON bs.booking_id = b.id
        WHERE b.trip_id = $1
          AND b.status = 'confirmed'
        `,
        [tripId]
    )

    const bookedSeats = new Set(bookedRes.rows.map((r) => r.seat_number))

    // Flatten seat labels from layout matrix and skip null/empty cells.
    const allSeats = []
    for (const row of layout) {
        for (const seat of row) {
            if (seat) allSeats.push(seat)
        }
    }

    const keys = allSeats.map((seat) => `seat:${tripId}:${seat}`)
    const lockedResults = keys.length > 0 ? await redis.mget(keys) : []

    const lockedSeats = new Set()
    for (let i = 0; i < allSeats.length; i += 1) {
        if (lockedResults[i]) {
            lockedSeats.add(allSeats[i])
        }
    }

    const seatStatus = {}
    for (const seat of allSeats) {
        if (bookedSeats.has(seat)) {
            seatStatus[seat] = "booked"
        } else if (lockedSeats.has(seat)) {
            seatStatus[seat] = "locked"
        } else {
            seatStatus[seat] = "available"
        }
    }

    return {
        tripId,
        layout,
        seats: seatStatus,
    }
}

