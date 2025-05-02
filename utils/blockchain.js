const dotenv = require("dotenv");
const Web3 = require("web3").Web3;
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
  process.env.SMART_CONTRACT_ADDRESS || contractJSON.networks["5777"]?.address;

let web3;
let contract;
let wallet;

// Fungsi untuk menghubungkan ke blockchain berdasarkan konfigurasi di .env
async function connectToBlockchain() {
  // Mengecek jaringan yang dipilih di .env
  const blockchainNetwork = process.env.BLOCKCHAIN_NETWORK || "ganache";
  let rpcUrl;

  if (blockchainNetwork === "ganache") {
    rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://0.0.0.0:7545"; // Ganache default
  } else if (blockchainNetwork === "tea-sepolia") {
    rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://tea-sepolia.g.alchemy.com/public"; // Tea-Sepolia default
  } else {
    throw new Error(`Unsupported network: ${blockchainNetwork}`);
  }

  web3 = new Web3(rpcUrl); // Inisialisasi Web3 menggunakan URL RPC yang dipilih

  try {
    const chainId = await web3.eth.getChainId();
    console.log(`Connected to ${blockchainNetwork}. Chain ID: ${chainId}`);
  } catch (error) {
    console.error(`Failed to connect to ${blockchainNetwork}`, error);
    process.exit(1);
  }
}

async function initialize(walletAddress = null) {
  if (contract && wallet) return { contract, wallet }; // Return contract and wallet if initialized

  console.log("Initializing blockchain...");

  await connectToBlockchain();

  if (!contractAddress) {
    throw new Error("Contract address not found.");
  }

  // Jika privatekey diberikan (misalnya dari JWT), gunakan untuk inisialisasi wallet
  if (walletAddress) {
    wallet = web3.eth.accounts.privateKeyToAccount(walletAddress);
  } else {
    wallet = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
  }

  contract = new web3.eth.Contract(contractABI, contractAddress, {
    from: wallet.address,
  });

  console.log("Blockchain initialized successfully.");
  return { contract, wallet };
}

module.exports = { initialize };
