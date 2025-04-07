const dotenv = require("dotenv");
const Web3 = require("web3").Web3; // Pastikan impor Web3 menggunakan require
const fs = require("fs");
const path = require("path");

dotenv.config();

// Path to the compiled contract JSON
const contractPath = path.resolve(
  __dirname,
  "../build/contracts/HerbalPlant.json"
);
const contractJSON = JSON.parse(fs.readFileSync(contractPath, "utf8"));

// Extract ABI and Contract Address
const contractABI = contractJSON.abi;
const contractAddress =
  process.env.SMART_CONTRACT_ADDRESS || contractJSON.networks["5777"].address;

let web3;
let contract;
let wallet;

// Menghubungkan ke Ganache menggunakan host dan port sesuai konfigurasi
async function connectToGanache() {
  const ganacheUrl = process.env.GANACHE_URL || "http://127.0.0.1:7545"; // Ganache UI default
  web3 = new Web3(ganacheUrl); // Inisialisasi Web3 langsung dengan URL Ganache

  try {
    const chainId = await web3.eth.getChainId(); // ✅ Web3 v4.x compatible
    console.log(`✅ Connected to Ganache. Chain ID: ${chainId}`);
  } catch (error) {
    console.error("❌ Failed to connect to Ganache", error);
    process.exit(1);
  }
}

async function initialize(publicKey = null) {
  if (contract && wallet) return { contract, wallet }; // Return contract and wallet if initialized

  console.log("🔄 Initializing blockchain...");

  await connectToGanache();

  if (!contractAddress) {
    console.error("❌ Contract address not found.");
    process.exit(1);
  }

  // Jika publicKey diberikan (misalnya dari JWT), gunakan untuk inisialisasi wallet
  if (publicKey) {
    wallet = web3.eth.accounts.privateKeyToAccount(publicKey);
    console.log("Wallet Address (from JWT):", wallet.address);
  } else {
    wallet = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
    console.log("Wallet Address (default):", wallet.address);
  }

  contract = new web3.eth.Contract(contractABI, contractAddress, {
    from: wallet.address,
  });

  console.log("✅ Blockchain initialized successfully.");
  return { contract, wallet };
}

module.exports = { initialize };
