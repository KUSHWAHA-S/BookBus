const seatService = require("../services/seatService")

exports.lockSeat = async (req, res) => {
    try {
        const result = await seatService.lockSeat(req.body)
        return res.status(result.status).json({ message: result.message })
    } catch (err) {
        return res.status(500).json({
            message: "Failed to lock seat",
            error: err?.message || String(err),
        })
    }
}

exports.getSeatLayout = async (req, res) => {
    try {
        const { tripId } = req.query
        const data = await seatService.getSeatLayout(tripId)
        return res.json(data)
    } catch (err) {
        const status = err?.status || 500
        return res.status(status).json({
            message: err?.message || "Failed to fetch seat layout",
        })
    }
}

