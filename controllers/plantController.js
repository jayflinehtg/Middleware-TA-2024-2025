const { initialize } = require("../utils/blockchain.js");
const { isUserLoggedIn, getUserData } = require("./authController.js");

async function addPlantData(req, res) {
  try {
    const userAddress = req.user.publicKey;

    console.log("Starting plant addition for user:", userAddress);

    console.time("Add Plant Time");

    const {
      name,
      namaLatin,
      komposisi,
      kegunaan,
      dosis,
      caraPengolahan,
      efekSamping,
      ipfsHash,
    } = req.body;

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
      .addPlant(
        name,
        namaLatin,
        komposisi,
        kegunaan,
        dosis,
        caraPengolahan,
        efekSamping,
        ipfsHash
      )
      .send({ from: userAddress, gas: 5000000 });

    console.log(tx.events); // Log the events to check the emitted event

    // Extracting plantId from the emitted event
    const plantId = tx.events.PlantAdded.returnValues.plantId;

    // Ensure the plantId is a string, converting if necessary
    const plantIdString = plantId.toString();

    await contract.methods
      .addPlantRecord(tx.transactionHash, plantIdString, userAddress)
      .send({ from: userAddress, gas: 3000000 });

    res.json({
      success: true,
      message: "Tanaman berhasil ditambahkan",
      txHash: tx.transactionHash,
      plantId: plantIdString,
    });

    console.timeEnd("Add Plant Time");
    console.log(`✅ Plant added with transaction hash: ${tx.transactionHash}`);
  } catch (error) {
    console.error("❌ Error in addPlantData:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Fungsi untuk mengedit data tanaman herbal
async function editPlant(req, res) {
  try {
    console.time("Edit Plant Time");
    const userAddress = req.user.publicKey;

    const plantIdFromParams = req.params.plantId;

    const {
      name,
      namaLatin,
      komposisi,
      kegunaan,
      dosis,
      caraPengolahan,
      efekSamping,
      ipfsHash,
    } = req.body;

    const plantId = parseInt(plantIdFromParams);

    console.log("Editing plant ID:", plantId);
    console.log("User address:", userAddress);

    // Pastikan pengguna sudah login
    const loggedIn = await isUserLoggedIn(userAddress);
    if (!loggedIn) {
      return res.status(401).json({
        success: false,
        message: "Anda harus login untuk mengedit tanaman",
      });
    }

    // Inisialisasi kontrak
    const { contract } = await initialize(userAddress);

    // Cek apakah tanaman yang ingin diedit milik pengguna
    const plant = await contract.methods.getPlant(plantId).call();
    if (plant.owner.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki hak untuk mengedit tanaman ini",
      });
    }

    // Kirim transaksi untuk mengedit tanaman
    const tx = await contract.methods
      .editPlant(
        plantId,
        name,
        namaLatin,
        komposisi,
        kegunaan,
        dosis,
        caraPengolahan,
        efekSamping,
        ipfsHash
      )
      .send({ from: userAddress, gas: 5000000 });

    // Simpan record transaksi edit ke smart contract
    await contract.methods
      .addPlantRecord(tx.transactionHash, plantId.toString(), userAddress)
      .send({ from: userAddress, gas: 3000000 });

    res.json({
      success: true,
      message: "Tanaman berhasil diedit",
      txHash: tx.transactionHash,
      plantId: plantId.toString(),
    });
    console.timeEnd("Edit Plant Time");
    console.log(
      `✅ Berhasil mengedit tanaman dengan TX Hash: ${tx.transactionHash}`
    );
  } catch (error) {
    console.error("❌ Error in editPlant:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Fungsi untuk mengambil data tanaman herbal
async function getPlant(req, res) {
  try {
    console.time("Get Plant Time");
    const { plantId } = req.params;

    // Ambil alamat publik user (kalau tersedia, bisa undefined untuk guest)
    const userAddress = req.user?.publicKey;

    const { contract } = await initialize();

    // Mengambil data tanaman herbal dari smart contract
    const plant = await contract.methods.getPlant(plantId).call();

    let isLikedByUser = false;
    if (userAddress) {
      isLikedByUser = await contract.methods
        .isPlantLikedByUser(plantId, userAddress)
        .call();
    }

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
        dosis: plant.dosis,
        caraPengolahan: plant.caraPengolahan,
        efekSamping: plant.efekSamping,
        ipfsHash: plant.ipfsHash,
        ratingTotal: ratingTotalString, // Mengonversi BigInt menjadi string
        ratingCount: ratingCountString, // Mengonversi BigInt menjadi string
        likeCount: likeCountString, // Mengonversi BigInt menjadi string
        owner: plant.owner,
        plantId: plantIdString, // Mengembalikan plantId sebagai string
        isLikedByUser,
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

    // Inisialisasi kontrak
    const { contract } = await initialize(userAddress);
    // Cek apakah pengguna sudah memberikan rating sebelumnya
    const previousRating = await contract.methods
      .plantRatings(plantId, userAddress)
      .call();

    // Jika ada rating sebelumnya, beri tahu pengguna jika mereka ingin mengganti rating
    if (previousRating != 0) {
      console.log(`Pengguna sebelumnya memberi rating ${previousRating}`);
    }

    // Kirim transaksi untuk memberikan rating
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

    // Menghitung rata-rata rating dan error handling
    const totalRating = plant.ratingTotal ? Number(plant.ratingTotal) : 0;
    const ratingCount = plant.ratingCount ? Number(plant.ratingCount) : 0;

    // Validasi data
    if (isNaN(totalRating) || isNaN(ratingCount)) {
      throw new Error("Invalid rating data from smart contract");
    }

    // Jika tidak ada rating yang diberikan, rata-rata adalah 0
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    // Pastikan rating dalam range yang valid (0-5)
    const validRating = Math.max(0, Math.min(5, averageRating));

    res.json({
      success: true,
      averageRating: Math.round(validRating * 10) / 10,
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
    console.timeEnd("Get Plant Rating Time");
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

// Fungsi untuk mengambil semua data tanaman dari smart contract
async function getAllPlants(req, res) {
  try {
    console.time("Get All Plants Time");
    const { contract } = await initialize();

    // Konversi BigInt ke Number dengan aman
    const totalPlantsBigInt = await contract.methods.plantCount().call();
    const totalPlants = parseInt(totalPlantsBigInt.toString());

    // Paginasi
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalPlants);

    // Ambil semua tanaman dengan filter paginasi
    const plants = [];
    for (let i = startIndex; i < endIndex; i++) {
      const plant = await contract.methods.getPlant(i).call();

      plants.push({
        plantId: i.toString(),
        name: plant.name || "Tidak Diketahui",
        namaLatin: plant.namaLatin || "Tidak Diketahui",
        komposisi: plant.komposisi || "Tidak Diketahui",
        kegunaan: plant.kegunaan || "Tidak Diketahui",
        dosis: plant.dosis || "Tidak Diketahui",
        caraPengolahan: plant.caraPengolahan || "Tidak Diketahui",
        efekSamping: plant.efekSamping || "Tidak Diketahui",
        ipfsHash: plant.ipfsHash || "Tidak Diketahui",
        ratingTotal: (plant.ratingTotal || 0n).toString(),
        ratingCount: (plant.ratingCount || 0n).toString(),
        likeCount: (plant.likeCount || 0n).toString(),
        owner: plant.owner || "Tidak Diketahui",
      });
    }

    res.json({
      success: true,
      total: totalPlants,
      currentPage: page,
      pageSize: limit,
      plants: plants,
    });

    console.timeEnd("Get All Plants Time");
  } catch (error) {
    console.error("❌ Error in getAllPlants:", error);
    res.status(500).json({
      success: false,
      message: error.message.includes("BigInt")
        ? "Invalid data format from blockchain"
        : error.message,
    });
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
      dosis: plant.dosis || "Tidak Diketahui", // Menambahkan dosis
      caraPengolahan: plant.caraPengolahan || "Tidak Diketahui",
      efekSamping: plant.efekSamping || "Tidak Diketahui", // Menambahkan efek samping
      ipfsHash: plant.ipfsHash || "Tidak Diketahui",
      ratingTotal: (plant.ratingTotal || 0n)?.toString() || "0",
      ratingCount: (plant.ratingCount || 0n)?.toString() || "0",
      likeCount: (plant.likeCount || 0n)?.toString() || "0",
      owner: plant.owner || "Tidak Diketahui",
    }));

    res.json({ success: true, plants: formattedPlants });

    console.timeEnd("Search Plant Time");
    console.log("✅ Berhasil mencari tanaman");
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
    const commentsWithStringValues = await Promise.all(
      comments.map(async (comment) => {
        try {
          const userInfo = await getUserData(comment.user);
          return {
            publicKey: comment.user,
            fullName: userInfo.fullName || "Unknown User",
            comment: comment.comment,
            timestamp: comment.timestamp.toString(),
          };
        } catch (error) {
          // Kalau gagal ambil userInfo (misal user belum register), tetap jalan
          return {
            publicKey: comment.user,
            fullName: "Unknown User",
            comment: comment.comment,
            timestamp: comment.timestamp.toString(),
          };
        }
      })
    );

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

// Fungsi untuk mengambil record transaksi berdasarkan recordId
async function getPlantRecord(req, res) {
  try {
    console.time("Get Plant Record Time");
    const { recordId } = req.params;

    const { contract } = await initialize();

    // Mengambil data record dari smart contract
    const record = await contract.methods.getPlantRecord(recordId).call();

    res.json({
      success: true,
      record: {
        ganacheTxHash: record.ganacheTxHash,
        plantId: record.plantId.toString(),
        userAddress: record.userAddress,
        timestamp: record.timestamp.toString(),
      },
    });

    console.timeEnd("Get Plant Record Time");
  } catch (error) {
    console.error("❌ Error in getPlantRecord:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Fungsi untuk mendapatkan semua plant records
async function getAllPlantRecord(req, res) {
  try {
    console.time("Get All Plant Records Time");

    const { contract } = await initialize();
    const totalRecords = await contract.methods.recordCount().call();
    const total = parseInt(totalRecords.toString());

    const records = [];
    for (let i = 0; i < total; i++) {
      const record = await contract.methods.getPlantRecord(i).call();
      records.push({
        recordId: i.toString(),
        ganacheTxHash: record.ganacheTxHash,
        plantId: record.plantId.toString(),
        userAddress: record.userAddress,
        timestamp: record.timestamp.toString(),
      });
    }

    res.json({
      success: true,
      totalRecords: total,
      records: records,
    });

    console.timeEnd("Get All Plant Records Time");
  } catch (error) {
    console.error("❌ Error in getAllPlantRecord:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Fungsi untuk mendapatkan transaction history berdasarkan plantId dengan pagination
async function getPlantTransactionHistory(req, res) {
  try {
    console.time("Get Plant Transaction History Time");
    const { plantId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const { contract } = await initialize();
    const totalRecords = await contract.methods.recordCount().call();
    const total = parseInt(totalRecords.toString());

    // Filter records berdasarkan plantId
    const plantRecords = [];

    for (let i = 0; i < total; i++) {
      const record = await contract.methods.getPlantRecord(i).call();

      // Filter hanya record yang sesuai dengan plantId
      if (record.plantId.toString() === plantId.toString()) {
        plantRecords.push({
          recordId: i.toString(),
          ganacheTxHash: record.ganacheTxHash,
          plantId: record.plantId.toString(),
          userAddress: record.userAddress,
          timestamp: record.timestamp.toString(),
        });
      }
    }

    // Sort berdasarkan timestamp (terbaru dulu)
    plantRecords.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

    // pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRecords = plantRecords.slice(startIndex, endIndex);

    // Tentukan jenis transaksi berdasarkan urutan
    const recordsWithType = paginatedRecords.map((record) => {
      const allRecordsForPlant = plantRecords.filter(
        (r) => r.plantId === record.plantId
      );
      const sortedByTimestamp = allRecordsForPlant.sort(
        (a, b) => parseInt(a.timestamp) - parseInt(b.timestamp)
      );
      const recordIndex = sortedByTimestamp.findIndex(
        (r) => r.recordId === record.recordId
      );

      return {
        ...record,
        transactionType: recordIndex === 0 ? "Add Plant" : "Edit Plant",
        icon: recordIndex === 0 ? "🌱" : "✏️",
      };
    });

    // Format timestamp menjadi readable format
    const formattedRecords = recordsWithType.map((record) => {
      const date = new Date(parseInt(record.timestamp) * 1000);
      const formattedDate =
        date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) +
        ", " +
        date.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

      return {
        ...record,
        formattedTimestamp: formattedDate,
      };
    });

    res.json({
      success: true,
      plantId: plantId,
      data: formattedRecords,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(plantRecords.length / limit),
        totalRecords: plantRecords.length,
        hasNextPage: endIndex < plantRecords.length,
        hasPreviousPage: page > 1,
      },
    });

    console.timeEnd("Get Plant Transaction History Time");
  } catch (error) {
    console.error("❌ Error in getPlantTransactionHistory:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Fungsi untuk mendapatkan total record count
async function getRecordCount(req, res) {
  try {
    console.time("Get Record Count Time");
    const { contract } = await initialize();

    const count = await contract.methods.recordCount().call();

    res.json({
      success: true,
      recordCount: count.toString(),
    });

    console.timeEnd("Get Record Count Time");
  } catch (error) {
    console.error("❌ Error in getRecordCount:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  addPlantData,
  editPlant,
  ratePlant,
  getAverageRating,
  getPlantRatings,
  likePlant,
  commentPlant,
  getPlant,
  searchPlants,
  getComments,
  getAllPlants,
  getPlantRecord,
  getAllPlantRecord,
  getPlantTransactionHistory,
  getRecordCount,
};
