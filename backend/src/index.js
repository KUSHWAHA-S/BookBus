require("dotenv").config()

const express = require("express")
const cors = require("cors")
const seatRoutes = require("./routes/seat")
const routeSearchRoutes = require("./routes/routeSearch")
const busRoutes = require("./routes/bus")

const app = express()

app.use(cors())
app.use(express.json())

app.use("/seat", seatRoutes)
app.use("/routes", routeSearchRoutes)
app.use("/bus", busRoutes)


app.get("/", (req, res) => {
    res.send("Bus Booking API running")
})

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`)
})