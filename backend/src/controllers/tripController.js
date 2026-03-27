const tripService = require("../services/tripService")

exports.createTrip = async (req, res) => {
    try {
        const trip = await tripService.createTrip(req.body)
        res.status(201).json(trip)
    } catch (err) {
        res.status(500).json({ message: err?.message || "Failed to create trip" })
    }
}

exports.searchTrips = async (req, res) => {
    try {
        const { from, to, date } = req.query
        if (!from || !to || !date) {
            return res
                .status(400)
                .json({ message: "Missing required query params: from, to, date" })
        }

        const trips = await tripService.searchTrips(from, to, date)
        return res.json(trips)
    } catch (err) {
        return res.status(500).json({ message: err?.message || "Failed to search trips" })
    }
}

