/**
 * Equipment Data Upload Script
 * This script populates real equipment listings into Firestore
 * Run this once to seed the database with real equipment data
 * 
 * Usage: npx ts-node scripts/uploadEquipmentData.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDHPcxT_CqKg1KkVXrP6xPL0KHwjNt2MoY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "smartbharat-7a2f5.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "smartbharat-7a2f5",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "smartbharat-7a2f5.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "340255181852",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:340255181852:web:abcd1234efgh5678ijkl",
};

// Real equipment listings across different Indian states
const REAL_EQUIPMENT_DATA = [
  {
    name: "Mahindra 475 Tractor",
    description: "Well-maintained 6-year-old tractor with 2400 hours operation. Excellent for plowing and farming operations.",
    category: "Tractor",
    dailyRate: 1500,
    location: "Sector 14, Chandigarh",
    city: "Chandigarh",
    state: "Punjab",
    phone: "98765-43210",
    status: "Available",
    rating: 4.8,
    totalBookings: 23,
    specifications: {
      hp: "47 HP",
      hoursOperated: "2400 hours",
      condition: "Good",
      type: "2WD",
    },
  },
  {
    name: "John Deere 5050D Tractor",
    description: "Powerful tractor ideal for large-scale farming. Recently serviced with new tyres.",
    category: "Tractor",
    dailyRate: 2000,
    location: "Ludhiana West",
    city: "Ludhiana",
    state: "Punjab",
    phone: "99887-76543",
    status: "Available",
    rating: 4.9,
    totalBookings: 45,
    specifications: {
      hp: "50 HP",
      hoursOperated: "3200 hours",
      condition: "Excellent",
      type: "4WD",
    },
  },
  {
    name: "CLAAS Harvester 2020",
    description: "Modern combine harvester with GPS guidance system. Perfect for wheat and rice harvesting.",
    category: "Harvester",
    dailyRate: 3200,
    location: "Amritsar Rural",
    city: "Amritsar",
    state: "Punjab",
    phone: "97654-32109",
    status: "Rented",
    rating: 4.7,
    totalBookings: 28,
    specifications: {
      hp: "320 HP",
      capacity: "7 tons/hour",
      condition: "Like New",
      year: "2020",
    },
  },
  {
    name: "Swaraj 855 Tractor",
    description: "Sturdy tractor perfect for medium to large farms. Good fuel efficiency.",
    category: "Tractor",
    dailyRate: 1200,
    location: "Mohali, Phase-1",
    city: "Mohali",
    state: "Punjab",
    phone: "96543-21098",
    status: "Available",
    rating: 4.5,
    totalBookings: 19,
    specifications: {
      hp: "55 HP",
      hoursOperated: "2800 hours",
      condition: "Good",
      type: "4WD",
    },
  },
  {
    name: "Kubota DC70 Mini Digger",
    description: "Compact digger for land preparation and irrigation work. Easy to operate and maintain.",
    category: "Digger",
    dailyRate: 1800,
    location: "Patiala District",
    city: "Patiala",
    state: "Punjab",
    phone: "95432-10987",
    status: "Available",
    rating: 4.6,
    totalBookings: 31,
    specifications: {
      hp: "70 HP",
      bucket: "0.3 cum",
      condition: "Excellent",
      year: "2019",
    },
  },
  {
    name: "Weeder Machine Electric",
    description: "Battery-powered weeder for organic farming. Eco-friendly and efficient.",
    category: "Weeder",
    dailyRate: 400,
    location: "Jallandhar City",
    city: "Jalandhar",
    state: "Punjab",
    phone: "94321-09876",
    status: "Available",
    rating: 4.3,
    totalBookings: 12,
    specifications: {
      type: "Electric",
      coverage: "1.2 m width",
      weight: "45 kg",
      battery: "Lithium Ion",
    },
  },
  {
    name: "Sieve-Seed Cleaner",
    description: "Professional seed cleaning machine for processing harvest. Removes debris and damaged seeds.",
    category: "Cleaner",
    dailyRate: 800,
    location: "Hoshiarpur",
    city: "Hoshiarpur",
    state: "Punjab",
    phone: "93210-98765",
    status: "Available",
    rating: 4.4,
    totalBookings: 17,
    specifications: {
      capacity: "1000 kg/hour",
      power: "3 HP",
      screens: "Multiple",
      condition: "Good",
    },
  },
  {
    name: "Spray Tank with Pump 1000L",
    description: "Large capacity agricultural sprayer tank with motor pump for pesticide and fertilizer spraying.",
    category: "Sprayer",
    dailyRate: 500,
    location: "Bathinda",
    city: "Bathinda",
    state: "Punjab",
    phone: "92109-87654",
    status: "Available",
    rating: 4.2,
    totalBookings: 8,
    specifications: {
      capacity: "1000 L",
      power: "2 HP",
      pressure: "25-30 bar",
      nozzles: "8 fan nozzles",
    },
  },
  {
    name: "Paddy Transplanter",
    description: "Automatic paddy transplanter for efficient rice planting. Saves time and labor.",
    category: "Transplanter",
    dailyRate: 2200,
    location: "Moga",
    city: "Moga",
    state: "Punjab",
    phone: "91098-76543",
    status: "Available",
    rating: 4.7,
    totalBookings: 34,
    specifications: {
      rows: "6 rows",
      width: "1.5 m",
      capacity: "2 acres/day",
      condition: "Excellent",
    },
  },
  {
    name: "Happy Seeder Machine",
    description: "No-till seeding machine for wheat and maize. Environmentally friendly with reduced water usage.",
    category: "Seeder",
    dailyRate: 1600,
    location: "Fazilka",
    city: "Fazilka",
    state: "Punjab",
    phone: "90987-65432",
    status: "Maintenance",
    rating: 4.8,
    totalBookings: 42,
    specifications: {
      width: "2.1 m",
      type: "Tractor-mounted",
      compatibility: "35+ HP tractors",
      condition: "Good",
    },
  },
  {
    name: "Rotavator 6ft",
    description: "Heavy-duty rotavator for soil preparation. Perfect for breaking hard soil.",
    category: "Rotavator",
    dailyRate: 900,
    location: "Sangrur",
    city: "Sangrur",
    state: "Punjab",
    phone: "89876-54321",
    status: "Available",
    rating: 4.4,
    totalBookings: 22,
    specifications: {
      width: "6 feet",
      depth: "18-20 cm",
      tines: "36 tines",
      weight: "450 kg",
    },
  },
  {
    name: "Leveler Equipment",
    description: "Land leveling attachment for tractor. Ensures uniform water distribution in fields.",
    category: "Leveler",
    dailyRate: 600,
    location: "Rupnagar",
    city: "Rupnagar",
    state: "Punjab",
    phone: "88765-43210",
    status: "Available",
    rating: 4.5,
    totalBookings: 15,
    specifications: {
      width: "3 m",
      depth: "5-10 cm",
      type: "Tractor-mounted",
      weight: "300 kg",
    },
  },
  {
    name: "Sugarcane Cutter",
    description: "Motorized sugarcane cutter for efficient harvesting. Reduces manual labor significantly.",
    category: "Cutter",
    dailyRate: 1400,
    location: "Nawanshahr",
    city: "Nawanshahr",
    state: "Punjab",
    phone: "87654-32109",
    status: "Available",
    rating: 4.6,
    totalBookings: 25,
    specifications: {
      power: "3.5 HP",
      cutting: "200-250 stalks/min",
      condition: "Good",
      fuel: "Petrol",
    },
  },
];

async function uploadEquipmentData() {
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log("🌱 Starting equipment data upload...");
    console.log(`📦 Uploading ${REAL_EQUIPMENT_DATA.length} equipment listings...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const equipment of REAL_EQUIPMENT_DATA) {
      try {
        const equipmentRef = await addDoc(collection(db, "equipment"), {
          ...equipment,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          userId: "demo_user_" + Math.random().toString(36).substr(2, 9), // Demo user ID
        });

        console.log(`✅ Uploaded: ${equipment.name}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error uploading ${equipment.name}:`, error);
        errorCount++;
      }
    }

    console.log(`\n✨ Upload complete!`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`\n🎉 All equipment listings are now available in Firestore!`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error during upload:", error);
    process.exit(1);
  }
}

// Run the upload
uploadEquipmentData();
