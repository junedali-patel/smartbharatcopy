# Firebase Image Storage - Firestore-Based Approach

## Overview
To avoid Firebase Storage costs (requires paid Blaze plan), this app uses **Firestore** to store images as base64-encoded strings. This approach:

✅ **Fits within free tier**: Firestore has generous free quotas
✅ **No CORS issues**: Firestore handles security rules natively
✅ **Works on web and mobile**: Same code for all platforms
✅ **No extra cost**: Included in Firebase free tier (up to 1GB storage)

## How It Works

### Image Storage Flow
1. **User picks image** → Compressed to base64
2. **Stored in Firestore** → `images` collection with user ID
3. **Retrieved on demand** → Converted back to data URI for display

### Firestore Document Structure
```typescript
{
  id: string;              // UUID for the image
  userId: string;          // Current user's UID
  base64: string;          // Base64-encoded image data
  mimeType: string;        // 'image/jpeg', 'image/png', etc.
  filename: string;        // Generated filename
  uploadedAt: number;      // Timestamp
  metadata: {
    width?: number;
    height?: number;
    context: string;       // 'profile', 'service', 'disease-detection'
  }
}
```

## Usage Examples

### Upload Image
```typescript
import FirestoreImageService from '../services/firestoreImageService';

const imageService = FirestoreImageService.getInstance();

// From base64 string
const imageId = await imageService.uploadImage(
  base64String,
  'image/jpeg',
  'profile'
);
```

### Retrieve Image
```typescript
// Returns data URI ready for use in <Image />
const imageUri = await imageService.getImage(imageId);
```

### Delete Image
```typescript
await imageService.deleteImage(imageId);
```

## Updated Components

### 1. **AddServiceForm.tsx** ✅
- Uses Firestore for service images
- Stores image IDs instead of URLs
- No Firebase Storage dependency

### 2. **profile.tsx** ✅
- Avatar images stored in Firestore
- Uses `firestoreImageService`
- No CORS issues

### 3. **CropDiseaseModal.tsx** ✅
- Disease detection images stored in Firestore
- Free tier compatible

## Firestore Quotas (Free Tier)
- **Storage**: 1 GB total (includes all data types)
- **Read operations**: 50,000 per day
- **Write operations**: 20,000 per day
- **Delete operations**: 20,000 per day

For typical usage (profile + service images), this is more than sufficient.

## No Setup Required ✅
- No CORS configuration needed
- No additional Google Cloud SDK setup
- Works immediately after Firebase initialization
- Supports both web and mobile

## Advantages Over Firebase Storage
| Feature | Firestore | Storage |
|---------|-----------|---------|
| **Free Tier** | ✅ Yes | ❌ No (needs Blaze) |
| **CORS** | ✅ Built-in | ❌ Manual config |
| **Web Upload** | ✅ Works | ❌ Limited |
| **Cost** | ✅ Free | ❌ Pay-per-GB |
| **Latency** | ✅ Low | ⚠️ Higher |

## Future Scaling
When your app grows beyond free tier quotas:
1. Upgrade Firestore plan (pay-as-you-go)
2. Or migrate to Cloud Storage with production CORS setup
3. Or implement a backend server to handle uploads

---
**Last Updated**: January 15, 2026
**Approach**: Firestore base64 encoding (free tier friendly)
