import schemesData from '../constants/schemes.json';

export interface Scheme {
  id: string;
  schemeId: number;
  title: string;
  state: string;
  category: string;
  description: string;
  criteria?: string;
  language?: Record<string, string | undefined>;
  applyLink: string;
  eligibilityCriteria?: Record<string, any>;
}

export class SchemeService {
  private schemes: Scheme[] = schemesData;

  /**
   * Detect if the user's message mentions any government schemes
   */
  detectScheme(userMessage: string): Scheme | null {
    const message = userMessage.toLowerCase();
    
    // Create a comprehensive scheme mapping with multiple variations
    const schemeMappings = [
      {
        id: 'H8syNApWh1PmLyoVQ0oK',
        keywords: [
          'kisan credit card', 'kcc', 'credit card', 'loan',
          'किसान क्रेडिट कार्ड', 'केसीसी', 'किसान क्रेडिट',
          'ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್', 'ಕೆಸಿಸಿ', 'ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್',
          'किसान क्रेडिट कार्ड', 'केसीसी', 'किसान क्रेडिट',
          'ਕਿਸਾਨ ਕ੍ਰੈਡਿਟ ਕਾਰਡ', 'ਕੇਸੀਸੀ', 'ਕਿਸਾਨ ਕ੍ਰੈਡਿਟ',
          'કિસાન ક્રેડિટ કાર્ડ', 'કેસીસી', 'કિસાન ક્રેડિટ',
          'কৃষক ক্রেডিট কার্ড', 'কেসিসি', 'কৃষক ক্রেডিট'
        ]
      },
      {
        id: '1KZkXXxJJtZlBeZpMlPi',
        keywords: [
          'pm kisan', 'pradhan mantri kisan samman nidhi', 'samman nidhi',
          'पीएम किसान', 'प्रधानमंत्री किसान सम्मान निधि', 'किसान सम्मान',
          'ಪಿಎಂ ಕಿಸಾನ್', 'ಪ್ರಧಾನಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ ನಿಧಿ', 'ಕಿಸಾನ್ ಸಮ್ಮಾನ',
          'पीएम किसान', 'प्रधानमंत्री किसान सम्मान निधी', 'किसान सम्मान',
          'ਪੀਐਮ ਕਿਸਾਨ', 'ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਕਿਸਾਨ ਸਮਾਨ ਨਿਧੀ', 'ਕਿਸਾਨ ਸਮਾਨ',
          'પીએમ કિસાન', 'પ્રધાનમંત્રી કિસાન સમ્માન નિધી', 'કિસાન સમ્માન',
          'পিএম কৃষক', 'প্রধানমন্ত্রী কৃষক সম্মান নিধি', 'কৃষক সম্মান'
        ]
      },
      {
        id: 'loG2T12FvKmpCn1z1hfg',
        keywords: [
          'pm fasal bima', 'pmfby', 'fasal bima', 'crop insurance',
          'पीएम फसल बीमा', 'पीएमएफबीवाई', 'फसल बीमा',
          'ಪಿಎಂ ಫಸಲ್ ಬಿಮಾ', 'ಪಿಎಂಎಫ್ಬಿವೈ', 'ಫಸಲ್ ಬಿಮಾ',
          'पीएम फसल बीमा', 'पीएमएफबीवाई', 'फसल बीमा',
          'ਪੀਐਮ ਫਸਲ ਬੀਮਾ', 'ਪੀਐਮਐਫਬੀਵਾਈ', 'ਫਸਲ ਬੀਮਾ',
          'પીએમ ફસલ બીમા', 'પીએમએફબીયાઈ', 'ફસલ બીમા',
          'পিএম ফসল বিমা', 'পিএমএফবিওয়াই', 'ফসল বিমা'
        ]
      },
      {
        id: 'Fh02j5VkknebhLctDGUu',
        keywords: [
          'soil health card', 'soil card', 'soil health',
          'मिट्टी स्वास्थ्य कार्ड', 'मिट्टी कार्ड', 'मिट्टी स्वास्थ्य',
          'ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್', 'ಮಣ್ಣಿನ ಕಾರ್ಡ್', 'ಮಣ್ಣಿನ ಆರೋಗ್ಯ',
          'माती आरोग्य कार्ड', 'माती कार्ड', 'माती आरोग्य',
          'ਮਿੱਟੀ ਸਿਹਤ ਕਾਰਡ', 'ਮਿੱਟੀ ਕਾਰਡ', 'ਮਿੱਟੀ ਸਿਹਤ',
          'જમીન સ્વાસ્થ્ય કાર્ડ', 'જમીન કાર્ડ', 'જમીન સ્વાસ્થ્ય',
          'মাটি স্বাস্থ্য কার্ড', 'মাটি কার্ড', 'মাটি স্বাস্থ্য'
        ]
      },
      {
        id: 'kL3sugkcJGiTfmXTPHyd',
        keywords: [
          'national food security mission', 'nfsm', 'food security',
          'राष्ट्रीय खाद्य सुरक्षा मिशन', 'एनएफएसएम', 'खाद्य सुरक्षा',
          'ರಾಷ್ಟ್ರೀಯ ಆಹಾರ ಭದ್ರತೆ ಮಿಷನ್', 'ಎನ್ಎಫ್ಎಸ್ಎಂ', 'ಆಹಾರ ಭದ್ರತೆ',
          'राष्ट्रीय खाद्य सुरक्षा मिशन', 'एनएफएसएम', 'खाद्य सुरक्षा',
          'ਰਾਸ਼ਟਰੀ ਖਾਦ ਸੁਰੱਖਿਆ ਮਿਸ਼ਨ', 'ਐਨਐਫਐਸਐਮ', 'ਖਾਦ ਸੁਰੱਖਿਆ',
          'રાષ્ટ્રીય ખાદ્ય સુરક્ષા મિશન', 'એનએફએસએમ', 'ખાદ્ય સુરક્ષા',
          'জাতীয় খাদ্য নিরাপত্তা মিশন', 'এনএফএসএম', 'খাদ্য নিরাপত্তা'
        ]
      },
      {
        id: 'cw0YrsNqflPjdRhQAUvJ',
        keywords: [
          'paramparagat krishi vikas yojana', 'pkvy', 'organic farming',
          'परंपरागत कृषि विकास योजना', 'पीकेवीवाई', 'जैविक खेती',
          'ಪಾರಂಪರಿಕ ಕೃಷಿ ವಿಕಾಸ ಯೋಜನೆ', 'ಪಿಕೆವಿವೈ', 'ಸಾವಯವ ಕೃಷಿ',
          'परंपरागत कृषि विकास योजना', 'पीकेवीवाई', 'जैविक खेती',
          'ਪਰੰਪਰਾਗਤ ਕ੍ਰਿਸ਼ੀ ਵਿਕਾਸ ਯੋਜਨਾ', 'ਪੀਕੇਵੀਵਾਈ', 'ਜੈਵਿਕ ਖੇਤੀ',
          'પરંપરાગત કૃષિ વિકાસ યોજના', 'પીકેવીયાઈ', 'જૈવિક ખેતી',
          'পরম্পরাগত কৃষি বিকাশ প্রকল্প', 'পিকেভিওয়াই', 'জৈবিক চাষ'
        ]
      }
    ];

    // Check for exact matches first
    for (const scheme of this.schemes) {
      const title = scheme.title.toLowerCase();
      const shortTitle = this.getShortTitle(scheme.title);
      
      if (message.includes(title) || message.includes(shortTitle)) {
        return scheme;
      }
    }

    // Check for flexible keyword matching
    for (const mapping of schemeMappings) {
      for (const keyword of mapping.keywords) {
        if (message.includes(keyword.toLowerCase())) {
          return this.schemes.find(scheme => scheme.id === mapping.id) || null;
        }
      }
    }

    // Check for partial word matches (for cases like "kisan credit scheme")
    const partialMatches = [
      { words: ['kisan', 'credit'], schemeId: 'H8syNApWh1PmLyoVQ0oK' },
      { words: ['pm', 'kisan'], schemeId: '1KZkXXxJJtZlBeZpMlPi' },
      { words: ['soil', 'health'], schemeId: 'Fh02j5VkknebhLctDGUu' },
      { words: ['food', 'security'], schemeId: 'kL3sugkcJGiTfmXTPHyd' },
      { words: ['organic', 'farming'], schemeId: 'cw0YrsNqflPjdRhQAUvJ' }
    ];

    for (const match of partialMatches) {
      const allWordsPresent = match.words.every(word => 
        message.includes(word.toLowerCase())
      );
      if (allWordsPresent) {
        return this.schemes.find(scheme => scheme.id === match.schemeId) || null;
      }
    }

    return null;
  }

