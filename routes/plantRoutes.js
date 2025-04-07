const express = require("express");
const {
  addPlantData,
  ratePlant,
  likePlant,
  commentPlant,
  getPlant,
  searchPlants,
  getComments,
} = require("../controllers/plantController.js");

const { verifyToken } = require("../jwtMiddleware.js");

const router = express.Router();

// 🔹 Rute untuk menambahkan tanaman (butuh autentikasi)
router.post("/add", verifyToken, addPlantData);

// 🔹 Rute untuk mencari tanaman berdasarkan parameter
router.get("/search", searchPlants); // Menambahkan rute searchPlants

// 🔹 Rute untuk memberi rating pada tanaman (butuh autentikasi)
router.post("/rate", verifyToken, ratePlant);

// 🔹 Rute untuk menyukai tanaman (butuh autentikasi)
router.post("/like", verifyToken, likePlant);

// 🔹 Rute untuk memberi komentar pada tanaman (butuh autentikasi)
router.post("/comment", verifyToken, commentPlant);

// 🔹 Rute untuk mengambil data tanaman berdasarkan ID
router.get("/:plantId", getPlant);

// 🔹 Rute untuk mengambil komentar tanaman (butuh autentikasi)
router.get("/:plantId/comments", verifyToken, getComments);

// 🔹 Rute untuk mendapatkan rata-rata rating tanaman berdasarkan plantId
router.get('/plant/averageRating/:plantId', plantController.getAverageRating);

module.exports = router;
