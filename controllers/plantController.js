const { initialize } = require("../utils/blockchain.js");
const { isUserLoggedIn } = require("./authController.js");

async function addPlantData(req, res) {
  try {
    const userAddress = req.user.publicKey;

    console.log("Starting plant addition for user:", userAddress);

    console.time("Add Plant Time");

    const { name, namaLatin, komposisi, kegunaan, caraPengolahan, ipfsHash } =
      req.body;

    // Pastikan pengguna sudah login
    const loggedIn = await isUserLoggedIn(userAddress);
    if (!loggedIn) {
      return res.status(401).json({
        success: false,
        message: "Anda harus login untuk menambahkan tanaman",
      });
    }

    const { contract } = await initialize(userAddress);

    // Menambahkan tanaman dan mendapatkan txHash serta ID tanaman yang baru
    const tx = await contract.methods
      .addPlant(name, namaLatin, komposisi, kegunaan, caraPengolahan, ipfsHash)
      .send({ from: userAddress, gas: 5000000 });

    console.log(tx.events); // Log the events to check the emitted event

    // Extracting plantId from the emitted event
    const plantId = tx.events.PlantAdded.returnValues.plantId;

    // Ensure the plantId is a string, converting if necessary
    const plantIdString = plantId.toString();

    res.json({
      success: true,
      message: "Tanaman berhasil ditambahkan",
      txHash: tx.transactionHash,
      plantId: plantIdString, // Return the plantId as string
    });

    console.timeEnd("Add Plant Time");
    console.log(`✅ Plant added with transaction hash: ${tx.transactionHash}`);
  } catch (error) {
    console.error("❌ Error in addPlantData:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Fungsi untuk mengambil data tanaman herbal
async function getPlant(req, res) {
  try {
    console.time("Get Plant Time");
    const { plantId } = req.params;

    const { contract } = await initialize();

    // Mengambil data tanaman herbal dari smart contract
    const plant = await contract.methods.getPlant(plantId).call();

    // Mengonversi nilai yang mungkin BigInt ke string
    const plantIdString = plantId.toString(); // Jika plantId merupakan BigInt
    const ratingTotalString = plant.ratingTotal.toString();
    const ratingCountString = plant.ratingCount.toString();
    const likeCountString = plant.likeCount.toString();

    res.json({
      success: true,
      plant: {
        name: plant.name,
        namaLatin: plant.namaLatin,
        komposisi: plant.komposisi,
        kegunaan: plant.kegunaan,
        caraPengolahan: plant.caraPengolahan,
        ipfsHash: plant.ipfsHash,
        ratingTotal: ratingTotalString, // Mengonversi BigInt menjadi string
        ratingCount: ratingCountString, // Mengonversi BigInt menjadi string
        likeCount: likeCountString, // Mengonversi BigInt menjadi string
        owner: plant.owner,
        plantId: plantIdString, // Mengembalikan plantId sebagai string
      },
    });
    console.timeEnd("Get Plant Time");
  } catch (error) {
    console.error("❌ Error in getPlant:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function ratePlant(req, res) {
  try {
    console.time("Rate Plant Time");
    const userAddress = req.user.publicKey;
    const { plantId, rating } = req.body;

    // Pastikan pengguna sudah login
    const loggedIn = await isUserLoggedIn(userAddress);
    if (!loggedIn) {
      return res.status(401).json({
        success: false,
        message: "Anda harus login untuk memberi rating pada tanaman",
      });
    }

    const { contract } = await initialize(userAddress);
    const tx = await contract.methods
      .ratePlant(plantId, rating)
      .send({ from: userAddress, gas: 5000000 });

    res.json({
      success: true,
      message: "Rating berhasil ditambahkan",
      txHash: tx.transactionHash,
      plantId: plantId.toString(), // Mengonversi BigInt ke string
    });
    console.timeEnd("Rate Plant Time");
    console.log(
      `✅ Berhasil menambahkan rating pada tanaman dengan TX Hash: ${tx.transactionHash}`
    );
    return tx.transactionHash;
  } catch (error) {
    console.error("❌ Error in ratePlant:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Function untuk mendapatkan rata-rata rating dari sebuah tanaman herbal
async function getAverageRating(req, res) {
  try {
    console.time("Get Average Rating Time");
    const { plantId } = req.params;
    const { contract } = await initialize();

    // Mengambil total rating dan jumlah rating yang diberikan pada tanaman
    const plant = await contract.methods.getPlant(plantId).call();

    // Menghitung rata-rata rating
    const totalRating = plant.ratingTotal; // Total rating yang diterima
    const ratingCount = plant.ratingCount; // Jumlah pengguna yang memberi rating

    // Jika tidak ada rating yang diberikan, rata-rata adalah 0
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    res.json({
      success: true,
      averageRating: averageRating.toString(), // Mengonversi rata-rata rating menjadi string
    });
    console.timeEnd("Get Average Rating Time");
  } catch (error) {
    console.error("❌ Error in getAverageRating:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Fungsi untuk mendapatkan ratings tanaman berdasarkan plantId
async function getPlantRatings(req, res) {
  try {
    console.time("Get Plant Rating Time");
    const { plantId } = req.params;
    const { contract } = await initialize();

    // Mengambil data ratings dari smart contract berdasarkan plantId
    const ratings = await contract.methods.getPlantRatings(plantId).call();

    // Mengonversi ratings menjadi array angka
    const ratingsArray = ratings.map((rating) => Number(rating));

    res.json({
      success: true,
      ratings: ratingsArray, // Mengembalikan ratings dalam bentuk array
    });
    console.time("Get Plant Rating Time");
  } catch (error) {
    console.error("❌ Error in getPlantRatings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function likePlant(req, res) {
  try {
    console.time("Like Plant Time");
    const userAddress = req.user.publicKey;
    const { plantId } = req.body;

    // Pastikan pengguna sudah login
    const loggedIn = await isUserLoggedIn(userAddress);
    if (!loggedIn) {
      return res.status(401).json({
        success: false,
        message: "Anda harus login untuk menyukai tanaman",
      });
    }

    const { contract } = await initialize(userAddress);

    // Menjalankan fungsi likePlant di smart contract
    const tx = await contract.methods
      .likePlant(plantId)
      .send({ from: userAddress, gas: 5000000 });

    res.json({
      success: true,
      message: "Operasi like berhasil",
      txHash: tx.transactionHash,
      plantId: plantId.toString(), // Mengonversi BigInt ke string
    });
    console.timeEnd("Like Plant Time");
    console.log(
      `✅ Berhasil memberikan like dengan TX Hash: ${tx.transactionHash}`
    );
    return tx.transactionHash;
  } catch (error) {
    console.error("❌ Error in likePlant:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Function untuk memberikan komentar pada sebuah data tanaman herbal
async function commentPlant(req, res) {
  try {
    console.time("Comment Plant Time");
    const userAddress = req.user.publicKey;
    const { plantId, comment } = req.body;

    // Pastikan pengguna sudah login
    const loggedIn = await isUserLoggedIn(userAddress);
    if (!loggedIn) {
      return res.status(401).json({
        success: false,
        message: "Anda harus login untuk memberi komentar pada tanaman",
      });
    }

    const { contract } = await initialize(userAddress);
    const tx = await contract.methods
      .commentPlant(plantId, comment)
      .send({ from: userAddress, gas: 5000000 });

    res.json({
      success: true,
      message: "Komentar berhasil ditambahkan",
      txHash: tx.transactionHash,
      plantId: plantId.toString(), // Mengonversi BigInt ke string
    });
    console.timeEnd("Comment Plant Time");
    console.log(
      `✅ Berhasil memberikan komentar dengan TX Hash: ${tx.transactionHash}`
    );
    return tx.transactionHash;
  } catch (error) {
    console.error("❌ Error in commentPlant:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Fungsi untuk mencari tanaman berdasarkan nama, nama latin, komposisi, atau kegunaan
async function searchPlants(req, res) {
  try {
    console.time("Search Plant Time");
    const { name, namaLatin, komposisi, kegunaan } = req.query;

    // Validasi parameter
    const validatedName = typeof name === "string" ? name : "";
    const validatedNamaLatin = typeof namaLatin === "string" ? namaLatin : "";
    const validatedKomposisi = typeof komposisi === "string" ? komposisi : "";
    const validatedKegunaan = typeof kegunaan === "string" ? kegunaan : "";

    const { contract } = await initialize();

    // Panggil fungsi searchPlants dari kontrak
    const result = await contract.methods
      .searchPlants(
        validatedName,
        validatedNamaLatin,
        validatedKomposisi,
        validatedKegunaan
      )
      .call();

    // Debug: Cek struktur hasil
    console.log("Raw result from contract:", result);

    // Ekstrak plantIds dan plants dari hasil
    const plantIds = result[0] || [];
    const plants = result[1] || [];

    // Format data untuk response
    const formattedPlants = plants.map((plant, index) => ({
      plantId: plantIds[index]?.toString() || "N/A",
      name: plant.name || "Tidak Diketahui",
      namaLatin: plant.namaLatin || "Tidak Diketahui",
      komposisi: plant.komposisi || "Tidak Diketahui",
      kegunaan: plant.kegunaan || "Tidak Diketahui",
      caraPengolahan: plant.caraPengolahan || "Tidak Diketahui",
      ipfsHash: plant.ipfsHash || "Tidak Diketahui",
      ratingTotal: (plant.ratingTotal || 0n)?.toString() || "0",
      ratingCount: (plant.ratingCount || 0n)?.toString() || "0",
      likeCount: (plant.likeCount || 0n)?.toString() || "0",
      owner: plant.owner || "Tidak Diketahui",
    }));

    res.json({ success: true, plants: formattedPlants });

    console.timeEnd("Search Plant Time");
    console.log(
      `✅ Berhasil mencari tanaman dengan TX Hash: ${tx.transactionHash}`
    );
    return tx.transactionHash;
  } catch (error) {
    console.error("❌ Error in searchPlants:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Function untuk mendapatkan komentar dari sebuah data tanaman herbal
async function getComments(req, res) {
  try {
    console.time("Get Comment Time");
    const { plantId } = req.params;
    const { contract } = await initialize();

    // Mengambil komentar dari smart contract berdasarkan plantId
    const comments = await contract.methods.getPlantComments(plantId).call();

    // Mengonversi BigInt menjadi string untuk setiap nilai yang relevan dalam komentar
    const commentsWithStringValues = comments.map((comment) => {
      return {
        user: comment.user, // Alamat pengguna (tidak perlu konversi)
        comment: comment.comment, // Isi komentar (tidak perlu konversi)
        timestamp: comment.timestamp.toString(), // Mengonversi timestamp ke string
      };
    });

    res.json({
      success: true,
      comments: commentsWithStringValues, // Mengembalikan komentar yang telah dikonversi
    });
    console.timeEnd("Get Comment Time");
  } catch (error) {
    console.error("❌ Error in getComments:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  addPlantData,
  ratePlant,
  getAverageRating,
  getPlantRatings,
  likePlant,
  commentPlant,
  getPlant,
  searchPlants,
  getComments,
};
