const express = require("express")
const pool = require("../config/db")

const router = express.Router()

// GET /routes/search?from=...&to=...&date=YYYY-MM-DD
router.get("/search", async (req, res) => {
    try {
        const { from, to, date } = req.query

        if (!from || !to || !date) {
            return res.status(400).json({
                message: "Missing required query params: from, to, date (YYYY-MM-DD)",
            })
        }

        // Validate date format loosely (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res
                .status(400)
                .json({ message: "Invalid date format. Use YYYY-MM-DD." })
        }

        const result = await pool.query(
            `
            SELECT
                t.id,
                r.from_city,
                r.to_city,
                t.date,
                t.departure_time,
                t.arrival_time,
                t.price,
                b.id AS bus_id,
                b.name AS bus_name,
                b.operator_name,
                b.total_seats
            FROM trips t
            JOIN routes r ON r.id = t.route_id
            JOIN buses b ON b.id = t.bus_id
            WHERE r.from_city = $1
              AND r.to_city = $2
              AND t.date = $3
            ORDER BY t.departure_time
            `,
            [from, to, date]
        )

        res.json({ trips: result.rows })
    } catch (err) {
        res.status(500).json({
            message: "Failed to search trips",
            error: err?.message || String(err),
        })
    }
})

module.exports = router

