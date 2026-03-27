require("dotenv").config()

const express = require("express")
const cors = require("cors")
const seatRoutes = require("./routes/seat")
const routeSearchRoutes = require("./routes/routeSearch")
const busRoutes = require("./routes/bus")
const tripRoutes = require("./routes/trip")
const bookingRoutes = require("./routes/booking")
const { cleanupExpiredBookings } = require("./services/cleanupService")

const app = express()

app.use(cors())
app.use(express.json())

app.use("/seat", seatRoutes)
app.use("/routes", routeSearchRoutes)
app.use("/bus", busRoutes)
app.use("/trip", tripRoutes)
app.use("/booking", bookingRoutes)


app.get("/", (req, res) => {
    res.send("Bus Booking API running")
})

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

const runCleanup = async () => {
    try {
        const result = await cleanupExpiredBookings()
        if (result.cancelledCount > 0) {
            console.log(`Cleanup: cancelled ${result.cancelledCount} expired bookings`)
        }
    } catch (err) {
        console.error("Cleanup error:", err?.message || String(err))
    }
}

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`)
    runCleanup()
    setInterval(runCleanup, CLEANUP_INTERVAL_MS)
})