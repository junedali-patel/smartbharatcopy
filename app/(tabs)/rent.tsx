import React from 'react';
import FarmerServicesModal from '../../components/FarmerServicesModal';

// Use a true no-op function to ensure isFullPage is always true in FarmerServicesModal
const noop = () => {};

export default function RentScreen() {
  // Render the FarmerServicesModal logic as a full page (visible always)
  return <FarmerServicesModal visible={true} onClose={noop} />;
} 