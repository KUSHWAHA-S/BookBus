const express = require("express")
const router = express.Router()

const { createTrip, searchTrips } = require("../controllers/tripController")

router.post("/", createTrip)
router.get("/search", searchTrips)

module.exports = router

