const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  isUserLoggedIn,
} = require("../controllers/authController.js");
const { verifyToken } = require("../jwtMiddleware.js");

const router = express.Router();

// Rute untuk registrasi
router.post("/register", async (req, res) => {
  try {
    const { fullName, password } = req.body;
    const result = await registerUser(fullName, password);
    res.status(200).json({ success: true, txHash: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Rute untuk login
router.post("/login", async (req, res) => {
  try {
    const { password } = req.body;
    const result = await loginUser(password); // Fungsi loginUser sebagai callback
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Rute untuk logout (memerlukan token)
router.post("/logout", verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const result = await logoutUser(token);
    res.status(200).json({ success: true, txHash: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Rute untuk memeriksa status login pengguna (memerlukan token)
router.get("/isLoggedIn", verifyToken, async (req, res) => {
  try {
    const userAddress = req.user.publicKey;
    const isLoggedIn = await isUserLoggedIn(userAddress);
    res.status(200).json({ success: true, isLoggedIn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; // Ekspor router dengan benar
