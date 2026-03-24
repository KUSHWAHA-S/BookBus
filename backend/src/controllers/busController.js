const busService = require("../services/busService")

exports.getBuses = async (req, res) => {
    try {
        const buses = await busService.getBuses()
        res.json(buses)
    } catch (err) {
        res.status(500).json({
            message: "Failed to fetch buses",
            error: err?.message || String(err),
        })
    }
}

