const express = require("express")
const router = express.Router()
const redis = require("../config/redis")

router.post("/lock-seat", async (req, res) => {

    const { tripId, seatId, userId } = req.body

    const key = `seat:${tripId}:${seatId}`

    const existing = await redis.get(key)

    if (existing) {
        return res.status(400).json({ message: "Seat already locked" })
    }

    await redis.set(key, userId, "EX", 300)

    res.json({ message: "Seat locked for 5 minutes" })
})

module.exports = router