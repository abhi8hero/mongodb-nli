const express = require("express")
const router = express.Router()
const { saveDocuments } = require("../controllers/updateController")

router.put("/", saveDocuments)

module.exports = router