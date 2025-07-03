import { firestoreInstance } from '../services/firebase';

const schemes = [
  {
    name: 'Pradhan Mantri Awas Yojana',
    description: 'Housing for All by 2022',
    benefits: [
      'Subsidy on home loan interest',
      'Financial assistance for construction',
      'Affordable housing units'
    ],
    eligibility: [
      'Indian citizen',
      'No pucca house in any part of India',
      'Annual income below specified limit'
    ],
    documents: [
      'Aadhar card',
      'Income certificate',
      'Bank account details'
    ]
  },
  {
    name: 'Pradhan Mantri Kisan Samman Nidhi',
    description: 'Financial support to farmers',
    benefits: [
      '₹6,000 per year in three equal installments',
      'Direct transfer to bank account'
    ],
    eligibility: [
      'Small and marginal farmers',
      'Landholding up to 2 hectares'
    ],
    documents: [
      'Aadhar card',
      'Land ownership documents',
      'Bank account details'
    ]
  },
  {
    name: 'Ayushman Bharat Yojana',
    description: 'Health insurance for poor and vulnerable families',
    benefits: [
      'Health cover of ₹5 lakh per family per year',
      'Cashless hospitalization',
      'Coverage for pre-existing conditions'
    ],
    eligibility: [
      'Families in SECC database',
      'No age limit',
      'No restriction on family size'
    ],
    documents: [
      'Aadhar card',
      'Ration card',
      'Income certificate'
    ]
  }
];

async function initializeSchemes() {
  try {
    const schemesCollection = firestoreInstance.collection('schemes');
    
    // Clear existing schemes
    const existingSchemes = await schemesCollection.get();
    const batch = firestoreInstance.batch();
    
    existingSchemes.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    // Add new schemes
    for (const scheme of schemes) {
      await schemesCollection.add(scheme);
    }
    
    console.log('Schemes initialized successfully');
  } catch (error) {
    console.error('Error initializing schemes:', error);
  }
}

initializeSchemes(); 