const { initialize } = require("../utils/blockchain.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

// Fungsi untuk mendaftarkan user dengan wallet address dan password
async function registerUser(walletAddress, fullName, password) {
  try {
    const { contract } = await initialize(walletAddress); // Inisialisasi kontrak menggunakan wallet address

    // Hash password dengan bcrypt sebelum dikirim ke blockchain
    const passwordHash = await bcrypt.hash(password, 10);

    // Mengirim data user ke smart contract
    const tx = await contract.methods
      .registerUser(fullName, passwordHash, walletAddress)
      .send({ from: walletAddress, gas: 3000000 });

    console.log(
      `✅ Pendaftaran berhasil dengan TX Hash: ${tx.transactionHash}`
    );
    return tx.transactionHash;
  } catch (error) {
    console.error("❌ Error dalam registerUser:", error);
    throw new Error(`Pendaftaran gagal: ${error.message}`);
  }
}

// Fungsi untuk login menggunakan wallet address dan password
async function loginUser(walletAddress, password) {
  try {
    const { contract } = await initialize(walletAddress); // Inisialisasi kontrak menggunakan wallet address

    // Ambil informasi user dari smart contract
    const userInfo = await contract.methods.getUserInfo(walletAddress).call();

    if (!userInfo.isRegistered) {
      throw new Error("Akun belum terdaftar");
    }

    // Bandingkan password yang diinput dengan hash yang ada di blockchain
    const storedPasswordHash = userInfo.hashPass; // Hash password yang tersimpan di blockchain
    const isMatch = await bcrypt.compare(password, storedPasswordHash);
    if (!isMatch) throw new Error("Password salah");

    // Jika password cocok, buat JWT Token
    const token = jwt.sign(
      { publicKey: walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: "3h" }
    );

    console.log(`✅ Login berhasil! JWT Token: ${token}`);
    return { token, walletAddress };
  } catch (error) {
    console.error("❌ Error dalam loginUser:", error);
    throw new Error(`Login gagal: ${error.message}`);
  }
}

// Fungsi untuk logout menggunakan wallet address
async function logoutUser(token) {
  try {
    if (!token) throw new Error("Token diperlukan untuk logout!");

    // Verifikasi token untuk mendapatkan publicKey (wallet address)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const publicKey = decoded.publicKey; // wallet address

    const { contract } = await initialize(publicKey); // Inisialisasi kontrak menggunakan wallet address

    // Memanggil fungsi logout di smart contract
    const tx = await contract.methods
      .logout()
      .send({ from: publicKey, gas: 3000000 });

    console.log(`✅ Logout berhasil untuk: ${publicKey}`);
    return tx.transactionHash;
  } catch (error) {
    console.error("❌ Error dalam logoutUser:", error);
    throw new Error(`Logout gagal: ${error.message}`);
  }
}

// Fungsi untuk mengecek apakah user sudah login berdasarkan wallet address
async function isUserLoggedIn(publicKey) {
  try {
    const { contract } = await initialize(publicKey); // Inisialisasi kontrak menggunakan wallet address

    // Ambil informasi user dari smart contract menggunakan wallet address
    const userInfo = await contract.methods.getUserInfo(publicKey).call();

    // Return status login (isLoggedIn) yang disimpan di smart contract
    return userInfo.isLoggedIn;
  } catch (error) {
    console.error("❌ Error dalam isUserLoggedIn:", error);
    throw new Error(`Gagal mengecek status login: ${error.message}`);
  }
}

module.exports = { registerUser, loginUser, logoutUser, isUserLoggedIn };
