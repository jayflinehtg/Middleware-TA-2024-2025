const { initialize } = require("../utils/blockchain.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

async function registerUser(fullName, password) {
  try {
    const { contract, wallet } = await initialize();

    // Hash password dengan bcrypt sebelum dikirim ke blockchain
    const passwordHash = await bcrypt.hash(password, 10);

    // Mengirim data user ke smart contract
    const tx = await contract.methods
      .registerUser(fullName, passwordHash)
      .send({ from: wallet.address, gas: 3000000 });

    console.log(
      `✅ Pendaftaran berhasil dengan TX Hash: ${tx.transactionHash}`
    );
    return tx.transactionHash;
  } catch (error) {
    console.error("❌ Error dalam registerUser:", error);
    throw new Error(`Pendaftaran gagal: ${error.message}`);
  }
}

async function loginUser(password) {
  try {
    const { contract, wallet } = await initialize();

    // Ambil informasi user dari smart contract
    const userInfo = await contract.methods.getUserInfo(wallet.address).call();
    const storedPasswordHash = userInfo.hashPass; // Hash password yang tersimpan di blockchain

    // Bandingkan password yang diinput dengan hash yang ada di blockchain
    const isMatch = await bcrypt.compare(password, storedPasswordHash);
    if (!isMatch) throw new Error("Password salah");

    // Jika password cocok, user dianggap login dan dapat JWT Token
    const tx = await contract.methods
      .login()
      .send({ from: wallet.address, gas: 3000000 });

    // Buat token JWT yang berlaku selama 2 jam
    const token = jwt.sign(
      { publicKey: wallet.address },
      process.env.JWT_SECRET,
      { expiresIn: "3h" }
    );

    console.log(`✅ Login berhasil! JWT Token: ${token}`);
    return { token, txHash: tx.transactionHash };
  } catch (error) {
    console.error("❌ Error dalam loginUser:", error);
    throw new Error(`Login gagal: ${error.message}`);
  }
}

async function logoutUser(token) {
  try {
    if (!token) throw new Error("Token diperlukan untuk logout!");

    // Verifikasi token untuk mendapatkan publicKey
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const publicKey = decoded.publicKey;

    const { contract } = await initialize();

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

// Fungsi untuk mengecek status login pengguna
async function isUserLoggedIn(publicKey) {
  const { contract } = await initialize(publicKey); // Inisialisasi kontrak menggunakan publicKey
  const userInfo = await contract.methods.getUserInfo(publicKey).call(); // Ambil informasi pengguna
  return userInfo.isLoggedIn; // Kembalikan status login
}

module.exports = { registerUser, loginUser, logoutUser, isUserLoggedIn };
