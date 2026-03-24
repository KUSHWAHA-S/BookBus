const pool = require("../config/db")

exports.getBuses = async () => {
    const result = await pool.query("SELECT * FROM buses ORDER BY created_at DESC")
    return result.rows
}

