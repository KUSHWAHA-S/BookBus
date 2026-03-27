const express = require("express")
const router = express.Router()

const { createBooking, confirmBooking } = require("../controllers/bookingController")

router.post("/", createBooking)
router.post("/confirm", confirmBooking)

module.exports = router

