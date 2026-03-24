const express = require("express")
const router = express.Router()

const { getBuses } = require("../controllers/busController")

router.get("/", getBuses)

module.exports = router

