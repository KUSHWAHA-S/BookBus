const bookingService = require("../services/bookingService")

exports.createBooking = async (req, res) => {
    try {
        const booking = await bookingService.createBooking(req.body)
        res.status(201).json(booking)
    } catch (err) {
        res.status(400).json({ message: err?.message || "Failed to create booking" })
    }
}

exports.confirmBooking = async (req, res) => {
    try {
        const booking = await bookingService.confirmBooking(req.body)
        res.json(booking)
    } catch (err) {
        res.status(400).json({ message: err?.message || "Failed to confirm booking" })
    }
}