  /**
   * Get short title for better matching
   */
  private getShortTitle(fullTitle: string): string {
    // Extract common abbreviations and short forms
    const shortForms: Record<string, string> = {
      'pradhan mantri kisan samman nidhi': 'pm kisan',
      'pm kisan samman nidhi': 'pm kisan',
      'pradhan mantri fasal bima yojana': 'pmfby',
      'pm fasal bima yojana': 'pmfby',
      'pradhan mantri krishi sinchayee yojana': 'pmksy',
      'pm krishi sinchayee yojana': 'pmksy',
      'kisan credit card': 'kcc',
      'soil health card': 'soil health card',
      'national food security mission': 'nfsm',
      'paramparagat krishi vikas yojana': 'pkvy',
      'rashtriya krishi vikas yojana': 'rkvy',
      'national mission for sustainable agriculture': 'nmsa',
      'pradhan mantri annadata aay sanrakshan abhiyan': 'pm-aasha',
      'pm annadata aay sanrakshan abhiyan': 'pm-aasha',
      'sub-mission on agricultural mechanization': 'smam',
      'agriculture infrastructure fund': 'aif',
      'national beekeeping & honey mission': 'nbhm',
      'fisheries and aquaculture infrastructure development fund': 'fidf',
      'zero budget natural farming': 'zbnf',
      'mahatma gandhi national rural employment guarantee act': 'mgnrega'
    };

    const lowerTitle = fullTitle.toLowerCase();
    for (const [full, short] of Object.entries(shortForms)) {
      if (lowerTitle.includes(full)) {
        return short;
      }
    }

    return fullTitle.toLowerCase();
  }

