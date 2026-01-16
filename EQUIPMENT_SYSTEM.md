# Equipment Rental System - User Data Upload Guide

## How It Works

The equipment rental system now allows **real users** to add their own equipment listings through the app. No more mock data!

### How Users Add Equipment

1. **Login** - Users must be authenticated with their Google/Firebase account
2. **Go to Equipment Tab** - Navigate to the "Rent" tab
3. **Tap "List Equipment" Button** - The blue FAB button with "+" icon in the bottom-right
4. **Fill the Form** with:
   - Equipment name (e.g., "Mahindra 475 Tractor")
   - Description (optional)
   - Category (Tractor, Harvester, Sprayer, etc.)
   - Daily rate in ₹ (e.g., 1500)
   - Location/Address
   - City
   - State
   - Phone number for contact

5. **Publish** - Tap "Publish Listing" to submit

### What Happens Next

- Equipment appears **immediately** in the equipment marketplace
- Only authenticated users can add equipment (Firebase Security Rules enforced)
- Users can only edit/delete their own equipment
- All users can view all equipment listings

## Firebase Security Rules

Updated `firestore.rules` to allow:
- ✅ **Anyone** can read all equipment listings
- ✅ **Authenticated users** can create new equipment listings
- ✅ **Users** can only update/delete their own equipment
- ✅ Required fields are validated: name, dailyRate, category, city, state, phone

## Testing the System

### Method 1: Add Real Equipment Manually
1. Login with your test account
2. Go to Equipment tab
3. Click "List Equipment" button
4. Fill the form with real equipment data:
   - Name: "John Deere Tractor"
   - Daily Rate: 2000
   - Category: Tractor
   - City: Chandigarh
   - State: Punjab
   - Phone: 9876543210
5. Tap "Publish Listing"
6. Equipment appears in the list immediately!

### Method 2: Invite Friends
- Share the app with your actual farming community
- They can login with their accounts and add their equipment
- Build a real marketplace of equipment rental listings

## Backend Integration

The system uses:
- **Firebase Firestore** for data storage
- **Firebase Auth** for user authentication
- **React Native** for the mobile interface
- **equipmentService.ts** for all CRUD operations

### Equipment Data Structure
```typescript
{
  id: string;
  userId: string;                    // Owner's Firebase UID
  name: string;                      // Equipment name
  description: string;               // Details
  category: string;                  // Tractor, Harvester, etc.
  dailyRate: number;                 // Price in ₹
  location: string;                  // Address
  city: string;                      // City name
  state: string;                     // State name
  phone: string;                     // Contact number
  imageUrl: string;                  // Placeholder image
  status: "Available" | "Rented" | "Maintenance";
  rating: number;                    // 0-5 stars
  totalBookings: number;             // Count of rentals
  specifications: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Next Steps

Once users start adding equipment:
1. ✅ Equipment listings show in real-time
2. 🔄 Add booking request functionality
3. 🔄 Implement reviews and ratings
4. 🔄 Add equipment search and filters
5. 🔄 Implement messaging between users
6. 🔄 Payment integration

## Troubleshooting

**Q: Equipment not showing after publish?**
- A: Make sure you're logged in. Check Firebase console to see if data was saved.

**Q: Can't add equipment?**
- A: You need to be logged in first. Make sure your Firebase auth is working.

**Q: Want to delete equipment?**
- A: Swipe left on equipment item (coming soon) or use admin dashboard.

---

**Status**: ✅ Production Ready - Real user data only, no mocks!
