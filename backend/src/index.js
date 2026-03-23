const express = require("express")
const cors = require("cors")
const seatRoutes = require("./routes/seat")

const app = express()

app.use(cors())
app.use(express.json())

app.use("/seat", seatRoutes)


app.get("/", (req, res) => {
    res.send("Bus Booking API running")
})

app.listen(5000, () => {
    console.log("Server running on port 5000")
})