  /**
   * Get keywords for each scheme for better detection
   */
  private getSchemeKeywords(scheme: Scheme): string[] {
    const keywords: string[] = [];
    
    // Add title words
    const titleWords = scheme.title.toLowerCase().split(' ');
    keywords.push(...titleWords);
    
    // Add category
    keywords.push(scheme.category.toLowerCase());
    
    // Add state if not ALL
    if (scheme.state !== 'ALL') {
      keywords.push(scheme.state.toLowerCase());
    }
    
    // Add scheme-specific keywords (avoiding conflicts)
    const schemeSpecificKeywords: Record<string, string[]> = {
      'H8syNApWh1PmLyoVQ0oK': ['kisan credit card', 'kcc', 'credit card', 'loan'],
      '1KZkXXxJJtZlBeZpMlPi': ['pm kisan', 'pradhan mantri kisan samman nidhi', 'samman nidhi'],
      'loG2T12FvKmpCn1z1hfg': ['pm fasal bima', 'pmfby', 'fasal bima', 'crop insurance'],
      'Fh02j5VkknebhLctDGUu': ['soil health card', 'soil card', 'soil health'],
      'kL3sugkcJGiTfmXTPHyd': ['national food security mission', 'nfsm', 'food security'],
      'cw0YrsNqflPjdRhQAUvJ': ['paramparagat krishi vikas yojana', 'pkvy', 'organic farming'],
      'n24Kll1uaTEuWUeLvfi8': ['rashtriya krishi vikas yojana', 'rkvy', 'agriculture development'],
      'qsVpW2RpNnzs8EMkZCn9': ['national mission for sustainable agriculture', 'nmsa', 'sustainable agriculture'],
      'aUEmgE5RnTiyIin3oxb2': ['pradhan mantri annadata aay sanrakshan abhiyan', 'pm-aasha', 'annadata'],
      'MqBnYA4xucyPfw786Ke5': ['sub-mission on agricultural mechanization', 'smam', 'agricultural mechanization'],
      'c8tfYwEAoBOMKlvDQebS': ['agriculture infrastructure fund', 'aif', 'infrastructure fund'],
      '6cfuGNyfwpxsGvuEMiKd': ['national beekeeping', 'nbhm', 'beekeeping', 'honey mission'],
      '4Pos6QGDpY503iguWWcA': ['fisheries and aquaculture infrastructure development fund', 'fidf', 'fisheries'],
      'whjKtFEWI6YflAikppee': ['zero budget natural farming', 'zbnf', 'natural farming'],
      'nhKw31KR22S4hZXUquyM': ['mahatma gandhi national rural employment guarantee act', 'mgnrega', 'employment guarantee']
    };
    
    // Add scheme-specific keywords if available
    if (schemeSpecificKeywords[scheme.id]) {
      keywords.push(...schemeSpecificKeywords[scheme.id]);
    }
    
    // Add common scheme keywords (but avoid conflicts)
    const commonKeywords = [
      'scheme', 'yojana', 'mission', 'fund', 'insurance', 'pension',
      'farmer', 'agriculture', 'farming', 'crop', 'soil', 'water',
      'irrigation', 'organic', 'bima', 'samman', 'nyay', 'bandhu'
    ];
    
    keywords.push(...commonKeywords);
    
    return keywords;
  }

  /**
   * Get all schemes for display
   */
  getAllSchemes(): Scheme[] {
    return this.schemes;
  }

  /**
   * Get schemes by category
   */
  getSchemesByCategory(category: string): Scheme[] {
    return this.schemes.filter(scheme => 
      scheme.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Get schemes by state
   */
  getSchemesByState(state: string): Scheme[] {
    return this.schemes.filter(scheme => 
      scheme.state === 'ALL' || scheme.state.toLowerCase() === state.toLowerCase()
    );
  }
}

export default new SchemeService(); 