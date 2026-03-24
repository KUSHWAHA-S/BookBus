const express = require("express")
const router = express.Router()
const { lockSeat, getSeatLayout } = require("../controllers/seatController")

router.get("/layout", getSeatLayout)
router.post("/lock", lockSeat)
// Backward-compatible alias for earlier API shape.
router.post("/lock-seat", lockSeat)

module.exports = router