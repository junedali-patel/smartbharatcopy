
// Category to image mapping for equipment
// TODO: Add actual image files to assets/images/ folder:
// - tractor.png
// - harvester.png
// - sprayer.png
// - seeder.png

export const getCategoryImage = (category: string) => {
  const map: { [key: string]: any } = {
    'Tractor': require('../assets/images/tractor.png'),
    'Harvester': require('../assets/images/harvester.png'),
    'Sprayer': require('../assets/images/weeder.png'),
    'Seeder': require('../assets/images/seeder.png'),
  };
  return map[category] || require('../assets/images/tractor.png');
};
export const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Tractor':
      return 'agriculture';
    case 'Harvester':
      return 'handyman';
    case 'Sprayer':
      return 'water-drop';
    default:
      return 'construction';
  }
};
