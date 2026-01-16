// Simple Node.js script to upload equipment data using Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Make sure you have firebase-adminsdk json file in the root directory
let serviceAccount;
try {
  serviceAccount = require('../smartbharat-32b65-firebase-adminsdk-k9z45-9a8f5f5e0d.json');
} catch (err) {
  console.log('Using environment-based Firebase initialization...');
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  // Try to use environment variables or default
  admin.initializeApp({
    projectId: "smartbharat-32b65",
    databaseURL: "https://smartbharat-32b65.firebaseio.com"
  });
}

const db = admin.firestore();

const equipmentData = [
  {
    name: "Mahindra 475 Tractor",
    description: "Reliable 47 HP tractor perfect for small to medium farm operations",
    category: "Tractor",
    dailyRate: 1500,
    location: "Chandigarh",
    city: "Chandigarh",
    state: "Punjab",
    phone: "9876543210",
    imageUrl: "https://via.placeholder.com/200?text=Mahindra+475",
    status: "Available",
    rating: 4.5,
    totalBookings: 12,
    specifications: { hp: 47, hours: 2100, condition: "Excellent", yearMake: 2019 }
  },
  {
    name: "John Deere 5050D",
    description: "50 HP diesel tractor with advanced features for efficient farming",
    category: "Tractor",
    dailyRate: 2000,
    location: "Ludhiana",
    city: "Ludhiana",
    state: "Punjab",
    phone: "9876543211",
    imageUrl: "https://via.placeholder.com/200?text=John+Deere",
    status: "Available",
    rating: 4.8,
    totalBookings: 25,
    specifications: { hp: 50, hours: 1850, condition: "Excellent", yearMake: 2020 }
  },
  {
    name: "CLAAS Harvester 2020",
    description: "Modern combine harvester for wheat and paddy harvesting",
    category: "Harvester",
    dailyRate: 3200,
    location: "Amritsar",
    city: "Amritsar",
    state: "Punjab",
    phone: "9876543212",
    imageUrl: "https://via.placeholder.com/200?text=CLAAS+Harvester",
    status: "Rented",
    rating: 4.9,
    totalBookings: 45,
    specifications: { capacity: "8 tons/hour", hours: 1200, condition: "Excellent", yearMake: 2020 }
  },
  {
    name: "Swaraj 855 Tractor",
    description: "Compact 55 HP tractor ideal for vegetable and cash crops",
    category: "Tractor",
    dailyRate: 1200,
    location: "Mohali",
    city: "Mohali",
    state: "Punjab",
    phone: "9876543213",
    imageUrl: "https://via.placeholder.com/200?text=Swaraj+855",
    status: "Available",
    rating: 4.3,
    totalBookings: 8,
    specifications: { hp: 55, hours: 2500, condition: "Good", yearMake: 2018 }
  },
  {
    name: "Kubota DC70 Mini Digger",
    description: "Compact excavator for land preparation and maintenance work",
    category: "Earthmoving",
    dailyRate: 1800,
    location: "Patiala",
    city: "Patiala",
    state: "Punjab",
    phone: "9876543214",
    imageUrl: "https://via.placeholder.com/200?text=Kubota+Digger",
    status: "Available",
    rating: 4.6,
    totalBookings: 18,
    specifications: { capacity: "0.25 m3", hours: 1600, condition: "Excellent", yearMake: 2019 }
  },
  {
    name: "Weeder Machine Electric",
    description: "Electric weeder for efficient weed removal in fields",
    category: "Weeder",
    dailyRate: 400,
    location: "Jalandhar",
    city: "Jalandhar",
    state: "Punjab",
    phone: "9876543215",
    imageUrl: "https://via.placeholder.com/200?text=Electric+Weeder",
    status: "Available",
    rating: 4.2,
    totalBookings: 22,
    specifications: { width: "1.5m", power: "2HP", condition: "Good", yearMake: 2021 }
  },
  {
    name: "Sieve-Seed Cleaner",
    description: "Advanced seed cleaning machine for grain processing",
    category: "Processing",
    dailyRate: 800,
    location: "Hoshiarpur",
    city: "Hoshiarpur",
    state: "Punjab",
    phone: "9876543216",
    imageUrl: "https://via.placeholder.com/200?text=Seed+Cleaner",
    status: "Available",
    rating: 4.4,
    totalBookings: 15,
    specifications: { capacity: "1000 kg/hour", power: "3HP", condition: "Excellent", yearMake: 2020 }
  },
  {
    name: "Spray Tank 1000L",
    description: "Large capacity spray tank for pesticide and fertilizer application",
    category: "Sprayer",
    dailyRate: 500,
    location: "Bathinda",
    city: "Bathinda",
    state: "Punjab",
    phone: "9876543217",
    imageUrl: "https://via.placeholder.com/200?text=Spray+Tank",
    status: "Available",
    rating: 4.5,
    totalBookings: 30,
    specifications: { capacity: "1000L", pump: "40 PSI", condition: "Good", yearMake: 2019 }
  },
  {
    name: "Paddy Transplanter",
    description: "Semi-automatic transplanter for rice seedlings",
    category: "Planting",
    dailyRate: 2200,
    location: "Moga",
    city: "Moga",
    state: "Punjab",
    phone: "9876543218",
    imageUrl: "https://via.placeholder.com/200?text=Transplanter",
    status: "Available",
    rating: 4.7,
    totalBookings: 32,
    specifications: { rowSpacing: "30cm", capacity: "2 rows", condition: "Excellent", yearMake: 2021 }
  },
  {
    name: "Happy Seeder Machine",
    description: "Multi-crop seeder with minimal soil disturbance",
    category: "Seeding",
    dailyRate: 1600,
    location: "Fazilka",
    city: "Fazilka",
    state: "Punjab",
    phone: "9876543219",
    imageUrl: "https://via.placeholder.com/200?text=Happy+Seeder",
    status: "Maintenance",
    rating: 4.6,
    totalBookings: 28,
    specifications: { width: "2m", rows: "9", condition: "Under Maintenance", yearMake: 2020 }
  },
  {
    name: "Rotavator 6ft",
    description: "6-feet rotavator for soil preparation and tilling",
    category: "Tilling",
    dailyRate: 900,
    location: "Sangrur",
    city: "Sangrur",
    state: "Punjab",
    phone: "9876543220",
    imageUrl: "https://via.placeholder.com/200?text=Rotavator",
    status: "Available",
    rating: 4.4,
    totalBookings: 19,
    specifications: { width: "6 ft", depth: "8 inches", condition: "Good", yearMake: 2018 }
  },
  {
    name: "Leveler Equipment",
    description: "Land leveler for smooth and even field surface",
    category: "Leveling",
    dailyRate: 600,
    location: "Rupnagar",
    city: "Rupnagar",
    state: "Punjab",
    phone: "9876543221",
    imageUrl: "https://via.placeholder.com/200?text=Leveler",
    status: "Available",
    rating: 4.3,
    totalBookings: 12,
    specifications: { width: "10 ft", capacity: "5cm", condition: "Good", yearMake: 2019 }
  }
];

async function uploadEquipment() {
  try {
    console.log('🚀 Starting equipment data upload to Firebase...\n');
    let count = 0;

    for (const equipment of equipmentData) {
      try {
        await db.collection('equipment').add({
          ...equipment,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          userId: "system_admin"
        });
        count++;
        console.log(`✅ ${count}. Uploaded: ${equipment.name} (₹${equipment.dailyRate}/day)`);
      } catch (itemError) {
        console.error(`❌ Error uploading ${equipment.name}:`, itemError.message);
      }
    }

    console.log(`\n✨ Successfully uploaded ${count} equipment items to Firestore!`);
    console.log('📱 Equipment will now appear in the app immediately.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error uploading equipment:', error);
    process.exit(1);
  }
}

// Run the upload
uploadEquipment().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
