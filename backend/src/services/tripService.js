const pool = require("../config/db")

exports.createTrip = async (data) => {
    const { bus_id, route_id, departure_time, arrival_time, date, price } = data

    const result = await pool.query(
        `
        INSERT INTO trips (bus_id, route_id, departure_time, arrival_time, date, price)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
        `,
        [bus_id, route_id, departure_time, arrival_time, date, price]
    )

    return result.rows[0]
}

exports.searchTrips = async (from, to, date) => {
    const result = await pool.query(
        `
        SELECT
            t.*,
            b.name AS bus_name,
            b.operator_name,
            b.total_seats,
            r.from_city,
            r.to_city
        FROM trips t
        JOIN routes r ON t.route_id = r.id
        JOIN buses b ON t.bus_id = b.id
        WHERE r.from_city = $1
          AND r.to_city = $2
          AND t.date = $3
        ORDER BY t.departure_time
        `,
        [from, to, date]
    )

    return result.rows
}

