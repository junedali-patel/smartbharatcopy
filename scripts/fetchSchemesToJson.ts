import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import app from '../config/firebase';

async function fetchSchemesToJson() {
  // Use the already-initialized Firebase app
  const db = getFirestore(app);

  // Fetch all schemes
  const schemesCol = collection(db, 'schemes');
  const snapshot = await getDocs(schemesCol);
  const schemes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Write to JSON file
  const outputPath = path.join(__dirname, '../constants/schemes.json');
  fs.writeFileSync(outputPath, JSON.stringify(schemes, null, 2), 'utf-8');
  console.log(`Fetched ${schemes.length} schemes and wrote to constants/schemes.json`);
}

fetchSchemesToJson().catch(err => {
  console.error('Error fetching schemes:', err);
  process.exit(1);
}); 