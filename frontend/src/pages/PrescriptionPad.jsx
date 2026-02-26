import React, { useRef, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { FiEdit3, FiVideo, FiLink2, FiCopy, FiSettings, FiX, FiDownload, FiBookmark } from 'react-icons/fi';
import { useToast } from '../hooks/useToast';
import { useApiClient } from '../api/client';
import { useAuth } from '../hooks/useAuth';  // Make sure this exists
import { useTranslation } from '../context/LanguageContext';
const Letterhead = lazy(() => import('../components/Letterhead'));
const SpecialtySelector = lazy(() => import('../components/specialty/SpecialtySelector'));
const RepeatPrescriptionButton = lazy(() => import('../components/RepeatPrescriptionButton'));
const PrescriptionA5Format = lazy(() => import('../components/PrescriptionA5Format'));
import { downloadPrescriptionPDF } from '../services/pdfService';

// PHASE 1: Import Quick Wins utilities
import {
  quickTemplates,
  applyCompleteTemplate,
  keyboardShortcuts,
  RecentlyUsedMedicines
} from '../utils/prescriptionEnhancements';

// PHASE 2: Import Advanced Features
import {
  SmartMedicationCombos,
  RecentlyUsedMedicinesSidebar,
  DosageCalculator,
  VoiceToTextInput,
  DrugInteractionChecker,
  ComplianceTracker,
  SplitViewLayout,
  initializePrescriptionEnhancements
} from '../utils/PrescriptionPadEnhancements';

const symptomSuggestions = ['Fever', 'Cough', 'Headache', 'Fatigue', 'Nausea', 'Dizziness', 'Pain', 'Weakness'];
const diagnosisSuggestions = ['Hypertension', 'Diabetes', 'URI', 'Migraine', 'Gastritis', 'Anemia', 'Asthma'];

const predefinedAdvice = {
  en: [
    'Plenty of liquids',
    'Steaming gargling',
    'Rest well',
    'Avoid spicy food',
    'Take medicines on time',
    'Follow up if symptoms persist'
  ],
  hi: [
    'खूब सारे तरल पदार्थ लें',
    'भाप और गरारे करें',
    'अच्छे से आराम करें',
    'मसालेदार भोजन से बचें',
    'समय पर दवाई लें',
    'लक्षण बने रहने पर फॉलो-अप करें'
  ],
  mr: [
    'भरपूर द्रव पदार्थ घ्या',
    'वाफ आणि गरारे करा',
    'चांगली विश्रांती घ्या',
    'मसालेदार अन्न टाळा',
    'वेळेवर औषध घ्या',
    'लक्षणे कायम राहिल्यास फॉलो-अप करा'
  ],
  bn: [
    'প্রচুর তরল গ্রহণ করুন',
    'বাষ্প এবং গড়গড় করুন',
    'ভালোভাবে বিশ্রাম নিন',
    'ঝালযুক্ত খাবার এড়িয়ে চলুন',
    'সময়মতো ওষুধ সেবন করুন',
    'উপসর্গ থাকলে ফলো-আপ করুন'
  ],
  gu: [
    'પૂરતી પ્રવાહી પદાર્થ લો',
    'વરાળ અને ગરારા કરો',
    'સારી રીતે આરામ કરો',
    'તીખું ખાવાનો ટાળો',
    'સમયે દવા લો',
    'લક્ષણો રહેલા હોય તો ફોલો-અપ કરો'
  ],
  ta: [
    'நிறைய திரவங்களை எடுக்கவும்',
    'நீராவிப்பு மற்றும் கரகரக்க செய்யவும்',
    'நன்கு ஓய்வெடுக்கவும்',
    'காரமான உணவைத் தவிர்க்கவும்',
    'சரியான நேரத்தில் மருந்துகளை எடுக்கவும்',
    'அறிகுறிகள் தொடர்ந்தால் பின்தொடர்வு செய்யவும்'
  ],
  te: [
    'సమృద్ధిగా ద్రవాలు తీసుకోండి',
    'ఆవిరం మరియు గారగారాలు చేయండి',
    'బాగా విశ్రాంతి తీసుకోండి',
    'మసాలా ఆహారాన్ని నివారించండి',
    'సమయానికి మందులు తీసుకోండి',
    'లక్షణాలు కొనసాగితే ఫాలో-అప్ చేయండి'
  ],
  kn: [
    'ಹೆಚ್ಚಿನ ದ್ರವಗಳನ್ನು ಸೇವಿಸಿ',
    'ಆವಿ ಮತ್ತು ಗರಗರನೆ ಮಾಡಿ',
    'ಚೆನ್ನಾಗಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ',
    'ಖಾರದ ಆಹಾರವನ್ನು ತಡೆಹಿಡಿರಿ',
    'ಸಮಯಕ್ಕೆ ಔಷಧಿಗಳನ್ನು ಸೇವಿಸಿ',
    'ರೋಗಲಕ್ಷಣಗಳು ಮುಂದುವರಿದರೆ ಫಾಲೋ-ಅಪ್ ಮಾಡಿ'
  ],
  ml: [
    'ധാരാളം ദ്രാവകങ്ങൾ കഴിക്കുക',
    'ആവിയും ഗാർഗാറും ചെയ്യുക',
    'നന്നായി വിശ്രമിക്കുക',
    'മസാല ഭക്ഷണം ഒഴിവാക്കുക',
    'സമയത്ത് മരുന്നുകൾ കഴിക്കുക',
    'ലക്ഷണങ്ങൾ തുടരുന്നെങ്കിൽ ഫോളോ-അപ്പ് ചെയ്യുക'
  ],
  pa: [
    'ਬਹੁਤ ਸਾਰੇ ਤਰਲ ਪਦਾਰਥ ਲਓ',
    'ਭਾਫ ਅਤੇ ਗਰਾਰੇ ਕਰੋ',
    'ਚੰਗੀ ਤਰ੍ਹਾਂ ਆਰਾਮ ਕਰੋ',
    'ਮਸਾਲੇਦਾਰ ਖਾਣਾ ਤੋਂ ਬਚੋ',
    'ਸਮੇਂ ਤੇ ਦਵਾਈ ਲਓ',
    'ਲੱਛਣ ਰਹਿਤਾਂ ਫਾਲੋ-ਅਪ ਕਰੋ'
  ],
  ur: [
    'بہت سارے مائعات لیں',
    'بھاپ اور غرارے کریں',
    'اچھی طرح آرام کریں',
    'مصالحے دار کھانا سے بچیں',
    'وقت پر دوا لیں',
    'علامات رہنے پر فالو اپ کریں'
  ]
};

const instructionLanguages = [
  { code: 'hi', name: 'हिंदी - Hindi' },
  { code: 'en', name: 'English' },
  { code: 'mr', name: 'मराठी - Marathi' },
  { code: 'bn', name: 'বাংলা - Bengali' },
  { code: 'gu', name: 'ગુજરાતી - Gujarati' },
  { code: 'ta', name: 'தமிழ் - Tamil' },
  { code: 'te', name: 'తెలుగు - Telugu' },
  { code: 'kn', name: 'ಕನ್ನಡ - Kannada' },
  { code: 'ml', name: 'മലയാളം - Malayalam' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ - Punjabi' },
  { code: 'ur', name: 'اردو - Urdu' }
];

const timingOptions = {
  en: [
    'After Meal',
    'Before Breakfast',
    'Before Meal',
    'Empty Stomach',
    'With Food'
  ],
  hi: [
    'खाने के बाद',
    'नाश्ते से पहले',
    'खाने से पहले',
    'खाली पेट',
    'खाने के साथ'
  ],
  mr: [
    'जेवणानंतर',
    'नाश्त्यापूर्वी',
    'जेवणापूर्वी',
    'रिकाम्या पोटी',
    'जेवणासोबत'
  ],
  bn: [
    'খাওয়ার পরে',
    'সকালের খাবারের আগে',
    'খাবারের আগে',
    'পেট খালি',
    'খাবারের সাথে'
  ],
  gu: [
    'ખાણ પછી',
    'નાસ્તા પહેલાં',
    'ખાણ પહેલાં',
    'પેટ ખાલી',
    'ખાણ સાથે'
  ],
  ta: [
    'உணவுக்குப் பின்',
    'காலை உணவுக்கு முன்',
    'உணவுக்கு முன்',
    'வயிற்று காலி',
    'உணவுடன்'
  ],
  te: [
    'భోజనం తర్వాత',
    'అర్థాన్నికి ముందు',
    'భోజనానికి ముందు',
    'ఖాలీ పేట',
    'భోజనంతో'
  ],
  kn: [
    'ಊಟದ ನಂತರ',
    'ಬೆಳಿಗ್ಗೆ ಊಟಕ್ಕೂ ಮೊದು',
    'ಊಟಕ್ಕೂ ಮೊದು',
    'ಖಾಲಿ ಹೊಟ್ಟ',
    'ಊಟದೊಂದಿಗೆ'
  ],
  ml: [
    'ഭക്ഷണത്തിനു ശേഷം',
    'രാവിലെ ഭക്ഷണത്തിനു മുമ്പ്',
    'ഭക്ഷണത്തിനു മുമ്പ്',
    'വയറു ശൂന്യം',
    'ഭക്ഷണത്തോടൊപ്പം'
  ],
  pa: [
    'ਖਾਣ ਤੋਂ ਬਾਅਦ',
    'ਸਵੇਰ ਤੋਂ ਪਹਿਲਾਂ',
    'ਖਾਣ ਤੋਂ ਪਹਿਲਾਂ',
    'ਖਾਲੀ ਪੇਟ',
    'ਖਾਣ ਨਾਲ'
  ],
  ur: [
    'کھنے کے بعد',
    'ناشتے سے پہلے',
    'کھانے سے پہلے',
    'بھیجے پیٹ',
    'کھانے کے ساتھ'
  ]
};

const allFrequencyPresets = [
  '1-0-1', '1-1-1', '0-0-1', '1-0-0', '0-1-0',
  '1/2-0-1/2', '1/2-1/2-1/2', '1-1-1-1', '0-0-0-1', '1-0-0-0',
  '1-0-1-0', '0-1-0-1', '1/2-0-0', '0-0-1/2', 'SOS',
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 8 hours', 'Every 12 hours', 'Weekly', 'Stat'
];
const frequencyOptions = {
  en: ['1-0-1', '1-1-1', '0-0-1', '1-0-0', '0-1-0', 'SOS'],
  hi: ['1-0-1', '1-1-1', '0-0-1', '1-0-0', '0-1-0', 'ज़रूरत पर'],
  mr: ['1-0-1', '1-1-1', '0-0-1', '1-0-0', '0-1-0', 'गरजेनुसार'],
  bn: ['1-0-1', '1-1-1', '0-0-1', '1-0-0', '0-1-0', 'প্রয়োজনে'],
  gu: ['1-0-1', '1-1-1', '0-0-1', '1-0-0', '0-1-0', 'જરૂરીયાત'],
  ta: ['1-0-1', '1-1-1', '0-0-1', '1-0-0', '0-1-0', 'தேவைப்படி'],
  te: ['1-0-1', '1-1-1', '0-0-1', '1-0-0', '0-1-0', 'అవసరానుగుణంగా'],
  kn: ['1-0-1', '1-1-1', '0-0-1', '1-0-0', '0-1-0', 'ಅಗತ್ಯಾನುಸಾರ'],
  ml: ['1-0-1', '1-1-1', '0-0-1', '1-0-0', '0-1-0', 'ആവശ്യമെന്ന്'],
  pa: ['1-0-1', '1-1-1', '0-0-1', '1-0-0', '0-1-0', 'ਲੋੜ ਪਈਂ'],
  ur: ['1-0-1', '1-1-1', '0-0-1', '1-0-0', '0-1-0', 'ضرورت پڑ']
};
// Instruction translations for all supported languages
const INSTRUCTION_TRANSLATIONS = {
      'After food to avoid gastric irritation': {
        en: 'After food to avoid gastric irritation',
        hi: 'गैस्ट्रिक जलन से बचने के लिए खाने के बाद',
        mr: 'जठरामाशयीय जलनापासून बचण्यासाठी खाण्यानंतर'
      },
      'Take with water': {
        en: 'Take with water',
        hi: 'पानी के साथ लें',
        mr: 'पाण्याबरोबर घ्या'
      },
      'May cause mild drowsiness': {
        en: 'May cause mild drowsiness',
        hi: 'हल्की नींद आ सकती है',
        mr: 'हल्की निंद्रा येऊ शकते'
      },
      'Take at onset of headache': {
        en: 'Take at onset of headache',
        hi: 'सिरदर्द की शुरुआत में लें',
        mr: 'डोकेदुखी सुरू होताच घ्या'
      },
      'Preventive. Continue for 1 month.': {
        en: 'Preventive. Continue for 1 month.',
        hi: 'निवारक। 1 महीने तक जारी रखें।',
        mr: 'प्रতिबंधक। 1 महिन्यासाठी सुरू ठेवा।'
      },
      'For nausea and vomiting': {
        en: 'For nausea and vomiting',
        hi: 'मतली और उल्टी के लिए',
        mr: 'मळमळीक आणि उल्टीसाठी'
      },
      'Take 30 min before food': {
        en: 'Take 30 min before food',
        hi: 'खाने से 30 मिनट पहले लें',
        mr: 'खाण्यापूर्वी 30 मिनिटे आधी घ्या'
      },
      'Take on empty stomach': {
        en: 'Take on empty stomach',
        hi: 'खाली पेट पर लें',
        mr: 'रिकाम्या पोटी घ्या'
      },
      'Protective coating for stomach': {
        en: 'Protective coating for stomach',
        hi: 'पेट के लिए सुरक्षात्मक कोटिंग',
        mr: 'पोटासाठी संरक्षक कोटिंग'
      },
      'For sudden pain relief': {
        en: 'For sudden pain relief',
        hi: 'अचानक दर्द से राहत के लिए',
        mr: 'अचानक दुखापुरठे मदतीसाठी'
      },
      'Long-acting ACE inhibitor': {
        en: 'Long-acting ACE inhibitor',
        hi: 'दीर्घकालिक ACE अवरोधक',
        mr: 'दीर्घ-कार्यरत ACE प्रतिबंधक'
      },
      'ACE inhibitor for BP control': {
        en: 'ACE inhibitor for BP control',
        hi: 'रक्तचाप नियंत्रण के लिए ACE अवरोधक',
        mr: 'BP नियंत्रणासाठी ACE प्रतिबंधक'
      },
      'Take with water, do not exceed recommended dose': {
        en: 'Take with water, do not exceed recommended dose',
        hi: 'पानी के साथ लें, अनुशंसित खुराक से अधिक न लें',
        mr: 'पाण्याबरोबर घ्या, शिफारस केलेल्या डोसपेक्षा जास्त घेऊ नका'
      },
      'Take as prescribed by doctor': {
        en: 'Take as prescribed by doctor',
        hi: 'डॉक्टर के निर्देशानुसार लें',
        mr: 'डॉक्टरांच्या सल्ल्यानुसार घ्या'
      },
      'As directed by physician': {
        en: 'As directed by physician',
        hi: 'चिकित्सक के निर्देशानुसार',
        mr: 'डॉक्टरांच्या सल्ल्यानुसार'
      },
      'Take after meals': {
        en: 'Take after meals',
        hi: 'खाने के बाद लें',
        mr: 'जेवणानंतर घ्या'
      },
      'Take before meals': {
        en: 'Take before meals',
        hi: 'खाने से पहले लें',
        mr: 'जेवणापूर्वी घ्या'
      },
      'Do not crush or chew': {
        en: 'Do not crush or chew',
        hi: 'कुचलें या चबाएं नहीं',
        mr: 'कुस्करू किंवा चावू नका'
      },
      'Avoid alcohol': {
        en: 'Avoid alcohol',
        hi: 'शराब से बचें',
        mr: 'मद्यपान टाळा'
      },
      'Take at bedtime': {
        en: 'Take at bedtime',
        hi: 'सोते समय लें',
        mr: 'झोपण्यापूर्वी घ्या'
      },
      'Complete the full course': {
        en: 'Complete the full course',
        hi: 'पूरा कोर्स पूरा करें',
        mr: 'संपूर्ण कोर्स पूर्ण करा'
      },
      'For fever and pain': {
        en: 'For fever and pain',
        hi: 'बुखार और दर्द के लिए',
        mr: 'ताप आणि वेदनांसाठी'
      },
      'For cough': {
        en: 'For cough',
        hi: 'खांसी के लिए',
        mr: 'खोकल्यासाठी'
      },
      'For allergy': {
        en: 'For allergy',
        hi: 'एलर्जी के लिए',
        mr: 'अॅलर्जीसाठी'
      },
      'For acidity': {
        en: 'For acidity',
        hi: 'एसिडिटी के लिए',
        mr: 'अॅसिडिटीसाठी'
      },
      'SOS - take only when needed': {
        en: 'SOS - take only when needed',
        hi: 'SOS - जरूरत पड़ने पर ही लें',
        mr: 'SOS - गरज असेल तेव्हाच घ्या'
      },
      'Apply locally': {
        en: 'Apply locally',
        hi: 'स्थानीय रूप से लगाएं',
        mr: 'स्थानिकपणे लावा'
      },
      'For external use only': {
        en: 'For external use only',
        hi: 'केवल बाहरी उपयोग के लिए',
        mr: 'फक्त बाह्य वापरासाठी'
      },
      'After food': { en: 'After food', hi: 'खाने के बाद', mr: 'जेवणानंतर', bn: 'খাবারের পরে', gu: 'ખાણ પછી', ta: 'உணவுக்குப் பின்', te: 'భోజనం తర్వాత', kn: 'ನುಡಪಾ ನಂತರ', ml: 'ഭക്ഷണത്തിനു ശേഷം', pa: 'ਖਾਣ ਤੋਂ ਬਾਅਦ', ur: 'کھانے کے بعد' },
  'Before food': { en: 'Before food', hi: 'खाने से पहले', mr: 'जेवणापूर्वी', bn: 'খাবারের আগে', gu: 'ખાણ પહેલાં', ta: 'உணவுக்கு முன்', te: 'భోజనానికి ముందు', kn: 'ನುಡೆಕ್ಕೂ ಮೊದಲು', ml: 'ഭക്ഷണത്തിനു മുമ്പ്', pa: 'ਖਾਣ ਤੋਂ ਪਹਿਲਾਂ', ur: 'کھانے سے پہلے' },
  'For fever reduction': { en: 'For fever reduction', hi: 'बुखार कम करने के लिए', mr: 'ताप कमी करण्यासाठी', bn: 'জ্বর কমাতে', gu: 'તાવ ઘટાડવા માટે', ta: 'காய்ச்சலை குறைக்க', te: 'జ్వరం తగ్గించడానికి', kn: 'ಜ್ವರ ಕಡಿಮೆ ಮಾಡಲು', ml: 'പനി കുറയ്ക്കാന്', pa: 'ਬੁਖ਼ਾਰ ਘਟਾਉਣ ਲਈ', ur: 'بخار کم کرنے کے لیے' },
  'Anti-inflammatory': { en: 'Anti-inflammatory', hi: 'सूजन-रोधी', mr: 'दाहशामक', bn: 'প্রদাহ-বিরোধী', gu: 'સોજા-વિરોધી', ta: 'அழற்சி எதிர்ப்பு', te: 'వాపు నిరోధక', kn: 'ಉರಿಯೂತ ನಿರೋಧಕ', ml: 'വേദനാ-ജ്വലന-വിരുദ്ധ', pa: 'ਸੋਜ਼ਸ਼-ਵਿਰੋਧੀ', ur: 'سوزش مخالف' },
  'For hydration': { en: 'For hydration', hi: 'हाइड्रेशन के लिए', mr: 'हायड्रेशनसाठी', bn: 'হাইড্রেশনের জন্য', gu: 'હાઇડ્રેશન માટે', ta: 'நீரேற்றத்திற்கு', te: 'హైడ్రేషన్ కోసం', kn: 'ಹೈಡ್ರೇಷನ್ ಗಾಗಿ', ml: 'ജലാംശ നൽകാന്', pa: 'ਪਾਣੀ ਦੀ ਮਾਤਰਾ ਲਈ', ur: 'پانی کی کمی پوری کرنے کے لیے' },
  'For hydration and electrolytes': { en: 'For hydration and electrolytes', hi: 'हाइड्रेशन और इलेक्ट्रोलाइट के लिए', mr: 'हायड्रेशन व इलेक्ट्रोलाइटसाठी', bn: 'হাইড্রেশন ও ইলেকট্রোলাইটের জন্য', gu: 'હાઇડ્રેશન અને ઇલેક્ટ્રોલાઇટ માટે', ta: 'நீரேற்றம் மற்றும் எலெக்ட்ரோலைட்டிற்கு', te: 'హైడ్రేషన్ మరియు ఎలక్ట్రోలైట్ కోసం', kn: 'ಹೈಡ್ರೇಷನ್ ಮತ್ತು ಎಲೆಕ್ಟ್ರೋಲೈಟ್ ಗಾಗಿ', ml: 'ജലാംശത്തിനും ഇലക്ട്രോലൈറ്റിനും', pa: 'ਪਾਣੀ ਅਤੇ ਇਲੈਕਟ੍ਰੋਲਾਈਟ ਲਈ', ur: 'پانی اور الیکٹرولائٹ کے لیے' },
  'For pain relief': { en: 'For pain relief', hi: 'दर्द से राहत के लिए', mr: 'वेदना कमी करण्यासाठी', bn: 'ব্যথা উপশমের জন্য', gu: 'ਦર્દ રાહાત માટે', ta: 'வலி நிவாரணத்திற்கு', te: 'నొప్పి నివారణకు', kn: 'ನೋವು ಪರಿಹಾರಕ್ಕೆ', ml: 'വേദന ശമനത്തിന്', pa: 'ਦਰਦ ਰਾਹਤ ਲਈ', ur: 'درد سے آرام کے لیے' },
  'For infection': { en: 'For infection', hi: 'संक्रमण के लिए', mr: 'संसर्गासाठी', bn: 'सংক্রমণের জন্য', gu: 'ચેપ માટે', ta: 'தொற்றுக்கு', te: 'ఇన్ఫెక్షన్ కోసం', kn: 'ಸೋಂಕಿಗೆ', ml: 'അണുബാധയ്ക്ക്', pa: 'ਇਨਫੈਕਸ਼ਨ ਲਈ', ur: 'انفیکشن کے لیے' },
  'For diabetes': { en: 'For diabetes', hi: 'मधुमेह के लिए', mr: 'मधुमेहासाठी', bn: 'ডায়াবেটিসের জন্য', gu: 'ડાયાબિટિઝ માટે', ta: 'நீரிழிவுக்கு', te: 'మధుమేహానికి', kn: 'ಮಧುಮೇಹಕ್ಕೆ', ml: 'പ്രമേഹത്തിന്', pa: 'ਸ਼ੂਗਰ ਲਈ', ur: 'ذیابطیس کے لیے' },
  'For blood pressure': { en: 'For blood pressure', hi: 'रक्तचाप के लिए', mr: 'रक्तदाबासाठी', bn: 'রক্তচাপের জন্য', gu: 'BP માટે', ta: 'இரத்த அழுத்தத்திற்கு', te: 'రక్తపోటుకు', kn: 'ರಕ್ತದ ಒತ್ತಡಕ್ಕೆ', ml: 'രക്തസമ്മര്ദ്ദത്തിന്', pa: 'ਬਲੱਡ ਪ੍ਰੈਸ਼ਰ ਲਈ', ur: 'بلڈ پریشر کے لیے' },
};


// Parse frequency string to doses per day
function parseDosesPerDay(freq) {
  if (!freq) return 0;
  const f = freq.trim().toLowerCase();
  // Handle dash-separated: "1-0-1", "1/2-1/2-1/2", "1-1-1-1"
  if (/^[\d\/]+([-][\d\/]+)+$/.test(f)) {
    return f.split('-').reduce((sum, part) => {
      if (part.includes('/')) {
        const [num, den] = part.split('/').map(Number);
        return sum + (den ? num / den : 0);
      }
      return sum + (parseFloat(part) || 0);
    }, 0);
  }
  // Named frequencies
  if (f === 'once daily' || f === 'od') return 1;
  if (f === 'twice daily' || f === 'bd' || f === 'bid') return 2;
  if (f === 'three times daily' || f === 'tds' || f === 'tid') return 3;
  if (f === 'four times daily' || f === 'qid') return 4;
  if (f === 'every 8 hours') return 3;
  if (f === 'every 12 hours') return 2;
  if (f === 'weekly') return 1 / 7;
  if (f === 'sos' || f === 'stat') return 1;
  return 0;
}

// Parse duration string to number of days
function parseDurationDays(dur) {
  if (!dur) return 0;
  const d = dur.trim().toLowerCase();
  // "3-5 days" → use max (5)
  let match = d.match(/(\d+)\s*[-–]\s*(\d+)\s*(day|week|month)/i);
  if (match) {
    const max = parseInt(match[2]);
    if (match[3].startsWith('week')) return max * 7;
    if (match[3].startsWith('month')) return max * 30;
    return max;
  }
  // "7 days", "2 weeks", "1 month"
  match = d.match(/(\d+)\s*(day|week|month)/i);
  if (match) {
    const num = parseInt(match[1]);
    if (match[2].startsWith('week')) return num * 7;
    if (match[2].startsWith('month')) return num * 30;
    return num;
  }
  // Just a number
  const num = parseInt(d);
  return isNaN(num) ? 0 : num;
}

function calcQty(frequency, duration) {
  const perDay = parseDosesPerDay(frequency);
  const days = parseDurationDays(duration);
  if (perDay > 0 && days > 0) return Math.ceil(perDay * days);
  return 0;
}

const uiLabels = {
  en: {
    medicines: 'Medicines',
    diagnosis: 'Diagnosis',
    advice: 'Advice / Instructions',
    followUp: 'Follow Up',
    patientNotes: 'Patient Notes',
    privateNotes: 'Private Notes',
    symptoms: 'Symptoms',
    labTests: 'Lab Tests',
    procedures: 'Procedures',
    dosage: 'Dosage',
    frequency: 'Frequency',
    duration: 'Duration',
    quantity: 'Quantity',
    instructions: 'Instructions',
    add: 'Add',
    remove: 'Remove',
    save: 'Save',
    cancel: 'Cancel',
    selectLanguage: 'Select Language'
  },
  hi: {
    medicines: 'दवाएँ',
    diagnosis: 'निदान',
    advice: 'सलाह / निर्देश',
    followUp: 'फॉलो-अप',
    patientNotes: 'रोगी नोट्स',
    privateNotes: 'निजी नोट्स',
    symptoms: 'लक्षण',
    labTests: 'लैब टेस्ट',
    procedures: 'प्रक्रियाएँ',
    dosage: 'खुराक',
    frequency: 'आवृत्ति',
    duration: 'अवधि',
    quantity: 'मात्रा',
    instructions: 'निर्देश',
    add: 'जोड़ें',
    remove: 'हटाएं',
    save: 'सेव करें',
    cancel: 'रद्द करें',
    selectLanguage: 'भाषा चुनें'
  },
  mr: {
    medicines: 'औषधे',
    diagnosis: 'निदान',
    advice: 'सल्ला / सूचना',
    followUp: 'फॉलो-अप',
    patientNotes: 'रुग्ण नोट्स',
    privateNotes: 'वैयक्तिक नोट्स',
    symptoms: 'लक्षणे',
    labTests: 'लॅब चाचण्या',
    procedures: 'प्रक्रिया',
    dosage: 'डोस',
    frequency: 'वारंवार',
    duration: 'कालावधी',
    quantity: 'प्रमाण',
    instructions: 'सूचना',
    add: 'जोडा',
    remove: 'काढा',
    save: 'जतन करा',
    cancel: 'रद्द करा',
    selectLanguage: 'भाषा निवडा'
  },
  bn: {
    medicines: 'ওষুধ',
    diagnosis: 'রোগ নির্ণয',
    advice: 'পরামর্শ / নির্দেশ',
    followUp: 'ফলো-আপ',
    patientNotes: 'রোগীর নোট',
    privateNotes: 'ব্যক্তিগত নোট',
    symptoms: 'উপসর্গ',
    labTests: 'ল্যাব পরীক্ষা',
    procedures: 'পদ্ধতি',
    dosage: 'ডোজ',
    frequency: 'ফ্রিকোয়েন্সি',
    duration: 'সময়কাল',
    quantity: 'পরিমাণ',
    instructions: 'নির্দেশ',
    add: 'যোগ করুন',
    remove: 'সরান',
    save: 'সংরক্ষণ করুন',
    cancel: 'বাতিল',
    selectLanguage: 'ভাষা নির্বাচন করুন'
  },
  gu: {
    medicines: 'દવાઓ',
    diagnosis: 'નિદાન',
    advice: 'સલાહ / સૂચના',
    followUp: 'ફોલો-અપ',
    patientNotes: 'દર્દી નોટ્સ',
    privateNotes: 'ખાનગી નોટ્સ',
    symptoms: 'લક્ષણો',
    labTests: 'લેબ ટેસ્ટ',
    procedures: 'પ્રક્રિયાઓ',
    dosage: 'ડોઝ',
    frequency: 'આવર્તિ',
    duration: 'સમયગાળો',
    quantity: 'જથ્થો',
    instructions: 'સૂચના',
    add: 'ઉમેરો',
    remove: 'દૂર કરો',
    save: 'સાચવો',
    cancel: 'રદ કરો',
    selectLanguage: 'ભાષા પસંદ કરો'
  },
  ta: {
    medicines: 'மருந்துகள்',
    diagnosis: 'நோய் கண்டறி',
    advice: 'ஆலோசனை / வழிமுறைகள்',
    followUp: 'பின் தொடர்வு',
    patientNotes: 'நோயாளி குறிப்புகள்',
    privateNotes: 'தனிப்பட்ட குறிப்புகள்',
    symptoms: 'அறிகுறிகள்',
    labTests: 'ஆய்வகூட சோதனைகள்',
    procedures: 'செயல்முறைகள்',
    dosage: 'அளவு',
    frequency: 'அதிர்வதி',
    duration: 'காலம்',
    quantity: 'அளவு',
    instructions: 'வழிமுறைகள்',
    add: 'சேர்க்கவும்',
    remove: 'அகற்று',
    save: 'சேமிக்கவும்',
    cancel: 'ரத்து',
    selectLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்'
  },
  te: {
    medicines: 'మందులు',
    diagnosis: 'రోగ నిర్ధారణ',
    advice: 'సలహా / సూచనలు',
    followUp: 'అనుసరించండి',
    patientNotes: 'రోగి గమనలు',
    privateNotes: 'వ్యక్తిగత గమనలు',
    symptoms: 'లక్షణాలు',
    labTests: 'ప్రయోగశాల పరీక్షలు',
    procedures: 'విధానాలు',
    dosage: 'డోసేజ్',
    frequency: 'తరచు',
    duration: 'వ్యవధి',
    quantity: 'పరిమాణం',
    instructions: 'సూచనలు',
    add: 'జోడించండి',
    remove: 'తీసివేయండి',
    save: 'సేవ్ చేయండి',
    cancel: 'రద్దు చేయండి',
    selectLanguage: 'భాషను ఎంచుకోండి'
  },
  kn: {
    medicines: 'ಔಷಧಿಗಳು',
    diagnosis: 'ರೋಗ ನಿರ್ಣಯ',
    advice: 'ಸಲಹೆ / ಸೂಚನೆಗಳು',
    followUp: 'ಅನುಸರಿಸಿ',
    patientNotes: 'ರೋಗಿ ಟಿಪ್ಪಣಿಗಳು',
    privateNotes: 'ಖಾಸಗಿ ಟಿಪ್ಪಣಿಗಳು',
    symptoms: 'ಲಕ್ಷಣಗಳು',
    labTests: 'ಪ್ರಯೋಗಶಾಲೆ ಪರೀಕ್ಷೆಗಳು',
    procedures: 'ವಿಧಾನಗಳು',
    dosage: 'ಡೋಸ್',
    frequency: 'ಆವರ್ತಿ',
    duration: 'ಅವಧಿ',
    quantity: 'ಪ್ರಮಾಣ',
    instructions: 'ಸೂಚನೆಗಳು',
    add: 'ಸೇರಿ',
    remove: 'ತೆಗೆದುಹಾಕಿ',
    save: 'ಉಳಿಸಿ',
    cancel: 'ರದ್ದುಮಾಡಿ',
    selectLanguage: 'ಭಾಷೆಯನ್ನು ಆಯ್ಕಲಿಸಿ'
  },
  ml: {
    medicines: 'മരുന്നുകൾ',
    diagnosis: 'രോഗനിർണയം',
    advice: 'ഉപദേശം / നിർദേശങ്ങൾ',
    followUp: 'പിന്തുടർന്ന്',
    patientNotes: 'രോഗിക്കുറിപ്പുകൾ',
    privateNotes: 'സ്വകാര്യക്കുറിപ്പുകൾ',
    symptoms: 'ലക്ഷണങ്ങൾ',
    labTests: 'ലാബ് ടെസ്റ്റുകൾ',
    procedures: 'നടപടികൾ',
    dosage: 'ഡോസ്',
    frequency: 'ആവർത്തി',
    duration: 'കാലയളവ്',
    quantity: 'അളവ്',
    instructions: 'നിർദേശങ്ങൾ',
    add: 'ചേർക്കുക',
    remove: 'നീക്കംചെയ്യുക',
    save: 'സേവ് ചെയ്യുക',
    cancel: 'റദ്ദാക്കുക',
    selectLanguage: 'ഭാഷ തിരഞ്ഞെടുക്കുക'
  },
  pa: {
    medicines: 'ਦਵਾਈਆਂ',
    diagnosis: 'ਨਿਦਾਨ',
    advice: 'ਸਲਾਹ / ਹਦਾਇਤ',
    followUp: 'ਫਾਲੋ-ਅਪ',
    patientNotes: 'ਮਰੀਜ਼ ਨੋਟ',
    privateNotes: 'ਨਿੱਜੀ ਨੋਟ',
    symptoms: 'ਲੱਛਣ',
    labTests: 'ਲੈਬ ਟੈਸਟ',
    procedures: 'ਕਾਰਵਾਈਆਂ',
    dosage: 'ਡੋਜ਼',
    frequency: 'ਫ੍ਰੀਕਵੈਂਸੀ',
    duration: 'ਮਿਆਦ',
    quantity: 'ਮਾਤਰਾ',
    instructions: 'ਹਦਾਇਤ',
    add: 'ਸ਼ਾਮਲ',
    remove: 'ਹਟਾਓ',
    save: 'ਸੇਵ ਕਰੋ',
    cancel: 'ਰੱਦ ਕਰੋ',
    selectLanguage: 'ਭਾਸ਼ਾ ਚੁਣੋ'
  },
  ur: {
    medicines: 'دوائیں',
    diagnosis: 'تشخیص',
    advice: 'مشورہ / ہدایات',
    followUp: 'فالو اپ',
    patientNotes: 'مریض نوٹس',
    privateNotes: 'ذاتی نوٹس',
    symptoms: 'علامات',
    labTests: 'لیب ٹیسٹ',
    procedures: 'عمل',
    dosage: 'ڈوز',
    frequency: 'فریکوئینسی',
    duration: 'مدت',
    quantity: 'مقدار',
    instructions: 'ہدایات',
    add: 'شامل کریں',
    remove: 'ہٹائیں',
    save: 'محفوظ کریں',
    cancel: 'منسوخ کریں',
    selectLanguage: 'زبان منتخب کریں'
  }
};

export default function PrescriptionPad() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const api = useApiClient();
  const { user } = useAuth();  // Get logged in user
  const { language, changeLanguage } = useTranslation();
  
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `@page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; }`,
  });
  const adviceEditorRef = useRef(null);

  // State
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('prescription');
  const [showVitalsConfig, setShowVitalsConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const savingInProgress = useRef(false); // prevent concurrent saves on rapid clicks
  
  // Pad configuration state
  const [padFields, setPadFields] = useState([
    'Patient Medical History',
    'Dental Chart (New/PRO)',
    'Vitals',
    'Symptoms',
    'Examination Findings',
    'Lab Results',
    'Diagnosis',
    'Medications',
    'Notes',
    'Follow Up & Advices'
  ]);
  const [fieldStates, setFieldStates] = useState({});
  
  // Meta state with doctor_id, date and time
  const [meta, setMeta] = useState({
    patient_id: patientId || '',
    doctor_id: '',
    appointment_id: '',
    prescription_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    prescription_time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  });
  
  const [vitals, setVitals] = useState({
    temp: '',
    height: '',
    bmi: '',
    weight: '',
    pulse: '',
    blood_pressure: '',
    spo2: ''
  });

  // Medical History State (dr.eka.care style)
  const [medicalHistoryData, setMedicalHistoryData] = useState({
    medicalHistory: [],      // Y/N toggle conditions
    existingConditions: [],  // Chronic conditions
    surgicalHistory: [],     // Past surgeries
    allergies: [],           // Drug allergies
    familyHistory: []        // Family history
  });
  const [medicalHistoryLoading, setMedicalHistoryLoading] = useState(false);
  const [showAddConditionModal, setShowAddConditionModal] = useState(false);
  const [showAddSurgeryModal, setShowAddSurgeryModal] = useState(false);
  const [newCondition, setNewCondition] = useState({ condition_name: '', icd_code: '', start_date: '', notes: '' });
  const [newSurgery, setNewSurgery] = useState({ surgery_name: '', surgery_date: '', hospital: '', surgeon: '', complications: '' });

  // Load pad configuration from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('padConfiguration');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.fields && config.fieldStates) {
          setPadFields(config.fields);
          setFieldStates(config.fieldStates);
        }
      } catch (error) {
        console.error('Failed to load pad configuration:', error);
      }
    }
  }, []);

  // Function to render sections dynamically based on pad configuration
  const renderDynamicSections = () => {
    return padFields.map(fieldName => {
      const isEnabled = fieldStates[fieldName]?.enabled !== false;
      
      if (!isEnabled) return null;

      switch (fieldName) {
        case 'Patient Medical History':
          return (
            <div key="medical-history" className="bg-white border border-amber-200 rounded-lg shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3 border-b border-amber-100">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-amber-800">
                  <span className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">Hx</span>
                  Patient Medical History
                  {medicalHistoryLoading && <span className="text-xs text-amber-600 ml-2">(Loading...)</span>}
                </h2>
              </div>

              <div className="p-4 space-y-5">
                {/* Existing Conditions Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      EXISTING CONDITIONS
                      {medicalHistoryData.existingConditions?.length > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                          {medicalHistoryData.existingConditions.length}
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => setShowAddConditionModal(true)}
                      className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors flex items-center gap-1 font-medium"
                    >
                      <span>+</span> Add Condition
                    </button>
                  </div>
                  {medicalHistoryData.existingConditions?.length > 0 ? (
                    <div className="space-y-2">
                      {medicalHistoryData.existingConditions.map((condition) => (
                        <div key={condition.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100">
                          <div className="flex-1">
                            <span className="font-medium text-gray-800">{condition.condition_name}</span>
                            {condition.icd_code && <span className="ml-2 text-xs text-gray-500">({condition.icd_code})</span>}
                            {condition.start_date && <span className="ml-2 text-xs text-gray-400">Since: {condition.start_date}</span>}
                          </div>
                          <button
                            onClick={() => deleteExistingCondition(condition.id)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No existing conditions recorded</p>
                  )}
                </div>

                {/* Past Surgical Procedures Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      PAST SURGICAL PROCEDURES
                      {medicalHistoryData.surgicalHistory?.length > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                          {medicalHistoryData.surgicalHistory.length}
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => setShowAddSurgeryModal(true)}
                      className="text-xs px-3 py-1 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors flex items-center gap-1 font-medium"
                    >
                      <span>+</span> Add Surgery
                    </button>
                  </div>
                  {medicalHistoryData.surgicalHistory?.length > 0 ? (
                    <div className="space-y-2">
                      {medicalHistoryData.surgicalHistory.map((surgery) => (
                        <div key={surgery.id} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-100">
                          <div className="flex-1">
                            <span className="font-medium text-gray-800">{surgery.surgery_name}</span>
                            {surgery.surgery_date && <span className="ml-2 text-xs text-gray-500">{surgery.surgery_date}</span>}
                            {surgery.hospital && <span className="ml-2 text-xs text-gray-400">@ {surgery.hospital}</span>}
                          </div>
                          <button
                            onClick={() => deleteSurgicalProcedure(surgery.id)}
                            className="text-purple-400 hover:text-purple-600 p-1"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No surgical history recorded</p>
                  )}
                </div>

                {/* Allergies Quick View */}
                {medicalHistoryData.allergies?.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      DRUG ALLERGIES
                      <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                        {medicalHistoryData.allergies.length}
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {medicalHistoryData.allergies.map((allergy) => (
                        <span
                          key={allergy.id}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            allergy.severity === 'Severe'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : allergy.severity === 'Moderate'
                              ? 'bg-orange-100 text-orange-700 border border-orange-200'
                              : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                          }`}
                        >
                          {allergy.allergen_name}
                          {allergy.severity && <span className="ml-1 text-xs opacity-70">({allergy.severity})</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Family History Quick View */}
                {medicalHistoryData.familyHistory?.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      FAMILY HISTORY
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {medicalHistoryData.familyHistory.length}
                      </span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {medicalHistoryData.familyHistory.map((fh) => (
                        <div key={fh.id} className="p-2 bg-blue-50 rounded-lg border border-blue-100 text-sm">
                          <span className="font-medium text-blue-800">{fh.relation}</span>
                          {fh.condition_name && <span className="text-gray-600">: {fh.condition_name}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state - show when no quick toggles are configured */}
                {(!medicalHistoryData.medicalHistory || medicalHistoryData.medicalHistory.length === 0) &&
                 !medicalHistoryLoading && (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">No medical history options configured.</p>
                    <p className="text-gray-400 text-xs mt-1">Contact admin to configure quick toggle conditions.</p>
                  </div>
                )}
              </div>

              {/* Add Condition Modal */}
              {showAddConditionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h3 className="font-semibold text-gray-800">Add Existing Condition</h3>
                      <button onClick={() => setShowAddConditionModal(false)} className="text-gray-400 hover:text-gray-600">
                        <FiX size={20} />
                      </button>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Condition Name *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-300"
                          placeholder="e.g., Type 2 Diabetes"
                          value={newCondition.condition_name}
                          onChange={(e) => setNewCondition({ ...newCondition, condition_name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ICD Code</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="E11.9"
                            value={newCondition.icd_code}
                            onChange={(e) => setNewCondition({ ...newCondition, icd_code: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border rounded-lg"
                            value={newCondition.start_date}
                            onChange={(e) => setNewCondition({ ...newCondition, start_date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          className="w-full px-3 py-2 border rounded-lg"
                          rows={2}
                          placeholder="Additional notes..."
                          value={newCondition.notes}
                          onChange={(e) => setNewCondition({ ...newCondition, notes: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                      <button
                        onClick={() => setShowAddConditionModal(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addExistingCondition}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Add Condition
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Surgery Modal */}
              {showAddSurgeryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h3 className="font-semibold text-gray-800">Add Surgical Procedure</h3>
                      <button onClick={() => setShowAddSurgeryModal(false)} className="text-gray-400 hover:text-gray-600">
                        <FiX size={20} />
                      </button>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Surgery Name *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-300"
                          placeholder="e.g., Appendectomy"
                          value={newSurgery.surgery_name}
                          onChange={(e) => setNewSurgery({ ...newSurgery, surgery_name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Surgery Date</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border rounded-lg"
                            value={newSurgery.surgery_date}
                            onChange={(e) => setNewSurgery({ ...newSurgery, surgery_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="Hospital name"
                            value={newSurgery.hospital}
                            onChange={(e) => setNewSurgery({ ...newSurgery, hospital: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Surgeon</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="Surgeon name"
                          value={newSurgery.surgeon}
                          onChange={(e) => setNewSurgery({ ...newSurgery, surgeon: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Complications</label>
                        <textarea
                          className="w-full px-3 py-2 border rounded-lg"
                          rows={2}
                          placeholder="Any complications..."
                          value={newSurgery.complications}
                          onChange={(e) => setNewSurgery({ ...newSurgery, complications: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                      <button
                        onClick={() => setShowAddSurgeryModal(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addSurgicalProcedure}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                      >
                        Add Surgery
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );

        case 'Dental Chart (New/PRO)':
          return (
            <div key="dental-chart" className="bg-white border rounded shadow-sm p-4 space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">🦷</span>
                Dental Chart (New/PRO)
              </h2>
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🦷</div>
                <p>Dental chart functionality will be implemented here</p>
                <p className="text-sm">This section will allow dental examination and charting</p>
              </div>
            </div>
          );

        case 'Vitals':
          return (
            <div key="vitals" className="bg-white border rounded shadow-sm p-4 space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">V</span>
                Vitals
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°F)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="98.6"
                    value={vitals.temp}
                    onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="170"
                    value={vitals.height}
                    onChange={(e) => {
                      const newHeight = e.target.value;
                      const newWeight = vitals.weight;
                      let bmi = '';
                      
                      if (newHeight && newWeight) {
                        const heightInMeters = parseFloat(newHeight) / 100;
                        bmi = (parseFloat(newWeight) / (heightInMeters * heightInMeters)).toFixed(2);
                      }
                      
                      setVitals({ ...vitals, height: newHeight, bmi });
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="70"
                    value={vitals.weight}
                    onChange={(e) => {
                      const newWeight = e.target.value;
                      const newHeight = vitals.height;
                      let bmi = '';
                      
                      if (newHeight && newWeight) {
                        const heightInMeters = parseFloat(newHeight) / 100;
                        bmi = (parseFloat(newWeight) / (heightInMeters * heightInMeters)).toFixed(2);
                      }
                      
                      setVitals({ ...vitals, weight: newWeight, bmi });
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BMI</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded bg-gray-100"
                    placeholder="24.2"
                    value={vitals.bmi}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pulse</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="72"
                    value={vitals.pulse}
                    onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="120/80"
                    value={vitals.blood_pressure}
                    onChange={(e) => setVitals({ ...vitals, blood_pressure: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SpO2 (%)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="98"
                    value={vitals.spo2}
                    onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                  />
                </div>
              </div>
            </div>
          );

        case 'Symptoms':
          return (
            <div key="symptoms" className="bg-white border rounded shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">Sx</span>
                  {uiLabels['en']?.symptoms || 'Symptoms'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTemplateSelector(true)}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition"
                  title="Use Symptoms Template"
                >
                  📋 Use Template
                </button>
              </div>
              <div className="relative">
                <input
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Start typing Symptoms / Chief Complaints"
                  value={symptomInput}
                  onChange={(e) => {
                    setSymptomInput(e.target.value);
                    setSymptomDropdown(true);
                  }}
                  onFocus={() => setSymptomDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && symptomInput) {
                      e.preventDefault();
                      addSymptom(symptomInput);
                    }
                  }}
                  onBlur={() => setTimeout(() => setSymptomDropdown(false), 200)}
                />
                {symptomDropdown && filteredSymptoms.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                    {filteredSymptoms.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addSymptom(s)}
                      >
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">S</span>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {symptoms.map((s, idx) => {
                  const symptomName = typeof s === 'object' ? s.name : s;
                  const symptomRemarks = typeof s === 'object' ? s.remarks || '' : '';
                  return (
                    <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                      <span>{symptomName}</span>
                      <input
                        type="text"
                        placeholder="remarks..."
                        value={symptomRemarks}
                        onChange={(e) => {
                          const updated = [...symptoms];
                          updated[idx] = { name: symptomName, remarks: e.target.value };
                          setSymptoms(updated);
                        }}
                        className="ml-1 px-2 py-0.5 text-xs border border-blue-200 rounded bg-white w-24 focus:w-40 transition-all focus:outline-none focus:ring-1 focus:ring-blue-300"
                      />
                      <button
                        type="button"
                        onClick={() => setSymptoms(symptoms.filter((_, i) => i !== idx))}
                        className="text-blue-500 hover:text-blue-700 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1">
                {symptomSuggestions.slice(0, 8).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => addSymptom(s)}
                    className="px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 transition"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          );

        case 'Examination Findings':
          return (
            <div key="examination-findings" className="bg-white border rounded shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">🔍</span>
                  Examination Findings
                </h2>
                <button
                  type="button"
                  onClick={() => setShowExaminationTemplateModal(true)}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition"
                  title="Use Examination Template"
                >
                  📋 Use Template
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">General Examination</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                    placeholder="Enter general examination findings..."
                    value={generalExamination}
                    onChange={(e) => setGeneralExamination(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Systemic Examination</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                    placeholder="Enter systemic examination findings..."
                    value={systemicExamination}
                    onChange={(e) => setSystemicExamination(e.target.value)}
                  />
                </div>
              </div>
            </div>
          );

        case 'Lab Results':
          return (
            <div key="lab-results" className="bg-white border rounded shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">L</span>
                  Lab Results & Medical Records
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLabTemplateModal(true)}
                    className="px-3 py-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100 transition"
                  >
                    + Add Lab Result
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRecordModal(true)}
                    className="px-3 py-1.5 text-xs border rounded hover:bg-slate-50 transition"
                  >
                    + Add Record
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRecordUploadModal(true)}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Upload File
                  </button>
                </div>
              </div>

              {/* Lab Result Entries */}
              {labResultEntries.length > 0 && (
                <div className="space-y-2">
                  {labResultEntries.map((entry, idx) => (
                    <div key={idx} className="border rounded overflow-hidden">
                      <div className="flex items-center justify-between bg-purple-50 px-3 py-2">
                        <div>
                          <span className="text-xs font-semibold text-purple-800">{entry.test_name}</span>
                          {entry.category && <span className="text-[10px] text-purple-500 ml-2">{entry.category}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const entry = labResultEntries[idx];
                            if (entry.id) {
                              try { await api.delete(`/api/labs/${entry.id}`); } catch (err) { console.error('Failed to delete lab result:', err); }
                            }
                            setLabResultEntries(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >×</button>
                      </div>
                      {entry.parameters && entry.parameters.length > 0 ? (
                        <div>
                          <div className="grid grid-cols-12 bg-gray-50 text-[10px] font-semibold text-gray-600 px-3 py-1 gap-1">
                            <span className="col-span-4">Parameter</span>
                            <span className="col-span-3">Result</span>
                            <span className="col-span-2">Unit</span>
                            <span className="col-span-3">Reference</span>
                          </div>
                          {entry.parameters.map((p, pIdx) => (
                            <div key={pIdx} className="grid grid-cols-12 px-3 py-1 text-xs border-t items-center gap-1">
                              <span className="col-span-4 truncate" title={p.parameter_name}>{p.parameter_name}</span>
                              <span className="col-span-3 font-medium text-purple-700">{p.result_value}</span>
                              <span className="col-span-2 text-gray-500">{p.unit || '-'}</span>
                              <span className="col-span-3 text-gray-500">{p.reference_range || '-'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 px-3 py-1.5 text-sm items-center gap-1">
                          <input
                            type="text"
                            className="px-2 py-1 border rounded text-xs w-full col-span-1"
                            placeholder="Value"
                            value={entry.result_value || ''}
                            onChange={(e) => {
                              const updated = [...labResultEntries];
                              updated[idx].result_value = e.target.value;
                              setLabResultEntries(updated);
                            }}
                          />
                          <span className="text-xs text-gray-500">{entry.result_unit || '-'}</span>
                          <span className="text-xs text-gray-500">{entry.reference_range || '-'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Medical Records */}
              {prescriptionRecords.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {prescriptionRecords.map((rec, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border rounded text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          rec.category === 'BLOOD_TEST' ? 'bg-red-100 text-red-700' :
                          rec.category === 'X_RAY' ? 'bg-blue-100 text-blue-700' :
                          rec.category === 'MRI' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{rec.category}</span>
                        <span className="truncate">{rec.name}</span>
                        {rec.file && <span className="text-xs text-green-600">📎</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrescriptionRecords(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600 ml-2"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              {labResultEntries.length === 0 && prescriptionRecords.length === 0 && (
                <p className="text-sm text-gray-400 italic">No lab results or medical records. Use buttons above to add.</p>
              )}

              {/* Lab Test Advice */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lab Test Advice</label>
                <textarea
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                  value={labAdvice}
                  onChange={(e) => setLabAdvice(e.target.value)}
                  placeholder="Enter lab tests to advise (e.g., CBC, LFT, KFT, Thyroid Profile)..."
                />
              </div>
              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                  value={labRemarks}
                  onChange={(e) => setLabRemarks(e.target.value)}
                  placeholder="Additional remarks or notes..."
                />
              </div>
            </div>
          );

        case 'Diagnosis':
          return (
            <div key="diagnosis" className="bg-white border rounded shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">Dx</span>
                  {uiLabels['en']?.diagnosis || 'Diagnosis'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDiagnosisTemplateSelector(true)}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100 transition"
                  title="Use Diagnosis Template"
                >
                  📋 Use Template
                </button>
              </div>
              <div className="relative">
                <input
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Start typing Diagnosis"
                  value={diagnosisInput}
                  onChange={(e) => {
                    setDiagnosisInput(e.target.value);
                    setDiagnosisDropdown(true);
                    setSnomedDiagnosisPage(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && diagnosisInput) {
                      e.preventDefault();
                      addDiagnosis(diagnosisInput);
                    }
                  }}
                  onBlur={() => setTimeout(() => setDiagnosisDropdown(false), 200)}
                />
                {diagnosisDropdown && (combinedDiagnosisResults.length > 0 || snomedDiagnosisResults.length > 0) && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-64 overflow-y-auto">
                    {combinedDiagnosisResults.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 bg-slate-50 text-xs font-semibold text-slate-600 border-b flex items-center justify-between">
                          <span>Suggestions</span>
                          {diagnosisLoading && (
                            <span className="text-xs font-normal text-slate-500">Searching…</span>
                          )}
                        </div>
                        {combinedDiagnosisResults.map((item) => (
                          <button
                            key={`${item.type}-${item.code || item.label}`}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addDiagnosis(item.label)}
                          >
                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">Dx</span>
                            <div className="flex flex-col">
                              <span>{item.label}</span>
                              {item.type === 'custom' && (
                                <span className="text-xs text-green-600 font-medium">Your custom diagnosis</span>
                              )}
                              {item.type === 'icd' && item.code && (
                                <span className="text-xs text-slate-500">{item.version || 'ICD'}: {item.code}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {diagnoses.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-purple-50 border border-purple-200 rounded-full text-sm">
                    {typeof d === 'string' ? d : d.label || d.icd_title}
                    <button
                      type="button"
                      onClick={() => setDiagnoses(diagnoses.filter((_, i) => i !== idx))}
                      className="text-purple-500 hover:text-purple-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {diagnosisSuggestions.slice(0, 8).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onMouseDown={() => addDiagnosis(d)}
                    className="px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 transition"
                  >
                    + {d}
                  </button>
                ))}
              </div>
            </div>
          );

        case 'Medications':
          return (
            <div key="medications" className="bg-white border rounded shadow-sm p-4 space-y-3">
              
              {/* Smart Suggestions */}
              {showSmartSuggestions && (
                <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm text-blue-900">💡 Smart Suggestions</h4>
                    <button
                      type="button"
                      onClick={() => setShowSmartSuggestions(false)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Suggestion counts */}

                  {/* Frequently Used Medicines */}
                  {smartSuggestions.frequentlyUsed.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-2">🔄 Frequently Used for This Patient</div>
                      <div className="flex flex-wrap gap-1">
                        {smartSuggestions.frequentlyUsed.slice(0, 5).map((med, idx) => (
                          <button
                            key={`freq-sugg-${idx}`}
                            type="button"
                            onMouseDown={() => addMed(med)}
                            className="px-2 py-1 bg-white border border-blue-200 rounded text-xs hover:bg-blue-50 transition"
                          >
                            {med.brand || med.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diagnosis-based Medicines */}
                  {smartSuggestions.medicines && smartSuggestions.medicines.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-2">🎯 Suggested Medicines</div>
                      <div className="flex flex-wrap gap-1">
                        {smartSuggestions.medicines.slice(0, 10).map((med, idx) => (
                          <button
                            key={`med-sugg-${idx}`}
                            type="button"
                            onMouseDown={() => addMed(med)}
                            className={`px-2 py-1 border rounded text-xs hover:opacity-80 transition ${
                              med.source === 'icd11' ? 'bg-purple-50 border-purple-200' :
                              med.source === 'icd10' ? 'bg-blue-50 border-blue-200' :
                              med.source === 'symptom' ? 'bg-green-50 border-green-200' :
                              med.source === 'dosage_reference' ? 'bg-yellow-50 border-yellow-200' :
                              med.source === 'snomed_medication' ? 'bg-pink-50 border-pink-200' :
                              'bg-white border-gray-200'
                            }`}
                            title={`${med.source} - ${med.evidence_level || 'No evidence level'}`}
                          >
                            {med.brand || med.name}
                            {med.evidence_level && (
                              <span className="ml-1 text-xs opacity-75">({med.evidence_level})</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Symptom-based Medicines */}
                  {smartSuggestions.medicines && smartSuggestions.medicines.filter(m => m.original_symptom).length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-2">🔥 Based on Symptoms</div>
                      <div className="flex flex-wrap gap-1">
                        {smartSuggestions.medicines
                          .filter(m => m.original_symptom)
                          .slice(0, 8)
                          .map((med, idx) => (
                            <button
                              key={`sym-sugg-${idx}`}
                              type="button"
                              onMouseDown={() => addMed(med)}
                              className="px-2 py-1 bg-green-50 border border-green-200 rounded text-xs hover:bg-green-100 transition"
                              title={`For ${med.original_symptom}`}
                            >
                              {med.brand || med.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Injection Suggestions */}
                  {smartSuggestions.injections && smartSuggestions.injections.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-2">💉 Suggested Injections</div>
                      <div className="flex flex-wrap gap-1">
                        {smartSuggestions.injections.slice(0, 8).map((inj, idx) => (
                          <button
                            key={`inj-sugg-${idx}`}
                            type="button"
                            onMouseDown={() => {
                              setMeds(prev => [...prev, {
                                type: 'injection',
                                name: inj.injection_name || inj.name || '',
                                brand: inj.injection_name || inj.name || '',
                                composition: inj.generic_name || '',
                                dose: inj.dose || '',
                                route: inj.route || 'IV',
                                infusion_rate: inj.infusion_rate || '',
                                frequency: inj.frequency || '',
                                duration: inj.duration || '',
                                timing: inj.timing || '',
                                instructions: inj.instructions || ''
                              }]);
                            }}
                            className="px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs hover:bg-orange-100 transition"
                            title={inj.generic_name ? `${inj.generic_name} - ${inj.route || ''}` : ''}
                          >
                            💉 {inj.injection_name || inj.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          );

        case 'Notes':
          return (
            <div key="notes" className="bg-white border rounded shadow-sm p-4 space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-bold">📝</span>
                Notes
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient Notes</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                    placeholder="Enter patient notes..."
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Private Notes</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                    placeholder="Enter private notes (for doctor reference only)..."
                    value={privateNotes}
                    onChange={(e) => setPrivateNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          );

        case 'Follow Up & Advices':
          return (
            <div key="followup" className="bg-white border rounded shadow-sm p-4 space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">📅</span>
                Follow Up & Advices
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Follow Up Days</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded"
                      placeholder="7"
                      value={followUp.days}
                      onChange={(e) => {
                        const days = parseInt(e.target.value) || 0;
                        const today = new Date();
                        const followUpDate = new Date(today);
                        followUpDate.setDate(today.getDate() + days);
                        setFollowUp({ 
                          ...followUp, 
                          days: e.target.value,
                          date: followUpDate.toISOString().split('T')[0]
                        });
                      }}
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Follow Up Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded"
                      value={followUp.date}
                      onChange={(e) => setFollowUp({ ...followUp, date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advice</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                    placeholder="Enter advice for patient..."
                    value={advice}
                    onChange={(e) => setAdvice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quick Advice Selection</label>
                  <div className="flex flex-wrap gap-2">
                    {(predefinedAdvice[language] || predefinedAdvice.en).map((adv) => (
                      <button
                        key={adv}
                        type="button"
                        onClick={() => {
                          if (advice && !advice.endsWith('\n')) {
                            setAdvice(advice + '\n' + adv);
                          } else {
                            setAdvice((advice || '') + adv);
                          }
                        }}
                        className="px-2 py-1 text-xs bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 transition"
                      >
                        + {adv}
                      </button>
                    ))}
                    {customAdviceItems.map((adv, idx) => (
                      <span key={'ca-' + idx} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 border border-blue-200 rounded">
                        <button
                          type="button"
                          onClick={() => {
                            if (advice && !advice.endsWith('\n')) {
                              setAdvice(advice + '\n' + adv);
                            } else {
                              setAdvice((advice || '') + adv);
                            }
                          }}
                          className="hover:text-blue-700"
                        >
                          + {adv}
                        </button>
                        <button type="button" onClick={() => deleteCustomAdvice(idx)} className="text-red-400 hover:text-red-600 ml-1">&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      className="flex-1 px-2 py-1 text-xs border rounded"
                      placeholder="Type custom advice..."
                      value={newAdviceInput}
                      onChange={(e) => setNewAdviceInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomAdvice(newAdviceInput); } }}
                    />
                    <button
                      type="button"
                      onClick={() => addCustomAdvice(newAdviceInput)}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );

        default:
          return null;
      }
    });
  };

  const [symptomInput, setSymptomInput] = useState('');
  const [symptomDropdown, setSymptomDropdown] = useState(false);
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [diagnosisDropdown, setDiagnosisDropdown] = useState(false);
  const [diagnosisSearchResults, setDiagnosisSearchResults] = useState([]); // ICD diagnosis search results
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [snomedDiagnosisResults, setSnomedDiagnosisResults] = useState([]); // SNOMED CT diagnosis search results
  const [symptoms, setSymptoms] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  // ICD integration state
  const [icdQuery, setIcdQuery] = useState('');
  const [icdResults, setIcdResults] = useState([]);
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);
  const [selectedIcds, setSelectedIcds] = useState([]); // [{ icd_code, icd_title }]
  const [icdVersion, setIcdVersion] = useState('all'); // 'icd10', 'icd11', 'all'
  const [symptomsTemplates, setSymptomsTemplates] = useState([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [diagnosisTemplates, setDiagnosisTemplates] = useState([]);
  const [showDiagnosisTemplateSelector, setShowDiagnosisTemplateSelector] = useState(false);
  const [medInput, setMedInput] = useState('');
  const [medDropdown, setMedDropdown] = useState(false);
  const [showTaperInput, setShowTaperInput] = useState(false);
  const [taperMedInput, setTaperMedInput] = useState('');
  const [taperMedResults, setTaperMedResults] = useState([]);
  const [taperMedLoading, setTaperMedLoading] = useState(false);
  const [meds, setMeds] = useState([]);
  const [medications, setMedications] = useState([]); // Alias for meds for compatibility
  const [snomedDrugResults, setSnomedDrugResults] = useState([]); // SNOMED CT drug search results
  const [medicationSuggestions, setMedicationSuggestions] = useState([]); // Real medications from API
  const [frequentlyPrescribedMeds, setFrequentlyPrescribedMeds] = useState([]); // Patient's frequently prescribed
  const [medicationLoading, setMedicationLoading] = useState(false); // Loading state for med search
  const [medicationsTemplates, setMedicationsTemplates] = useState([]);
  const [showMedicationsTemplateSelector, setShowMedicationsTemplateSelector] = useState(false);
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [advice, setAdvice] = useState('');
  const [enableTranslations, setEnableTranslations] = useState(false);
  const [selectedAdvice, setSelectedAdvice] = useState([]);
  const [customAdviceItems, setCustomAdviceItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('custom_advice_items') || '[]'); } catch { return []; }
  });
  const [newAdviceInput, setNewAdviceInput] = useState('');
  const [printOnPrescription, setPrintOnPrescription] = useState(true);
  const [followUp, setFollowUp] = useState({ days: '', date: '', autoFill: false });
  const [patientNotes, setPatientNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [adviceTemplates, setAdviceTemplates] = useState([]);
  const [adviceTemplatesLoading, setAdviceTemplatesLoading] = useState(false);
  // Allergies and warnings
  const [patientAllergies, setPatientAllergies] = useState([]);
  const [allergyConflicts, setAllergyConflicts] = useState([]);
  // SNOMED pagination & suggestions
  const [snomedDiagnosisPage, setSnomedDiagnosisPage] = useState(0);
  const [snomedDrugPage, setSnomedDrugPage] = useState(0);
  const [snomedSymptomResults, setSnomedSymptomResults] = useState([]);
  const [suggestedDx, setSuggestedDx] = useState([]);
  const [suggestedMeds, setSuggestedMeds] = useState([]);
  const [showMedicationSuggestionModal, setShowMedicationSuggestionModal] = useState(false);
  const [pendingMedicationSuggestions, setPendingMedicationSuggestions] = useState([]);
  
  // PHASE 1: Quick Wins state variables
  const [showTemplateQuickWins, setShowTemplateQuickWins] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [recentMedicines, setRecentMedicines] = useState([]);

  // Custom Template Creation states
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateShortName, setNewTemplateShortName] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateFormData, setTemplateFormData] = useState({
    symptoms: '',
    diagnoses: '',
    medications: [{ name: '', brand: '', composition: '', frequency: '', timing: 'After Meal', duration: '', instructions: '', qty: '' }],
    investigations: '',
    precautions: '',
    diet_restrictions: '',
    activities: '',
    advice: '',
    follow_up_days: '',
    duration_days: '7'
  });

  // Fetch custom templates from database
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const response = await api.get('/api/prescription-templates');
        setCustomTemplates(response.data.templates || []);
      } catch (error) {
        console.error('Error fetching templates:', error);
        setCustomTemplates([]);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  // PHASE 2: Advanced Features state variables
  const [showMedicationCombos, setShowMedicationCombos] = useState(false);
  const [medicationCombos, setMedicationCombos] = useState({
    'URTI': [
      { name: 'Amoxicillin', brand: '', composition: '500mg', frequency: '1-1-1', timing: '1-1-1', duration: '5 days', instructions: 'After food', qty: '' },
      { name: 'Cetirizine', brand: '', composition: '10mg', frequency: '0-0-1', timing: '0-0-1', duration: '5 days', instructions: 'At night', qty: '' }
    ],
    'Migraine': [
      { name: 'Ibuprofen', brand: '', composition: '400mg', frequency: '1-0-1', timing: '1-0-1', duration: '7 days', instructions: 'After food', qty: '' },
      { name: 'Metoclopramide', brand: '', composition: '10mg', frequency: '1-1-1', timing: '1-1-1', duration: '7 days', instructions: 'Before meals', qty: '' }
    ],
    'Gastritis': [
      { name: 'Omeprazole', brand: '', composition: '20mg', frequency: '1-0-0', timing: '1-0-0', duration: '10 days', instructions: 'Before breakfast', qty: '' },
      { name: 'Domperidone', brand: '', composition: '10mg', frequency: '1-1-1', timing: '1-1-1', duration: '10 days', instructions: 'Before meals', qty: '' }
    ],
    'HTN': [
      { name: 'Amlodipine', brand: '', composition: '5mg', frequency: '1-0-0', timing: '1-0-0', duration: 'Continued', instructions: 'Once daily', qty: '' },
      { name: 'Lisinopril', brand: '', composition: '10mg', frequency: '1-0-0', timing: '1-0-0', duration: 'Continued', instructions: 'Once daily', qty: '' }
    ],
    'Diabetes': [
      { name: 'Metformin', brand: '', composition: '500mg', frequency: '1-1-1', timing: '1-1-1', duration: 'Continued', instructions: 'With meals', qty: '' },
      { name: 'Glipizide', brand: '', composition: '5mg', frequency: '1-0-1', timing: '1-0-1', duration: 'Continued', instructions: 'Before meals', qty: '' }
    ]
  });
  const [showRecentSidebar, setShowRecentSidebar] = useState(true);
  const [dosageCalculator, setDosageCalculator] = useState({
    calculateDosage: (drugName, weight, age) => {
      const dosages = {
        'Paracetamol': { base: 15, frequency: '1-1-1', unit: 'mg/kg' },
        'Ibuprofen': { base: 10, frequency: '1-1-1', unit: 'mg/kg' },
        'Amoxicillin': { base: 25, frequency: '1-1-1', unit: 'mg/kg' },
        'Metformin': { base: 0, frequency: '0-0-0', unit: 'fixed', fixed: 500 },
        'Cephalexin': { base: 25, frequency: '1-1-1', unit: 'mg/kg' }
      };
      const dose = dosages[drugName];
      if (!dose) return { calculatedDose: 'Not found', frequency: '', warning: '' };
      if (dose.unit === 'fixed') {
        return { calculatedDose: `${dose.fixed}mg`, frequency: dose.frequency, warning: '' };
      }
      const calcDose = Math.round((weight * dose.base) / 10) * 10;
      let warning = '';
      if (age < 5 && calcDose > 250) warning = 'Consider pediatric dosing';
      if (age > 65 && calcDose > 500) warning = 'Monitor renal function';
      return { calculatedDose: `${calcDose}mg`, frequency: dose.frequency, warning };
    }
  });
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showComplianceTracker, setShowComplianceTracker] = useState(false);
  const [complianceStatus, setComplianceStatus] = useState(null);
  const [splitViewMode, setSplitViewMode] = useState('full'); // 'split' or 'full'

  // NEW: Additional sections
  const [examinationFindings, setExaminationFindings] = useState('');
  const [generalExamination, setGeneralExamination] = useState('');
  const [systemicExamination, setSystemicExamination] = useState('');
  const [showExaminationTemplateModal, setShowExaminationTemplateModal] = useState(false);
  const [labResults, setLabResults] = useState([]);
  // Lab Records & Medical Records for prescription pad
  const [prescriptionRecords, setPrescriptionRecords] = useState([]);
  const [showRecordUploadModal, setShowRecordUploadModal] = useState(false);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [recordUploadForm, setRecordUploadForm] = useState({ name: '', category: 'OTHERS', description: '', file: null });
  const [manualRecordForm, setManualRecordForm] = useState({ name: '', category: 'OTHERS', description: '', date: new Date().toISOString().split('T')[0] });
  const [recordUploadLoading, setRecordUploadLoading] = useState(false);
  // Lab test templates from database
  const [labTemplates, setLabTemplates] = useState([]);
  const [labTemplateCategories, setLabTemplateCategories] = useState([]);
  const [showLabTemplateModal, setShowLabTemplateModal] = useState(false);
  const [selectedLabCategory, setSelectedLabCategory] = useState('');
  const [labResultEntries, setLabResultEntries] = useState([]); // {test_name, result_value, result_unit, reference_range, category, parameters: []}
  const [labParamFormTest, setLabParamFormTest] = useState(null); // currently selected test for parameter entry
  const [labParamFormData, setLabParamFormData] = useState([]); // parameter values being filled
  const [labParamLoading, setLabParamLoading] = useState(false);
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [labAdvice, setLabAdvice] = useState('');
  const [labRemarks, setLabRemarks] = useState('');
  // Examination Findings custom templates
  const [customExamTemplates, setCustomExamTemplates] = useState([]);
  const [showSaveExamTemplate, setShowSaveExamTemplate] = useState(false);
  const [examTemplateName, setExamTemplateName] = useState('');
  const [labTestInput, setLabTestInput] = useState('');
  const [procedures, setProcedures] = useState([]);
  const [printProcedures, setPrintProcedures] = useState(true);
  const [referralDoctor, setReferralDoctor] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString());

  // Past data states
  const [pastVisitsTab, setPastVisitsTab] = useState('past');
  const [pastVisits, setPastVisits] = useState([]);
  const [pastPrescriptions, setPastPrescriptions] = useState([]);
  const [pastVitals, setPastVitals] = useState([]);
  const [pastRecords, setPastRecords] = useState([]);
  const [loadingPastData, setLoadingPastData] = useState(false);

  // Patient search states
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);

  // Current prescription ID for PDF download and compliance tracker
  const [currentPrescriptionId, setCurrentPrescriptionId] = useState(null);

  // Monetize Rx option
  const [monetizeRx, setMonetizeRx] = useState(false);

  // Lab results modal state
  const [showLabResultsModal, setShowLabResultsModal] = useState(false);
  const [previousLabResults, setPreviousLabResults] = useState([]);

  // Letterhead toggle for print/download (default: false = no header/footer)
  const [printWithLetterhead, setPrintWithLetterhead] = useState(false);

  // Receipt template states
  const [receiptTemplates, setReceiptTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDefaultLetterhead, setShowDefaultLetterhead] = useState(() => {
    return localStorage.getItem('hideDefaultLetterhead') !== 'true';
  });
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const templateDropdownRef = useRef(null);

  // Specialty module states
  const [showSpecialtySelector, setShowSpecialtySelector] = useState(false);
  const [specialtyData, setSpecialtyData] = useState(null);

  // Print format states
  const [printFormat, setPrintFormat] = useState('A4'); // 'A4' or 'A5'

  // Smart Prescription states
  const [smartSuggestions, setSmartSuggestions] = useState({
    medicines: [],
    diagnoses: [],
    investigations: [],
    frequentlyUsed: [],
    interactions: [],
    warnings: []
  });
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const [drugInteractions, setDrugInteractions] = useState([]);
  const [showInteractionWarnings, setShowInteractionWarnings] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');

  // Calculate filtered symptoms for dropdown (after smartSuggestions is declared)
  const remoteSymptomTerms = (snomedSymptomResults || [])
    .map(c => (c?.pt?.term || c?.fsn?.term || ''))
    .filter(Boolean);
  const combinedSymptomsPool = [...new Set([...remoteSymptomTerms, ...symptomSuggestions])];
  const filteredSymptoms = symptomInput.length > 0
    ? combinedSymptomsPool.filter(s => s.toLowerCase().includes(symptomInput.toLowerCase()))
    : [...new Set([...remoteSymptomTerms.slice(0, 6), ...symptomSuggestions.slice(0, 4)])];

  // Fetch smart suggestions based on diagnosis, symptoms, and patient history
  const fetchSmartSuggestions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (patientId) params.append('patientId', patientId);
      if (diagnoses.length > 0) params.append('diagnosis', diagnoses.map(d => d.icd_code || d).join(','));
      if (symptoms.length > 0) params.append('symptoms', symptoms.map(s => typeof s === 'object' ? s.name : s).join(','));
      if (patient?.age) params.append('age', patient.age);
      if (patient?.weight) params.append('weight', patient.weight);

      // console.log('🔍 Fetching smart suggestions with params:', params.toString());
      const res = await api.get(`/api/smart-prescription/suggestions?${params}`);
      // console.log('📊 Smart suggestions response:', res.data);
      
      if (res.data?.success) {
        // console.log('✅ Smart suggestions data:', res.data.data);
        setSmartSuggestions(res.data.data);
        setShowSmartSuggestions(true);
      } else {
        // console.log('❌ Smart suggestions failed:', res.data);
      }
    } catch (error) {
      console.error('Error fetching smart suggestions:', error);
    }
  }, [api, patientId, diagnoses, symptoms, patient]);

  // Check for drug interactions
  const checkDrugInteractions = useCallback(async () => {
    try {
      const medicines = meds.map(m => ({ name: m.name || m.brand, composition: m.composition }));
      const res = await api.post('/api/smart-prescription/check-interactions', { medicines });
      if (res.data?.success) {
        setDrugInteractions(res.data.data.interactions);
        setShowInteractionWarnings(res.data.data.interactions.length > 0 || res.data.data.warnings.length > 0);
      }
    } catch (error) {
      console.error('Error checking drug interactions:', error);
    }
  }, [api, meds]);

  // Calculate dosage for a medicine
  const calculateDosage = useCallback(async (medicineName) => {
    try {
      const params = new URLSearchParams();
      params.append('medicineName', medicineName);
      if (patient?.age) params.append('age', patient.age);
      if (patient?.weight) params.append('weight', patient.weight);
      params.append('patientType', patient?.age && parseInt(patient.age) < 18 ? 'pediatric' : 'adult');

      const res = await api.get(`/api/smart-prescription/calculate-dosage?${params}`);
      if (res.data?.success) {
        return res.data.data.dosage;
      }
    } catch (error) {
      console.error('Error calculating dosage:', error);
    }
    return null;
  }, [api, patient]);

  // Auto-save functionality
  const saveDraft = useCallback(async () => {
    try {
      const draftData = {
        patientId,
        symptoms,
        diagnoses,
        meds,
        advice,
        followUp,
        patientNotes,
        privateNotes,
        procedures,
        vitals,
        timestamp: new Date().toISOString()
      };

      // Save to localStorage for now (can be extended to backend)
      localStorage.setItem(`prescription_draft_${patientId}`, JSON.stringify(draftData));
      setAutoSaveStatus('Draft saved');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [patientId, symptoms, diagnoses, meds, advice, followUp, patientNotes, privateNotes, procedures, vitals]);

  // Load draft on component mount
  const loadDraft = useCallback(() => {
    try {
      if (!patientId) return;
      const draft = localStorage.getItem(`prescription_draft_${patientId}`);
      if (draft) {
        const draftData = JSON.parse(draft);
        // Only load if draft is less than 24 hours old
        const draftTime = new Date(draftData.timestamp);
        const now = new Date();
        const hoursDiff = (now - draftTime) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          setSymptoms(draftData.symptoms || []);
          setDiagnoses(draftData.diagnoses || []);
          setMeds((draftData.meds || []).map(m => ({
            ...m,
            timing: translateTiming(m.timing, language) || m.timing,
            instructions: translateInstruction(m.instructions, language) || m.instructions
          })));
          setAdvice(draftData.advice || '');
          const draftFollowUp = draftData.followUp || { days: '', date: '', autoFill: false };
          // Sanitize days: reset if object or not a valid number string
          if (draftFollowUp.days && (typeof draftFollowUp.days === 'object' || isNaN(parseInt(draftFollowUp.days, 10)))) draftFollowUp.days = '';
          setFollowUp(draftFollowUp);
          setPatientNotes(draftData.patientNotes || '');
          setPrivateNotes(draftData.privateNotes || '');
          setProcedures(draftData.procedures || []);
          setVitals(draftData.vitals || {});
          addToast('Draft loaded from auto-save', 'info');
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, [patientId, addToast]);

  // Template Management states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateShortName, setTemplateShortName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // Save current prescription as template
  const saveAsTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      addToast('Please enter a template name', 'error');
      return;
    }

    try {
      const templateData = {
        template_name: templateName,
        short_name: templateShortName,
        category: templateCategory,
        description: templateDescription,
        symptoms: JSON.stringify(symptoms),
        diagnosis: JSON.stringify(diagnoses),
        medications: JSON.stringify(meds.map(m => ({
          name: m.name,
          brand: m.brand,
          strength: m.strength,
          dosage_form: m.dosage_form,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions
        }))),
        advice,
        precautions: advice, // Using advice for precautions
        follow_up_days: (() => { const d = parseInt(followUp.days, 10); return isNaN(d) ? null : d; })(),
        duration_days: (() => { const d = parseInt(followUp.days, 10); return isNaN(d) ? 7 : d; })(),
        created_by: user?.id
      };

      await api.post('/api/prescription-templates', templateData);
      addToast('Template saved successfully', 'success');
      setShowTemplateModal(false);
      setTemplateName('');
      setTemplateShortName('');
      setTemplateCategory('');
      setTemplateDescription('');
    } catch (error) {
      console.error('Error saving template:', error, error.response?.data);
      const errMsg = error.response?.data?.error || error.message || 'Failed to save template';
      addToast(errMsg, 'error');
    }
  }, [templateName, templateShortName, templateCategory, templateDescription, meds, symptoms, diagnoses, advice, followUp, user, api, addToast]);

  // ========================================
  // Fetch Doctor ID
  // ========================================
  const fetchDoctorId = useCallback(async () => {
    try {
      // Method 1: If user is logged in and is a doctor
      if (user && user.id) {
        try {
          const res = await api.get(`/api/doctors/by-user/${user.id}`);
          if (res.data && res.data.id) {
            setMeta(prev => ({ ...prev, doctor_id: res.data.id }));
            return;
          }
        } catch (err) {
          // console.log('User is not a doctor, trying fallback...');
        }
      }

      // Method 2: Fallback - get first available doctor
      try {
        const res = await api.get('/api/doctors');
        if (res.data.doctors && res.data.doctors.length > 0) {
          setMeta(prev => ({ ...prev, doctor_id: res.data.doctors[0].id }));
        }
      } catch (err) {
        console.error('Failed to fetch doctors list:', err);
      }
    } catch (error) {
      console.error('Error fetching doctor ID:', error);
    }
  }, [api, user]);

  // ========================================
  // Fetch Patient
  // ========================================
  const fetchPatient = useCallback(async () => {
    try {
      if (!patientId) {
        addToast('No patient ID provided', 'error');
        return;
      }
      const res = await api.get(`/api/patients/${patientId}`);
      setPatient(res.data);
      setMeta(prev => ({ ...prev, patient_id: res.data.id }));
    } catch (error) {
      console.error('Error loading patient:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to load patient';
      addToast(errorMsg, 'error');
    }
  }, [api, patientId, addToast]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft();
    }, 30000);

    return () => clearInterval(interval);
  }, [saveDraft]);

  // Load draft on component mount
  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  // Fetch smart suggestions when diagnosis or symptoms change
  useEffect(() => {
    if (diagnoses.length > 0 || symptoms.length > 0) {
      const timer = setTimeout(() => {
        fetchSmartSuggestions();
      }, 1000); // Debounce 1 second

      return () => clearTimeout(timer);
    }
  }, [diagnoses, symptoms, fetchSmartSuggestions]);

  // Check drug interactions when medicines change
  useEffect(() => {
    if (meds.length >= 2) {
      const timer = setTimeout(() => {
        checkDrugInteractions();
      }, 2000); // Debounce 2 seconds

      return () => clearTimeout(timer);
    }
  }, [meds, checkDrugInteractions]);

  // ========================================
  // Search Patients
  // ========================================
  const searchPatients = async (query) => {
    if (!query || query.length < 2) {
      setPatientResults([]);
      return;
    }

    try {
      const res = await api.get(`/api/patients?search=${query}`);
      setPatientResults(res.data.patients || []);
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatientResults([]);
    }
  };

  const handlePatientSelect = (selectedPatient) => {
    navigate(`/orders/${selectedPatient.id}`);
    setShowPatientSearch(false);
    setPatientSearch('');
    setPatientResults([]);
  };

  // ========================================
  // Fetch Past Data
  // ========================================
  const fetchPastData = useCallback(async () => {
    if (!patientId) return;
    setLoadingPastData(true);
    try {
      // Fetch past prescriptions
      try {
        const rxRes = await api.get(`/api/prescriptions/${patientId}?limit=50`);
        setPastPrescriptions(rxRes.data?.data?.prescriptions || rxRes.data?.prescriptions || []);
      } catch (err) {
        console.error('Failed to fetch prescriptions:', err);
      }
      
      // Fetch past appointments (visits)
      try {
        const aptRes = await api.get(`/api/appointments`);
        const allAppointments = aptRes.data.appointments || [];
        const patientAppointments = allAppointments.filter(apt => 
          apt.patient_id == patientId || apt.patient_id?.toString() === patientId
        );
        setPastVisits(patientAppointments.slice(0, 10));
      } catch (err) {
        console.error('Failed to fetch appointments:', err);
      }
      
      // Fetch past vitals
      try {
        const vitalsRes = await api.get(`/api/patient-data/vitals/${patientId}`);
        const vitalsData = vitalsRes.data.vitals || [];
        setPastVitals(vitalsData);

        // Auto-fill with latest vitals - API returns flattened array [{label, value, date}]
        if (vitalsData.length > 0) {
          // Group by label and take the latest value for each
          const vitalsMap = {};
          for (const v of vitalsData) {
            if (v.value != null && !vitalsMap[v.label]) {
              vitalsMap[v.label] = v.value;
            }
          }
          const h = parseFloat(vitalsMap['Height']) || 0;
          const w = parseFloat(vitalsMap['Weight']) || 0;
          const bmiCalc = h > 0 && w > 0 ? (w / ((h / 100) ** 2)).toFixed(1) : '';
          const newVitals = {
            temp: vitalsMap['Temperature'] || '',
            height: vitalsMap['Height'] || '',
            bmi: vitalsMap['BMI'] || bmiCalc || '',
            weight: vitalsMap['Weight'] || '',
            pulse: vitalsMap['Pulse Rate'] || vitalsMap['Pulse'] || '',
            blood_pressure: vitalsMap['Blood Pressure'] || vitalsMap['BP'] || '',
            spo2: vitalsMap['SpO2'] || vitalsMap['SPO2'] || ''
          };
          // Only update vitals if we got meaningful data from API
          if (Object.values(newVitals).some(v => v !== '')) {
            setVitals(prev => ({
              ...prev,
              ...Object.fromEntries(Object.entries(newVitals).filter(([_, v]) => v !== ''))
            }));
          }
          // console.log('Auto-filled vitals from records:', newVitals);
        }
      } catch (err) {
        console.error('Failed to fetch vitals:', err);
      }
      
      // Fetch medical records
      try {
        const recordsRes = await api.get(`/api/patient-data/records/${patientId}`);
        setPastRecords(recordsRes.data.records || []);
      } catch (err) {
        console.error('Failed to fetch records:', err);
      }
      
      // Fetch lab results to sync with PatientOverview
      try {
        const labsRes = await api.get(`/api/labs/${patientId}`);
        const labsData = labsRes.data.labs || [];
        // Convert lab results to prescription format
        const labEntries = labsData.map(lab => ({
          id: lab.id,
          test_name: lab.name,
          result_value: lab.reading,
          result_unit: lab.unit,
          reference_range: lab.reference_range,
          category: lab.test_category || 'GENERAL',
          date: lab.date
        }));
        // Set lab results for display in prescription
        setLabResultEntries(labEntries);
      } catch (err) {
        console.error('Failed to fetch lab results:', err);
      }
    } catch (err) {
      console.error('Failed to load past data:', err);
    } finally {
      setLoadingPastData(false);
    }
  }, [api, patientId]);

  // ========================================
  // Medical History Functions (dr.eka.care style)
  // ========================================
  const fetchMedicalHistory = useCallback(async () => {
    if (!patientId) return;
    setMedicalHistoryLoading(true);
    try {
      const res = await api.get(`/api/medical-history/patient/${patientId}`);
      if (res.data?.success) {
        setMedicalHistoryData(res.data.data || {
          medicalHistory: [],
          existingConditions: [],
          surgicalHistory: [],
          allergies: [],
          familyHistory: []
        });
      }
    } catch (err) {
      console.error('Failed to fetch medical history:', err);
    } finally {
      setMedicalHistoryLoading(false);
    }
  }, [api, patientId]);

  const toggleMedicalCondition = async (option, newValue) => {
    try {
      await api.put(`/api/medical-history/patient/${patientId}/toggle`, {
        option_id: option.option_id,
        condition_name: option.condition_name,
        has_condition: newValue,
        since_date: option.since_date || null
      });
      // Update local state
      setMedicalHistoryData(prev => ({
        ...prev,
        medicalHistory: prev.medicalHistory.map(item =>
          item.option_id === option.option_id
            ? { ...item, has_condition: newValue }
            : item
        )
      }));
    } catch (err) {
      console.error('Failed to toggle condition:', err);
      addToast('Failed to update condition', 'error');
    }
  };

  const updateConditionSince = async (option, sinceDate) => {
    try {
      await api.put(`/api/medical-history/patient/${patientId}/toggle`, {
        option_id: option.option_id,
        condition_name: option.condition_name,
        has_condition: option.has_condition,
        since_date: sinceDate
      });
      // Update local state
      setMedicalHistoryData(prev => ({
        ...prev,
        medicalHistory: prev.medicalHistory.map(item =>
          item.option_id === option.option_id
            ? { ...item, since_date: sinceDate }
            : item
        )
      }));
    } catch (err) {
      console.error('Failed to update since date:', err);
    }
  };

  const addExistingCondition = async () => {
    if (!newCondition.condition_name.trim()) {
      addToast('Condition name is required', 'error');
      return;
    }
    try {
      const res = await api.post(`/api/medical-history/patient/${patientId}/existing-condition`, newCondition);
      if (res.data?.success) {
        setMedicalHistoryData(prev => ({
          ...prev,
          existingConditions: [...prev.existingConditions, { id: res.data.id, ...newCondition, status: 'Active' }]
        }));
        setNewCondition({ condition_name: '', icd_code: '', start_date: '', notes: '' });
        setShowAddConditionModal(false);
        addToast('Condition added', 'success');
      }
    } catch (err) {
      console.error('Failed to add condition:', err);
      addToast('Failed to add condition', 'error');
    }
  };

  const deleteExistingCondition = async (conditionId) => {
    try {
      await api.delete(`/api/medical-history/patient/${patientId}/existing-condition/${conditionId}`);
      setMedicalHistoryData(prev => ({
        ...prev,
        existingConditions: prev.existingConditions.filter(c => c.id !== conditionId)
      }));
      addToast('Condition removed', 'success');
    } catch (err) {
      console.error('Failed to delete condition:', err);
      addToast('Failed to remove condition', 'error');
    }
  };

  const addSurgicalProcedure = async () => {
    if (!newSurgery.surgery_name.trim()) {
      addToast('Surgery name is required', 'error');
      return;
    }
    try {
      const res = await api.post(`/api/medical-history/patient/${patientId}/surgical-procedure`, newSurgery);
      if (res.data?.success) {
        setMedicalHistoryData(prev => ({
          ...prev,
          surgicalHistory: [...prev.surgicalHistory, { id: res.data.id, ...newSurgery }]
        }));
        setNewSurgery({ surgery_name: '', surgery_date: '', hospital: '', surgeon: '', complications: '' });
        setShowAddSurgeryModal(false);
        addToast('Surgery added', 'success');
      }
    } catch (err) {
      console.error('Failed to add surgery:', err);
      addToast('Failed to add surgery', 'error');
    }
  };

  const deleteSurgicalProcedure = async (procedureId) => {
    try {
      await api.delete(`/api/medical-history/patient/${patientId}/surgical-procedure/${procedureId}`);
      setMedicalHistoryData(prev => ({
        ...prev,
        surgicalHistory: prev.surgicalHistory.filter(s => s.id !== procedureId)
      }));
      addToast('Surgery removed', 'success');
    } catch (err) {
      console.error('Failed to delete surgery:', err);
      addToast('Failed to remove surgery', 'error');
    }
  };

  // ========================================
  // useEffect Hooks
  // ========================================

  // Load appointment context from sessionStorage
  useEffect(() => {
    try {
      const appointmentData = sessionStorage.getItem('currentAppointment');
      if (appointmentData) {
        const { appointmentId } = JSON.parse(appointmentData);
        if (appointmentId) {
          // console.log('Loading appointment ID from sessionStorage:', appointmentId);
          setMeta(prev => ({ ...prev, appointment_id: appointmentId }));
        }
      }
    } catch (error) {
      console.error('Error loading appointment context:', error);
    }
  }, []);

  useEffect(() => {
    fetchDoctorId();
  }, [fetchDoctorId]);

  useEffect(() => {
    if (patientId) {
      fetchPatient();
      fetchPastData();
      fetchMedicalHistory();
    }
  }, [patientId, fetchPatient, fetchPastData, fetchMedicalHistory]);

  // Load copied prescription data from PatientOverview
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('copy') === 'true') {
      try {
        const rxData = JSON.parse(sessionStorage.getItem('copyPrescription') || '{}');
        if (rxData.symptoms && rxData.symptoms.length > 0) {
          setSymptoms(rxData.symptoms.map(s => typeof s === 'string' ? { name: s, remarks: '' } : s));
        }
        if (rxData.diagnoses && rxData.diagnoses.length > 0) {
          setDiagnoses(rxData.diagnoses);
        }
        if (rxData.medications && rxData.medications.length > 0) {
          setMeds(rxData.medications.map(m => ({
            ...m,
            timing: translateTiming(m.timing, language) || m.timing,
            instructions: translateInstruction(m.instructions, language) || m.instructions
          })));
        }
        if (rxData.advice) {
          setAdvice(rxData.advice);
        }
        if (rxData.follow_up_days) {
          setFollowUp(prev => ({ ...prev, days: String(typeof rxData.follow_up_days === 'object' ? (rxData.follow_up_days?.days || '') : rxData.follow_up_days || '') }));
        }
        if (rxData.patient_notes) {
          setPatientNotes(rxData.patient_notes);
        }
        sessionStorage.removeItem('copyPrescription');
        addToast('Prescription data copied from previous visit', 'success');
      } catch (e) {
        console.error('Failed to load copied prescription:', e);
      }
    }
  }, [location.search]);

  // Fetch active allergies for this patient
  useEffect(() => {
    const fetchAllergies = async () => {
      if (!patientId) return;
      try {
        const res = await api.get(`/api/allergies/${patientId}`, { params: { active: 1 } });
        setPatientAllergies(Array.isArray(res.data?.items) ? res.data.items : []);
      } catch (e) {
        setPatientAllergies([]);
      }
    };
    fetchAllergies();
  }, [api, patientId]);

  // Compute allergy conflicts whenever meds or allergies change
  useEffect(() => {
    const normalize = (s) => (s || '')
      .toString()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s\.\-]/g, '')
      .trim();

    const conflicts = [];
    for (const m of meds) {
      const medName = normalize(m?.name || m?.brand || m?.medication_name);
      if (!medName) continue;
      for (const a of patientAllergies) {
        const alNameOrig = a?.allergen_name || '';
        const alName = normalize(alNameOrig);
        if (!alName) continue;
        if (medName.includes(alName) || alName.includes(medName)) {
          const label = `${m?.brand || m?.name || 'Medicine'} ↔ ${alNameOrig}`;
          conflicts.push(label);
        }
      }
    }
    // de-duplicate
    setAllergyConflicts([...new Set(conflicts)]);
  }, [meds, patientAllergies]);

  // Prefill from last prescription if coming from Patient Overview
  useEffect(() => {
    try {
      const prefillStr = sessionStorage.getItem('prefill_last_rx');
      if (!prefillStr) return;
      sessionStorage.removeItem('prefill_last_rx');
      const rx = JSON.parse(prefillStr);
      if (!rx) return;

      // Symptoms
      const sx = Array.isArray(rx.symptoms) ? rx.symptoms : (rx.symptoms ? [rx.symptoms] : []);
      if (sx.length) setSymptoms(sx);

      // Diagnoses
      const dx = Array.isArray(rx.diagnoses) ? rx.diagnoses : (rx.diagnoses ? [rx.diagnoses] : []);
      if (dx.length) setDiagnoses(dx);

      // Medications - Filter out invalid entries and translate to current language
      const medsIn = Array.isArray(rx.medications) ? rx.medications : [];
      if (medsIn.length) {
        const validMeds = medsIn
          .filter(m => m && (m.name || m.medication_name || m.brand))
          .map(m => {
            const rawTiming = m.timing || (timingOptions[language] || timingOptions.en)[0];
            const rawInstructions = m.instructions || '';
            return {
              name: m.name || m.medication_name || m.brand || '',
              brand: m.brand || m.name || '',
              composition: m.composition || '',
              frequency: m.frequency || m.dosage || '',
              timing: translateTiming(rawTiming, language) || rawTiming,
              duration: m.duration || '',
              instructions: translateInstruction(rawInstructions, language) || rawInstructions,
              qty: m.quantity || m.qty || 0
            };
          });
        if (validMeds.length > 0) {
          setMeds(validMeds);
        }
      }

      // Advice
      if (rx.advice || rx.advices) setAdvice(rx.advice || rx.advices || '');

      // Follow-up
      if (rx.follow_up_date) setFollowUp(prev => ({ ...prev, date: rx.follow_up_date }));

      addToast('Prefilled from last prescription. Review and save.', 'success');
    } catch (e) {
      console.error('Prefill error:', e);
    }
  }, [language, addToast]);

  // Fetch symptoms templates
  useEffect(() => {
    const fetchSymptomsTemplates = async () => {
      try {
        const res = await api.get('/api/symptoms-templates');
        setSymptomsTemplates(res.data.templates || []);
      } catch (error) {
        console.error('Failed to fetch symptoms templates:', error);
      }
    };
    fetchSymptomsTemplates();
  }, [api]);

  // Fetch diagnosis templates
  useEffect(() => {
    const fetchDiagnosisTemplates = async () => {
      try {
        const res = await api.get('/api/diagnosis-templates');
        setDiagnosisTemplates(res.data.templates || []);
      } catch (error) {
        console.error('Failed to fetch diagnosis templates:', error);
      }
    };
    fetchDiagnosisTemplates();
  }, [api]);

  // Fetch lab templates from database
  useEffect(() => {
    const fetchLabTemplates = async () => {
      try {
        const res = await api.get('/api/lab-templates');
        const templates = res.data.data || res.data.templates || res.data || [];
        setLabTemplates(templates);
        const categories = [...new Set(templates.map(t => t.category).filter(Boolean))];
        setLabTemplateCategories(categories);
      } catch (error) {
        console.error('Failed to fetch lab templates:', error);
      }
    };
    fetchLabTemplates();
  }, [api]);

  // Load custom examination templates from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('custom_exam_templates');
      if (saved) setCustomExamTemplates(JSON.parse(saved));
    } catch (e) {}
  }, []);

  // Fetch advice templates based on language
  useEffect(() => {
    const fetchAdviceTemplates = async () => {
      try {
        setAdviceTemplatesLoading(true);
        const res = await api.get('/api/advice/templates', {
          params: { language, limit: 50 }
        });
        const payload = res.data?.data || res.data || [];
        setAdviceTemplates(Array.isArray(payload) ? payload : []);
      } catch (error) {
        console.error('Failed to fetch advice templates:', error);
        setAdviceTemplates([]);
      } finally {
        setAdviceTemplatesLoading(false);
      }
    };
    fetchAdviceTemplates();
  }, [language, api]);

  // Fetch medications templates
  useEffect(() => {
    const fetchMedicationsTemplates = async () => {
      try {
        const res = await api.get('/api/medications-templates');
        setMedicationsTemplates(res.data.templates || []);
      } catch (error) {
        console.error('Failed to fetch medications templates:', error);
      }
    };
    fetchMedicationsTemplates();
  }, [api]);

  // Fetch receipt templates for prescription letterhead
  useEffect(() => {
    const fetchReceiptTemplates = async () => {
      try {
        const res = await api.get('/api/receipt-templates');
        const templates = res.data.templates || [];
        setReceiptTemplates(templates);

        // Auto-select default template for letterhead
        const defaultTpl = templates.find(t => t.is_default);
        if (defaultTpl) {
          setSelectedTemplateId(defaultTpl.id);
          setSelectedTemplate(defaultTpl);
        }
      } catch (error) {
        console.error('Failed to fetch receipt templates:', error);
      }
    };
    fetchReceiptTemplates();
  }, [api]);

  // Close template dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(e.target)) {
        setShowTemplateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Delete a receipt template
  const deleteReceiptTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this letterhead template?')) return;
    try {
      await api.delete(`/api/receipt-templates/${templateId}`);
      setReceiptTemplates(prev => prev.filter(t => t.id !== templateId));
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId(null);
        setSelectedTemplate(null);
      }
      addToast('Template deleted', 'success');
    } catch (e) {
      addToast('Failed to delete template', 'error');
    }
  };

  // Hide default letterhead
  const hideDefaultLetterhead = () => {
    if (!confirm('Remove Default Letterhead? You can restore it from Doctor Settings.')) return;
    setShowDefaultLetterhead(false);
    localStorage.setItem('hideDefaultLetterhead', 'true');
    // If default was selected, switch to first available template or none
    if (!selectedTemplateId) {
      const first = receiptTemplates[0];
      if (first) {
        setSelectedTemplateId(first.id);
        setSelectedTemplate(first);
      }
    }
    addToast('Default Letterhead removed', 'success');
  };

  // Clear selected advice when language changes to avoid mismatch
  useEffect(() => {
    // Clear selected advice when language changes
    setSelectedAdvice([]);
  }, [language]);

  // PHASE 1: Initialize recent medicines and keyboard shortcuts
  useEffect(() => {
    // Load recently used medicines
    const recent = RecentlyUsedMedicines.getAll();
    setRecentMedicines(recent.slice(0, 15));

    // Setup keyboard shortcuts
    const handleKeyDown = (e) => {
      // Ctrl+T = Open template selector
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        setShowTemplateQuickWins(!showTemplateQuickWins);
        addToast('Template selector opened (Ctrl+T)', 'info');
      }
      // Ctrl+S = Save prescription  
      else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveDraft();
        addToast('Draft saved (Ctrl+S)', 'success');
      }
      // Ctrl+Shift+S = Save as template
      else if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setShowTemplateModal(true);
        addToast('Save as template (Ctrl+Shift+S)', 'info');
      }
      // Ctrl+P = Print prescription
      else if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
      // Ctrl+M = Focus medicine input
      else if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        const medicineInput = document.querySelector('[data-testid="medicine-input"]');
        if (medicineInput) {
          medicineInput.focus();
          addToast('Focused on medicine input (Ctrl+M)', 'info');
        }
      }
      // Ctrl+D = Focus diagnosis input
      else if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        const diagnosisInput = document.querySelector('input[placeholder*="Diagnosis"]');
        if (diagnosisInput) {
          diagnosisInput.focus();
          addToast('Focused on diagnosis input (Ctrl+D)', 'info');
        }
      }
      // Ctrl+L = Focus lab tests input
      else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        const labInput = document.querySelector('[data-testid="lab-input"]');
        if (labInput) {
          labInput.focus();
          addToast('Focused on lab tests input (Ctrl+L)', 'info');
        }
      }
      // Ctrl+I = Check interactions
      else if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        checkDrugInteractions();
        addToast('Checking drug interactions (Ctrl+I)', 'info');
      }
      // Ctrl+Shift+C = Clear form
      else if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        if (window.confirm('Clear entire prescription? This cannot be undone.')) {
          handleClearForm();
          addToast('Prescription cleared', 'success');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTemplateQuickWins, addToast]);

  // PHASE 1: Handle diagnosis auto-suggestions
  const handleDiagnosisAutoSuggest = useCallback((diagnosisName) => {
    const suggestions = diagnosisSuggestions[diagnosisName];
    if (!suggestions) return;

    // Auto-add investigations (lab tests)
    if (suggestions.investigations && labResults.length === 0) {
      setProcedures([...procedures, ...suggestions.investigations.map(inv => ({
        name: inv,
        notes: ''
      }))]);
      addToast(`Added ${diagnosisName} investigations`, 'info');
    }

    // Auto-add precautions
    if (suggestions.precautions && advice.length === 0) {
      setAdvice(suggestions.precautions);
    }

    // Auto-add diet advice
    if (suggestions.diet && !advice.includes(suggestions.diet)) {
      setAdvice(prev => prev ? `${prev}\n\nDiet: ${suggestions.diet}` : `Diet: ${suggestions.diet}`);
    }
  }, [procedures, labResults, advice, addToast]);

  // Handle template application
  const handleApplyTemplate = useCallback((templateName) => {
    // First check quickTemplates
    let template = quickTemplates[templateName];
    
    // If not found in quickTemplates, search in custom templates from DB
    if (!template) {
      const customTemplate = customTemplates.find(t => t.template_name === templateName);
      if (customTemplate) {
        template = {
          name: customTemplate.template_name,
          shortName: customTemplate.category,
          symptoms: typeof customTemplate.symptoms === 'string' ? 
            JSON.parse(customTemplate.symptoms) : customTemplate.symptoms || [],
          diagnoses: typeof customTemplate.diagnoses === 'string' ? 
            JSON.parse(customTemplate.diagnoses) : customTemplate.diagnoses || [],
          medications: typeof customTemplate.medications === 'string' ? 
            JSON.parse(customTemplate.medications) : customTemplate.medications || [],
          investigations: customTemplate.investigations || '',
          precautions: customTemplate.precautions || '',
          dietRestrictions: customTemplate.diet_restrictions || '',
          activities: customTemplate.activities || '',
          advice: customTemplate.advice || '',
          followUpDays: customTemplate.follow_up_days || 7
        };
      }
    }
    
    if (!template) return;

    // Apply template using the utility function
    applyCompleteTemplate(template, {
      setSymptoms,
      setDiagnoses,
      setMeds,
      setAdvice,
      setFollowUp: (days) => setFollowUp(prev => ({ ...prev, days: days.toString() })),
      setPatientNotes,
      setProcedures,
      language
    });

    setShowTemplateQuickWins(false);
    addToast(`Applied ${templateName} template successfully`, 'success');
  }, [addToast, language, customTemplates]);

  // Save current prescription as custom template
  const handleSaveAsTemplate = useCallback(async () => {
    if (!newTemplateName.trim()) {
      addToast('Template name is required', 'error');
      return;
    }
    if (!newTemplateShortName.trim()) {
      addToast('Short name is required', 'error');
      return;
    }

    try {
      const symptomsArr = templateFormData.symptoms
        ? templateFormData.symptoms.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const diagnosesArr = templateFormData.diagnoses
        ? templateFormData.diagnoses.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const medsArr = templateFormData.medications.filter(m => m.name.trim());

      const newTemplate = {
        template_name: newTemplateName,
        category: newTemplateShortName,
        description: `Custom template: ${symptomsArr.join(', ') || newTemplateName}`,
        symptoms: JSON.stringify(symptomsArr),
        diagnoses: JSON.stringify(diagnosesArr),
        medications: JSON.stringify(medsArr),
        investigations: templateFormData.investigations || '',
        precautions: templateFormData.precautions || '',
        diet_restrictions: templateFormData.diet_restrictions || '',
        activities: templateFormData.activities || '',
        advice: templateFormData.advice || '',
        follow_up_days: parseInt(templateFormData.follow_up_days) || 7,
        duration_days: parseInt(templateFormData.duration_days) || 7,
        is_active: 1
      };

      const response = await api.post('/api/prescription-templates', newTemplate);

      if (response.data.template) {
        setCustomTemplates([...customTemplates, response.data.template]);
        setShowCreateTemplateModal(false);
        setNewTemplateName('');
        setNewTemplateShortName('');
        setTemplateFormData({
          symptoms: '', diagnoses: '',
          medications: [{ name: '', brand: '', composition: '', frequency: '', timing: 'After Meal', duration: '', instructions: '', qty: '' }],
          investigations: '', precautions: '', diet_restrictions: '', activities: '', advice: '', follow_up_days: '', duration_days: '7'
        });
        addToast(`Template "${newTemplateName}" saved successfully!`, 'success');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      addToast('Failed to save template', 'error');
    }
  }, [
    newTemplateName,
    newTemplateShortName,
    templateFormData,
    customTemplates,
    addToast
  ]);

  // Delete custom template
  const handleDeleteCustomTemplate = useCallback(async (templateId) => {
    try {
      await api.delete(`/api/prescription-templates/${templateId}`);
      setCustomTemplates(customTemplates.filter(t => t.id !== templateId));
      addToast('Template deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting template:', error);
      addToast('Failed to delete template', 'error');
    }
  }, [customTemplates, addToast]);

  // Clear form function
  const handleClearForm = useCallback(() => {
    setSymptoms([]);
    setDiagnoses([]);
    setMeds([]);
    setAdvice('');
    setFollowUp({ days: '', date: '', autoFill: false });
    setPatientNotes('');
    setPrivateNotes('');
    setProcedures([]);
    setVitals({ temp: '', height: '', bmi: '', weight: '', pulse: '', blood_pressure: '', spo2: '' });
  }, []);

  // ICD Search - debounced API call
  useEffect(() => {
    if (icdQuery.length < 1) {
      setIcdResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      try {
        // Search ICD based on selected version
        const response = await api.get('/api/icd/search', {
          params: { 
            q: icdQuery, 
            version: icdVersion, // 'icd10', 'icd11', 'icd11local', or 'all'
            limit: 20 
          }
        });

        const payload = response.data?.data || response.data;

        // Handle response formats:
        // - { success: true, data: { items: [...] } }
        // - { items: [...] }
        // - legacy: { results: [...] }
        if (payload?.items && Array.isArray(payload.items)) {
          setIcdResults(payload.items);
        } else if (payload?.results && Array.isArray(payload.results)) {
          setIcdResults(payload.results);
        } else if (Array.isArray(payload)) {
          setIcdResults(payload);
        } else {
          setIcdResults([]);
        }
      } catch (err) {
        console.error('ICD search error:', err);
        setIcdResults([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [icdQuery, icdVersion, api]);

  // Symptom Search - searches from snomed_clinical_findings + symptom_medication_mapping
  useEffect(() => {
    if (symptomInput.length < 1) {
      setSnomedSymptomResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      try {
        // Search from ALL symptom sources (snomed_clinical_findings + symptom_medication_mapping)
        const res = await api.get('/api/symptoms/search', {
          params: { q: symptomInput, limit: 25 }
        });
        const allResults = (res.data?.symptoms || []).map(s => ({
          pt: { term: s.symptom.charAt(0).toUpperCase() + s.symptom.slice(1) },
          fsn: { term: s.symptom },
          source: s.source || 'mapping',
          snomed_id: s.snomed_id,
          icd_code: s.icd_code
        }));

        setSnomedSymptomResults(allResults);
      } catch (err) {
        console.debug('Symptom search error:', err);
        setSnomedSymptomResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [symptomInput, api]);

  // ICD Diagnosis Search (ICD-10 + ICD-11 from local DB) - debounced
  useEffect(() => {
    if (diagnosisInput.length < 1) {
      setDiagnosisSearchResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      try {
        setDiagnosisLoading(true);
        const response = await api.get('/api/diagnoses/search', {
          params: { q: diagnosisInput, limit: 20 }
        });

        const results = response.data?.diagnoses || [];
        setDiagnosisSearchResults(Array.isArray(results) ? results.map(r => ({
          code: r.code || r.icd_code || r.icd11_code || '',
          diagnosis_name: r.diagnosis_name || r.primary_description || r.preferred_label || r.title || '',
          description: r.description || r.secondary_description || r.full_title || '',
          version: r.version === 'custom' ? 'Custom' : (r.version === 'icd11' ? 'ICD-11' : 'ICD-10'),
          isCustom: r.version === 'custom'
        })) : []);
      } catch (err) {
        console.debug('Diagnosis search error:', err);
        setDiagnosisSearchResults([]);
      } finally {
        setDiagnosisLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [diagnosisInput, api]);

  // SNOMED Diagnosis Search - debounced API call
  useEffect(() => {
    if (diagnosisInput.length < 1) {
      setSnomedDiagnosisResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      try {
        const response = await api.get('/api/snomed-local/search', {
          params: { q: diagnosisInput, limit: 10, offset: snomedDiagnosisPage * 10, semanticTag: 'disorder', mode: 'like' }
        });

        if (response.data?.items && Array.isArray(response.data.items)) {
          setSnomedDiagnosisResults(response.data.items);
        } else {
          setSnomedDiagnosisResults([]);
        }
      } catch (err) {
        console.debug('SNOMED diagnosis search error:', err);
        setSnomedDiagnosisResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [diagnosisInput, api, snomedDiagnosisPage]);

  // SNOMED Drug Search - debounced API call
  useEffect(() => {
    if (medInput.length < 1) {
      setSnomedDrugResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      try {
        const response = await api.get('/api/snomed-local/drugs', {
          params: { q: medInput, limit: 15, offset: snomedDrugPage * 15 }
        });

        if (response.data?.items && Array.isArray(response.data.items)) {
          setSnomedDrugResults(response.data.items);
        } else {
          setSnomedDrugResults([]);
        }
      } catch (err) {
        console.debug('SNOMED drug search error:', err);
        setSnomedDrugResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [medInput, api, snomedDrugPage]);

  // ========================================
  // Utility Functions
  // ========================================

  // Helper function to translate timing from any language to target language
  const translateTiming = (timingValue, targetLang) => {
    if (!timingValue) return timingValue;

    // Create reverse lookup: find which index this timing value corresponds to
    let foundIndex = -1;
    let sourceLang = null;

    // Check each language to find where this timing value exists
    Object.keys(timingOptions).forEach(lang => {
      const idx = timingOptions[lang]?.indexOf(timingValue);
      if (idx !== -1) {
        foundIndex = idx;
        sourceLang = lang;
      }
    });

    // If found, return the corresponding value in target language
    if (foundIndex !== -1 && timingOptions[targetLang]) {
      return timingOptions[targetLang][foundIndex] || timingValue;
    }

    return timingValue; // Return original if not found
  };

  // Helper function to translate instructions
  const translateInstruction = (instruction, targetLang) => {
    if (!instruction) return '';
    
    // Instruction translations dictionary
    const instructionTranslations = INSTRUCTION_TRANSLATIONS;

    if (!targetLang) return instruction;

    // 1. Exact match against English keys
    if (instructionTranslations[instruction] && instructionTranslations[instruction][targetLang]) {
      return instructionTranslations[instruction][targetLang];
    }

    // 2. Reverse lookup: if instruction is already in another language, find the English key and translate
    for (const [enKey, langs] of Object.entries(instructionTranslations)) {
      for (const [, text] of Object.entries(langs)) {
        if (text === instruction && instructionTranslations[enKey][targetLang]) {
          return instructionTranslations[enKey][targetLang];
        }
      }
    }

    // 3. Partial match - check all language values, find longest match
    const lowerInstr = instruction.toLowerCase();
    let bestMatch = null;
    let bestLen = 0;
    // Check English keys
    for (const key of Object.keys(instructionTranslations)) {
      if (lowerInstr.includes(key.toLowerCase()) && key.length > bestLen) {
        bestMatch = key;
        bestLen = key.length;
      }
    }
    // Also check non-English values for reverse partial match
    if (!bestMatch) {
      for (const [enKey, langs] of Object.entries(instructionTranslations)) {
        for (const [, text] of Object.entries(langs)) {
          if (text && lowerInstr.includes(text.toLowerCase()) && text.length > bestLen) {
            bestMatch = enKey;
            bestLen = text.length;
          }
        }
      }
    }
    if (bestMatch && instructionTranslations[bestMatch][targetLang]) {
      return instructionTranslations[bestMatch][targetLang];
    }

    return instruction;
  };

  // Translate a single advice line by matching it against predefinedAdvice in all languages
  const translateAdviceLine = (line, targetLang) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    // Search all languages for a match
    const langKeys = Object.keys(predefinedAdvice);
    for (const srcLang of langKeys) {
      const items = predefinedAdvice[srcLang];
      const idx = items.findIndex(item => item.toLowerCase() === trimmed.toLowerCase());
      if (idx !== -1) {
        const target = predefinedAdvice[targetLang] || predefinedAdvice.en;
        return target[idx] || line;
      }
    }
    return line; // no match found, keep as-is
  };

  // When language changes, translate all existing medication timings, instructions AND advice to the new language
  useEffect(() => {
    if (meds.length > 0) {
      setMeds(prev => prev.map(m => {
        const translatedTiming = translateTiming(m.timing, language);
        const translatedInstructions = translateInstruction(m.instructions, language);
        const updated = { ...m };
        if (translatedTiming && translatedTiming !== m.timing) updated.timing = translatedTiming;
        if (translatedInstructions && translatedInstructions !== m.instructions) updated.instructions = translatedInstructions;
        return updated;
      }));
    }
    // Translate advice text
    if (advice) {
      const lines = advice.split('\n');
      const translated = lines.map(line => translateAdviceLine(line, language));
      const newAdvice = translated.join('\n');
      if (newAdvice !== advice) setAdvice(newAdvice);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Parse frequency strings like '1-0-1', 'OD', 'BD', 'TDS', 'QID'
  const parseFrequency = (freq) => {
    if (!freq) return 0;
    const s = String(freq).toUpperCase().trim();
    if (/^\d+(-\d+)*$/.test(s)) {
      return s.split('-').map(x => parseInt(x || '0', 10)).reduce((a, b) => a + b, 0);
    }
    const map = { OD: 1, BD: 2, TDS: 3, TID: 3, QID: 4, HS: 1, STAT: 1, QHS: 1, QOD: 0.5 };
    return map[s] || 0;
  };

  const parseDurationDays = (dur) => {
    if (!dur) return 0;
    const m = String(dur).match(/(\d+)/);
    if (!m) return 0;
    return parseInt(m[1], 10) || 0;
  };

  const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateFollowUpDate = (days) => {
    if (!days) return '';
    const date = new Date();
    date.setDate(date.getDate() + parseInt(days));
    return date.toISOString().split('T')[0];
  };

  // ========================================
  // MyGenie Integration - Apply suggestion to current prescription
  // Accessible to other components (e.g., MyGenie widget) via window.applyMyGenieSuggestion
  const applyGenieSuggestion = (suggestion) => {
    if (!suggestion) return;

    try {
      // Symptoms
      if (Array.isArray(suggestion.symptoms) && suggestion.symptoms.length > 0) {
        const newSx = suggestion.symptoms.filter(s => !symptoms.includes(s));
        if (newSx.length) setSymptoms(prev => [...prev, ...newSx]);
      }

      // Diagnoses
      if (Array.isArray(suggestion.diagnoses) && suggestion.diagnoses.length > 0) {
        const newDx = suggestion.diagnoses.filter(d => !diagnoses.includes(d));
        if (newDx.length) setDiagnoses(prev => [...prev, ...newDx]);
      }

      // Medications - accept array of medication-like objects
      if (Array.isArray(suggestion.medications) && suggestion.medications.length > 0) {
        const toAdd = suggestion.medications.map(m => ({
          name: m.name || m.medication_name || m.brand || '',
          brand: m.brand || m.name || '',
          composition: m.composition || '',
          frequency: m.frequency || '1-0-1',
          timing: m.timing || (timingOptions[language] || timingOptions.en)[0],
          duration: m.duration || '7 days',
          instructions: m.instructions || '',
          qty: m.qty || m.quantity || 7
        }));

        setMeds(prev => {
          const existing = prev || [];
          const filtered = toAdd.filter(n => !existing.some(e => (e.name && n.name && e.name === n.name) || (e.brand && n.brand && e.brand === n.brand)));
          return [...existing, ...filtered];
        });
      }

      // Advice / Free text
      if (suggestion.advice && typeof suggestion.advice === 'string') {
        setAdvice(prev => (prev ? `${prev}\n${suggestion.advice}` : suggestion.advice));
      }

      // Patient / private notes — if note starts with "Investigations:", route to lab advice
      if (suggestion.note && typeof suggestion.note === 'string') {
        if (/^investigations?:/i.test(suggestion.note.trim())) {
          const labContent = suggestion.note.replace(/^investigations?:\s*/i, '').trim();
          setLabAdvice(prev => (prev ? `${prev}\n${labContent}` : labContent));
        } else {
          setPatientNotes(prev => (prev ? `${prev}\n${suggestion.note}` : suggestion.note));
        }
      }

      addToast('Applied MyGenie suggestion to the prescription', 'success');
    } catch (err) {
      console.error('Failed to apply MyGenie suggestion:', err);
      addToast('Could not apply MyGenie suggestion', 'error');
    }
  };

  useEffect(() => {
    // Expose a short-lived bridge for other components to apply suggestions
    try {
      window.applyMyGenieSuggestion = applyGenieSuggestion;
    } catch (e) {
      // ignore in non-browser environments
    }
    return () => {
      try {
        if (window.applyMyGenieSuggestion === applyGenieSuggestion) delete window.applyMyGenieSuggestion;
      } catch (e) {}
    };
  }, [symptoms, diagnoses, meds, language, advice]);

  // ========================================
  // Symptom Handlers
  // ========================================
  const addSymptom = async (s) => {
    if (!s) return;
    const symptomName = typeof s === 'object' ? s.name : s;
    const alreadyExists = symptoms.some(sym => (typeof sym === 'object' ? sym.name : sym) === symptomName);
    if (!alreadyExists) {
      setSymptoms((prev) => [...prev, { name: symptomName, remarks: '' }]);

      // Save custom symptom to DB for future suggestions
      try { api.post('/api/symptoms', { symptom_name: symptomName }); } catch (e) { /* ignore */ }

      // Auto-suggest diagnosis and medications based on symptom
      try {
        const response = await api.get(`/api/symptom-medications/suggestions?symptoms=${encodeURIComponent(s)}`);

        // Backend returns { diagnoses: [...], medications: [...], flatList: [...] }
        const dxFromApi = response.data?.diagnoses || response.data?.diagnosis || [];
        const medsFromApi = response.data?.flatList || response.data?.medications || [];

        // Auto-fill diagnosis if available
        if (Array.isArray(dxFromApi) && dxFromApi.length > 0) {
          const labels = dxFromApi
            .map(d => d?.diagnosis_name || d?.icd_code || d)
            .filter(Boolean);
          const newDiagnoses = labels.filter(d => !diagnoses.includes(d));
          if (newDiagnoses.length > 0) {
            setDiagnoses((prev) => [...prev, ...newDiagnoses]);
            addToast(`${newDiagnoses.length} diagnosis added for ${s}`, 'info');
          }
        }

        // Show medication suggestions in modal instead of auto-adding
        if (Array.isArray(medsFromApi) && medsFromApi.length > 0) {
          // Filter out medications that are already added AND remove duplicates from suggestions
          const uniqueMeds = [];
          const seenMeds = new Set();

          medsFromApi.forEach(med => {
            // Create a unique key for this medication
            const medKey = `${(med.name || '').toLowerCase().trim()}|${(med.brand || '').toLowerCase().trim()}|${(med.composition || '').toLowerCase().trim()}`;
            
            // Skip if already seen in suggestions or already added to prescription
            if (!seenMeds.has(medKey) && !meds.some(m => {
              const existingKey = `${(m.name || '').toLowerCase().trim()}|${(m.brand || '').toLowerCase().trim()}|${(m.composition || '').toLowerCase().trim()}`;
              return existingKey === medKey;
            })) {
              seenMeds.add(medKey);
              uniqueMeds.push(med);
            }
          });

          if (uniqueMeds.length > 0) {
            // Normalize keys expected by UI
            const normalized = uniqueMeds.map(m => ({
              name: m.name || m.medication_name,
              brand: m.brand || m.name || m.medication_name,
              composition: m.composition || '',
              dosage: m.dosage || m.strength || '',
              frequency: m.frequency || '1-0-1',
              duration: m.duration || '7 days',
              timing: m.timing,
              route: m.route,
              id: m.medicine_id || m.id
            }));

            // Store suggestions and show modal
            setPendingMedicationSuggestions(normalized);
            setShowMedicationSuggestionModal(true);
            addToast(`${normalized.length} medication(s) suggested for ${s}`, 'info');
          }
        }

        // New: also query diagnoses from symptoms (ICD suggestions)
        try {
          const respDx = await api.get('/api/diagnosis-suggestion/diagnoses/suggest-by-symptoms', {
            params: { symptoms: [...symptoms, s].join(',') }
          });
          if (Array.isArray(respDx.data?.data)) {
            const dxList = respDx.data.data.map(d => d.diagnosis_name || d.icd_code).filter(Boolean);
            const newDx = dxList.filter(d => !diagnoses.includes(d));
            if (newDx.length > 0) {
              setDiagnoses(prev => [...prev, ...newDx]);
              addToast(`${newDx.length} diagnosis suggested`, 'info');
            }
          }
        } catch (e2) {
          // ignore
        }
      } catch (error) {
        console.error('Error fetching medication suggestions:', error);
        // Silently fail - don't interrupt the doctor's workflow
      }
    }
    setSymptomInput('');
    setSymptomDropdown(false);
  };

  // Handle accepting medication suggestions
  const handleAcceptMedicationSuggestions = (selectedMeds) => {
    const defaultTiming = (timingOptions[language] || timingOptions.en)[0];
    
    selectedMeds.forEach(med => {
      const rawInstr = med.instructions || '';
      const medObj = {
        name: med.name,
        brand: med.brand || med.name,
        strength: med.strength || '',
        dosage_form: med.dosage_form || '',
        frequency: med.frequency || '1-0-1',
        timing: translateTiming(med.timing, language) || med.timing || defaultTiming,
        duration: med.duration || '7 days',
        instructions: translateInstruction(rawInstr, language) || rawInstr,
        qty: 7
      };
      setMeds((prev) => [...prev, medObj]);
    });

    setShowMedicationSuggestionModal(false);
    setPendingMedicationSuggestions([]);
    addToast(`${selectedMeds.length} medication(s) added`, 'success');
  };

  const removeSymptom = (idx) => {
    setSymptoms((prev) => prev.filter((_, i) => i !== idx));
  };

  const copySymptom = (s) => {
    navigator.clipboard.writeText(s);
    addToast('Copied to clipboard', 'success');
  };

  // Apply symptoms template
  const applySymptomTemplate = async (template) => {
    try {
      const templateSymptoms = Array.isArray(template.symptoms)
        ? template.symptoms
        : JSON.parse(template.symptoms || '[]');

      // Add template symptoms to existing symptoms (avoid duplicates)
      const newSymptoms = [...symptoms];
      const addedSymptoms = [];

      templateSymptoms.forEach(symptom => {
        if (!newSymptoms.includes(symptom)) {
          newSymptoms.push(symptom);
          addedSymptoms.push(symptom);
        }
      });

      setSymptoms(newSymptoms);
      setShowTemplateSelector(false);
      addToast(`Applied template: ${template.name}`, 'success');

      // Auto-suggest diagnosis and medications for all newly added symptoms
      if (addedSymptoms.length > 0) {
        try {
          const symptomsQuery = addedSymptoms.join(',');
          const response = await api.get(`/api/symptom-medications/suggestions?symptoms=${encodeURIComponent(symptomsQuery)}`);

          // Backend returns { diagnoses: [...], medications: [...], flatList: [...] }
          const dxFromApi = response.data?.diagnoses || response.data?.diagnosis || [];
          const medsFromApi = response.data?.flatList || response.data?.medications || [];

          // Auto-fill diagnosis if available
          if (Array.isArray(dxFromApi) && dxFromApi.length > 0) {
            const labels = dxFromApi
              .map(d => d?.diagnosis_name || d?.icd_code || d)
              .filter(Boolean);
            const newDiagnoses = labels.filter(d => !diagnoses.includes(d));
            if (newDiagnoses.length > 0) {
              setDiagnoses((prev) => [...prev, ...newDiagnoses]);
              addToast(`${newDiagnoses.length} diagnosis suggested`, 'info');
            }
          }

          // Auto-fill medications if available
          if (Array.isArray(medsFromApi) && medsFromApi.length > 0) {
            addToast(`${medsFromApi.length} medication(s) suggested`, 'info');

            // Auto-add top 2 medications for each symptom
            const topSuggestions = medsFromApi.slice(0, 4); // Max 4 total
            topSuggestions.forEach(med => {
              const alreadyExists = meds.some(m =>
                m.name === med.name || m.brand === med.brand
              );

              if (!alreadyExists) {
                const defaultTiming = (timingOptions[language] || timingOptions.en)[0];
                const medObj = {
                  name: med.name,
                  brand: med.brand || med.name,
                  composition: med.composition || '',
                  frequency: med.frequency || '1-0-1',
                  timing: med.timing || defaultTiming,
                  duration: med.duration || '7 days',
                  instructions: '',
                  qty: 7
                };
                setMeds((prev) => [...prev, medObj]);
              }
            });
          }
        } catch (error) {
          console.error('Error fetching medication suggestions:', error);
          // Silently fail
        }
      }
    } catch (error) {
      console.error('Error applying template:', error);
      addToast('Failed to apply template', 'error');
    }
  };

  // ========================================
  // Diagnosis Handlers
  // ========================================
  const addDiagnosis = (d) => {
    if (!d) return;
    if (!diagnoses.includes(d)) {
      setDiagnoses((prev) => [...prev, d]);
      // Save custom diagnosis to DB for future suggestions
      try { api.post('/api/diagnoses', { diagnosis_name: d }); } catch (e) { /* ignore */ }
    }
    setDiagnosisInput('');
    setDiagnosisDropdown(false);
  };

  const removeDiagnosis = (idx) => {
    setDiagnoses((prev) => prev.filter((_, i) => i !== idx));
  };

  const copyDiagnosis = (d) => {
    navigator.clipboard.writeText(d);
    addToast('Copied to clipboard', 'success');
  };

  // Apply diagnosis template
  const applyDiagnosisTemplate = (template) => {
    try {
      const templateDiagnoses = Array.isArray(template.diagnoses)
        ? template.diagnoses
        : JSON.parse(template.diagnoses || '[]');

      // Add template diagnoses to existing diagnoses (avoid duplicates)
      const newDiagnoses = [...diagnoses];
      templateDiagnoses.forEach(diagnosis => {
        if (!newDiagnoses.includes(diagnosis)) {
          newDiagnoses.push(diagnosis);
        }
      });

      setDiagnoses(newDiagnoses);
      setShowDiagnosisTemplateSelector(false);
      addToast(`Applied template: ${template.name}`, 'success');
    } catch (error) {
      console.error('Error applying diagnosis template:', error);
      addToast('Failed to apply template', 'error');
    }
  };

  // Handle ICD code selection - fetch related symptoms, diagnoses, and medications
  const handleIcdSelect = async (icdCode, icdTitle) => {
    try {
      // Fetch related data for this ICD code
      const response = await api.get(`/api/icd/${icdCode}/related`, {
        params: { limit: 20 }
      });

      const relatedData = response.data?.data || response.data || {};

      // Add related symptoms
      if (relatedData.symptoms && Array.isArray(relatedData.symptoms)) {
        const newSymptoms = relatedData.symptoms.filter(s => !symptoms.includes(s));
        if (newSymptoms.length > 0) {
          setSymptoms(prev => [...prev, ...newSymptoms]);
          addToast(`${newSymptoms.length} symptom(s) added for ${icdCode}`, 'info');
        }
      }

      // Add related diagnoses
      if (relatedData.diagnoses && Array.isArray(relatedData.diagnoses)) {
        const newDiagnoses = relatedData.diagnoses.filter(d => !diagnoses.includes(d));
        if (newDiagnoses.length > 0) {
          setDiagnoses(prev => [...prev, ...newDiagnoses]);
          addToast(`${newDiagnoses.length} diagnosis/diagnoses added for ${icdCode}`, 'info');
        }
      }

      // Add related medications
      if (relatedData.medications && Array.isArray(relatedData.medications)) {
        const uniqueMeds = [];
        const seenMeds = new Set();

        relatedData.medications.forEach(med => {
          const medKey = `${(med.name || '').toLowerCase().trim()}|${(med.brand || '').toLowerCase().trim()}|${(med.composition || '').toLowerCase().trim()}`;
          
          if (!seenMeds.has(medKey) && !meds.some(m => {
            const existingKey = `${(m.name || '').toLowerCase().trim()}|${(m.brand || '').toLowerCase().trim()}|${(m.composition || '').toLowerCase().trim()}`;
            return existingKey === medKey;
          })) {
            seenMeds.add(medKey);
            uniqueMeds.push(med);
          }
        });

        if (uniqueMeds.length > 0) {
          setPendingMedicationSuggestions(uniqueMeds);
          setShowMedicationSuggestionModal(true);
          addToast(`${uniqueMeds.length} medication(s) suggested for ${icdCode}`, 'info');
        }
      }
    } catch (error) {
      console.error('Error fetching ICD related data:', error);
      // Silently fail - ICD selection still works even if related data fetch fails
    }
  };

  // ========================================
  // Medication Handlers
  // ========================================
  const addEmptyMed = () => {
    const defaultTiming = (timingOptions[language] || timingOptions.en)[0];
    const medObj = {
      name: '',
      brand: '',
      composition: '',
      frequency: '',
      timing: defaultTiming,
      duration: '',
      instructions: '',
      qty: 7
    };
    setMeds(prev => [...prev, medObj]);
  };

  const addMed = async (med) => {
    if (!med) return;
    const defaultTiming = (timingOptions[language] || timingOptions.en)[0];

    const baseMed = typeof med === 'string'
      ? { name: med, brand: med, composition: '' }
      : { ...med };

    // Try to fetch dosage defaults
    let dosage = '';
    let frequency = baseMed.recommended_frequency || '1-0-1';
    let duration = baseMed.recommended_duration || '7 days';
    let route = '';
    let qty = 7;

    // If med already has dosage data from dosage_references (via search)
    if (baseMed.standard_dosage) {
      dosage = baseMed.standard_dosage;
      frequency = baseMed.recommended_frequency || frequency;
      duration = baseMed.recommended_duration || duration;
    }

    // Try to fetch dosage from dosage_references by medicine name
    // Use brand name first (what user sees/clicks), fallback to generic name
    const medName = baseMed.brand || baseMed.name || baseMed.medication_name || '';
    try {
      if (medName) {
        const resp = await api.get('/api/medicines/dosage', {
          params: { name: medName }
        });
        const dosageInfo = resp.data?.dosage;
        if (dosageInfo) {
          dosage = dosageInfo.standard_dosage || dosage;
          frequency = dosageInfo.recommended_frequency || frequency;
          duration = dosageInfo.recommended_duration || duration;
          route = dosageInfo.route_of_administration || route;
        }
      }
    } catch (e) {
      // Fallback: try medicine defaults by id
      try {
        if (baseMed.id) {
          const resp = await api.get(`/api/medicines/${baseMed.id}/defaults`);
          const defs = resp.data?.defaults || {};
          dosage = defs.dosage || dosage;
          frequency = defs.frequency || frequency;
          duration = defs.duration || duration;
          route = defs.route || route;
        }
      } catch (e2) {
        // ignore
      }
    }

    // Try to fetch doctor's custom defaults (highest priority - overrides system defaults)
    let customTiming = '';
    let customInstructions = '';
    try {
      if (medName) {
        const resp = await api.get('/api/medicines/my-defaults', { params: { name: medName } });
        const defs = resp.data?.defaults;
        if (defs) {
          dosage = defs.dosage || dosage;
          frequency = defs.frequency || frequency;
          duration = defs.duration || duration;
          customTiming = defs.timing || '';
          customInstructions = defs.instructions || '';
          if (defs.quantity) qty = defs.quantity;
        }
      }
    } catch (e) { /* ignore */ }

    // Estimate quantity
    const perDay = parseFrequency(frequency);
    const days = parseDurationDays(duration);
    if (perDay && days) qty = perDay * days;

    // Determine timing and instructions, then translate if non-English language
    let finalTiming = customTiming || baseMed.timing || defaultTiming;
    let finalInstructions = customInstructions || baseMed.instructions || '';
    if (language && language !== 'en') {
      const translatedT = translateTiming(finalTiming, language);
      if (translatedT) finalTiming = translatedT;
      const translatedI = translateInstruction(finalInstructions, language);
      if (translatedI) finalInstructions = translatedI;
    }

    const medObj = {
      name: medName,
      brand: baseMed.brand || '',
      generic_name: baseMed.name || baseMed.generic_name || baseMed.composition || '',
      composition: baseMed.composition || baseMed.generic_name || '',
      strength: baseMed.strength || '',
      frequency,
      timing: finalTiming,
      duration,
      instructions: finalInstructions,
      qty
    };

    setMeds((prev) => [...prev, medObj]);
    setMedInput('');
    setMedDropdown(false);

    // Save custom medicine to database if it was typed manually (not from search)
    if (typeof med === 'string') {
      try {
        await api.post('/api/medicines', { name: med, brand: med, is_active: 1 });
      } catch (e) {
        // Ignore if already exists or fails
      }
    }
  };

  // Add medicine with tapering enabled
  const addTaperMed = async (med) => {
    const defaultTiming = (timingOptions[language] || timingOptions.en)[0];
    const baseMed = typeof med === 'string' ? { name: med, brand: med } : { ...med };
    const medName = baseMed.brand || baseMed.name || '';
    let frequency = '1-0-0';
    let duration = '15 days';
    let dosage = '';
    try {
      if (medName) {
        const resp = await api.get('/api/medicines/dosage', { params: { name: medName } });
        const d = resp.data?.dosage;
        if (d) { dosage = d.standard_dosage || ''; frequency = d.recommended_frequency || frequency; duration = d.recommended_duration || duration; }
      }
    } catch (e) { /* ignore */ }
    setMeds(prev => [...prev, {
      name: medName,
      brand: baseMed.brand || '',
      generic_name: baseMed.name || baseMed.generic_name || baseMed.composition || '',
      composition: baseMed.composition || baseMed.generic_name || '',
      strength: baseMed.strength || '',
      frequency, timing: defaultTiming, duration,
      instructions: '', qty: '',
      is_tapering: true,
      tapering_schedule: [
        { step_number: 1, dose: dosage || '10 mg', frequency: 'Once daily', duration_days: 5 },
        { step_number: 2, dose: '5 mg', frequency: 'Once daily', duration_days: 5 },
        { step_number: 3, dose: '2.5 mg', frequency: 'Once daily', duration_days: 5 }
      ]
    }]);
    setShowTaperInput(false);
    setTaperMedInput('');
    setTaperMedResults([]);
  };

  // Search medicines for tapering input
  const searchTaperMeds = useCallback(async (query) => {
    if (!query || query.length < 2) { setTaperMedResults([]); return; }
    setTaperMedLoading(true);
    try {
      const resp = await api.get('/api/medicines/search', { params: { q: query, limit: 15 } });
      setTaperMedResults(resp.data?.medicines || resp.data?.results || resp.data || []);
    } catch (e) { setTaperMedResults([]); }
    setTaperMedLoading(false);
  }, []);

  const removeMed = (idx) => {
    setMeds((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateMed = (idx, field, value) => {
    setMeds((prev) => {
      const updated = [...prev];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return updated;
    });
  };

  // Search medications from database (replaces hardcoded list)
  const searchMedications = useCallback(async (query) => {
    if (!query || query.length < 1) {
      setMedicationSuggestions([]);
      return;
    }

    try {
      setMedicationLoading(true);
      const response = await api.get('/api/medicines/search', {
        params: { q: query, limit: 20 }
      });

      // Handle response format: { medicines: [...] }
      const meds = response.data.medicines || response.data.medications || response.data.items || [];
      setMedicationSuggestions(Array.isArray(meds) ? meds.map(m => ({
        id: m.id,
        name: m.name || m.medication_name || '',
        brand: m.brand || m.name || '',
        composition: m.generic_name || m.active_ingredient || '',
        strength: m.strength || '',
        dosage_form: m.dosage_form || '',
        source: m.source || 'local',
        standard_dosage: m.standard_dosage,
        recommended_frequency: m.recommended_frequency,
        recommended_duration: m.recommended_duration,
        available: true
      })) : []);
    } catch (err) {
      console.error('Medication search error:', err);
      setMedicationSuggestions([]);
    } finally {
      setMedicationLoading(false);
    }
  }, [api]);

  // Fetch frequently prescribed medications for this patient
  const fetchFrequentlyPrescribedMeds = useCallback(async () => {
    if (!patientId) return;

    try {
      const response = await api.get(`/api/medicines/patient/${patientId}/recent`, {
        params: { limit: 10 }
      });

      const meds = response.data.medications || response.data.items || response.data || [];
      setFrequentlyPrescribedMeds(Array.isArray(meds) ? meds : []);
    } catch (err) {
      console.error('Failed to fetch frequently prescribed medications:', err);
      setFrequentlyPrescribedMeds([]);
    }
  }, [api, patientId]);

  // Load frequently prescribed meds when patient loads
  useEffect(() => {
    if (patientId) {
      fetchFrequentlyPrescribedMeds();
    }
  }, [patientId, fetchFrequentlyPrescribedMeds]);

  // Search medications with debounce
  useEffect(() => {
    if (medInput.length < 1) {
      setMedicationSuggestions([]);
      return;
    }

    const debounceTimer = setTimeout(() => {
      searchMedications(medInput);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [medInput, searchMedications]);

  // Apply medications template
  const applyMedicationsTemplate = (template) => {
    try {
      const templateMeds = Array.isArray(template.medications)
        ? template.medications
        : JSON.parse(template.medications || '[]');

      // Add template medications to existing medications (avoid duplicates)
      templateMeds.forEach(med => {
        const alreadyExists = meds.some(m =>
          m.name === med.name || m.brand === med.brand
        );

        if (!alreadyExists) {
          const defaultTiming = (timingOptions[language] || timingOptions.en)[0];
          const medObj = {
            name: med.name || med.medication_name || '',
            brand: med.brand || med.brand_name || med.name || '',
            composition: med.composition || '',
            frequency: med.frequency || '1-0-1',
            timing: med.timing || defaultTiming,
            duration: med.duration || '7 days',
            instructions: med.instructions || '',
            qty: med.qty || med.quantity || 7
          };
          setMeds((prev) => [...prev, medObj]);
        }
      });

      setShowMedicationsTemplateSelector(false);
      addToast(`Applied template: ${template.name}`, 'success');
    } catch (error) {
      console.error('Error applying medications template:', error);
      addToast('Failed to apply template', 'error');
    }
  };

  // ========================================
  // Advice Handlers
  // ========================================
  const toggleAdvice = (adv) => {
    setSelectedAdvice((prev) =>
      prev.includes(adv) ? prev.filter(a => a !== adv) : [...prev, adv]
    );
  };

  const addCustomAdvice = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const updated = [...customAdviceItems, trimmed];
    setCustomAdviceItems(updated);
    localStorage.setItem('custom_advice_items', JSON.stringify(updated));
    setNewAdviceInput('');
  };

  const deleteCustomAdvice = (index) => {
    const updated = customAdviceItems.filter((_, i) => i !== index);
    setCustomAdviceItems(updated);
    localStorage.setItem('custom_advice_items', JSON.stringify(updated));
  };

  const formatAdvice = (command) => {
    const editor = adviceEditorRef.current;
    if (!editor) return;
    document.execCommand(command, false, null);
    editor.focus();
  };

  // ========================================
  // Follow-up Handler
  // ========================================
  const handleFollowUpDaysChange = (days) => {
    const daysStr = (typeof days === 'string' ? days : String(days || ''));
    setFollowUp({
      ...followUp,
      days: daysStr,
      date: daysStr ? calculateFollowUpDate(daysStr) : ''
    });
  };

  // ========================================
  // Specialty Module Handlers
  // ========================================
  const handleSpecialtyDataChange = (data) => {
    setSpecialtyData(data);
    // console.log('Specialty data updated:', data);
  };

  // ========================================
  // Repeat Prescription Handler
  // ========================================
  const handleRepeatSuccess = (prescriptionData) => {
    // Populate form with repeated prescription data
    if (prescriptionData.prescription) {
      const rx = prescriptionData.prescription;

      // Set symptoms
      if (rx.medication_name) {
        setSymptoms([rx.medication_name]);
      }

      // Set medications
      if (rx.medications && Array.isArray(rx.medications)) {
        setMeds(rx.medications.map(med => ({
          name: med.medication_name || med.name,
          medication_name: med.medication_name || med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instructions: translateInstruction(med.instructions, language) || med.instructions,
          timing: translateTiming(med.timing, language) || med.timing,
          is_tapering: med.is_tapering || 0,
          tapering_schedule: med.tapering_schedule || []
        })));
      }

      // Set advice
      if (rx.instructions) {
        setAdvice(rx.instructions);
      }

      // Set vitals if available
      if (rx.vitals) {
        setVitals(rx.vitals);
      }

      addToast('Last prescription loaded successfully! Review and modify as needed.', 'success');
    }
  };

  // ========================================
  // Save Prescription
  // ========================================
  const handleSave = async () => {
    // Prevent concurrent saves from rapid button clicks
    if (savingInProgress.current) return;
    savingInProgress.current = true;

    // Validation
    if (!meta.patient_id) {
      savingInProgress.current = false;
      addToast('Patient ID is required', 'error');
      return;
    }

    // Validate patient_id is a valid number
    const parsedPatientId = parseInt(meta.patient_id);
    if (isNaN(parsedPatientId)) {
      addToast('Invalid patient ID. Please select a patient from the queue or patients list.', 'error');
      return;
    }

    if (!meds.length) {
      addToast('At least one medicine is required', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // Get doctor_id - with fallback
      let doctorId = meta.doctor_id;

      if (!doctorId) {
        try {
          const docRes = await api.get('/api/doctors');
          if (docRes.data.doctors && docRes.data.doctors.length > 0) {
            doctorId = docRes.data.doctors[0].id;
            setMeta(prev => ({ ...prev, doctor_id: doctorId }));
          }
        } catch (err) {
          console.error('Failed to get doctor:', err);
        }
      }

      // Prepare medications data
      const medicationsData = meds.map(m => ({
        medication_name: m.name || m.medication_name || m.medicine_name || m.brand || '',
        brand_name: m.brand || m.name || '',
        dosage: m.dosage || '',
        frequency: m.is_tapering ? 'Tapering' : (m.frequency || ''),
        duration: m.duration || '',
        instructions: m.instructions || '',
        timing: m.timing || '',
        quantity: m.qty || 0,
        is_tapering: m.is_tapering ? 1 : 0,
        tapering_schedule: m.is_tapering && m.tapering_schedule ? m.tapering_schedule.map((s, i) => ({
          step_number: i + 1,
          dose: s.dose || '',
          frequency: s.frequency || '',
          duration_days: parseInt(s.duration_days, 10) || 1
        })) : []
      }));

      // Prepare request body
      const requestBody = {
        patient_id: parsedPatientId,
        doctor_id: doctorId || null,  // Backend will handle fallback
        appointment_id: meta.appointment_id ? parseInt(meta.appointment_id) : null,
        template_id: selectedTemplateId || null,  // Letterhead template
        medications: medicationsData,
        symptoms: symptoms.map(s => typeof s === 'object' ? (s.remarks ? `${s.name} - ${s.remarks}` : s.name) : s),
        diagnosis: diagnoses,
        vitals: {
          temp: vitals.temp || null,
          height: vitals.height || null,
          weight: vitals.weight || null,
          pulse: vitals.pulse || null,
          bmi: vitals.bmi || null,
          blood_pressure: vitals.blood_pressure || null,
          spo2: vitals.spo2 || null
        },
        advice: advice + (selectedAdvice.length > 0 ? '\n' + selectedAdvice.join('\n') : ''),
        follow_up_days: followUp.days ? parseInt(followUp.days) : null,
        follow_up_date: followUp.date || null,
        patient_notes: patientNotes || '',
        private_notes: privateNotes || '',
        lab_advice: labAdvice || '',
        lab_remarks: labRemarks || '',
        examination_findings: {
          general: generalExamination || '',
          systemic: systemicExamination || ''
        }
      };

      // console.log('Saving prescription:', requestBody);

      const response = await api.post('/api/prescriptions', requestBody);
      
      // console.log('Prescription saved:', response.data);
      addToast('Prescription saved successfully', 'success');

      // Save vitals to patient's vitals record
      try {
        if (vitals.temp || vitals.height || vitals.weight || vitals.pulse || vitals.blood_pressure || vitals.spo2) {
          await api.post(`/api/patient-data/vitals/${parsedPatientId}`, {
            temperature: vitals.temp || null,
            height: vitals.height || null,
            weight: vitals.weight || null,
            pulse: vitals.pulse || null,
            blood_pressure: vitals.blood_pressure || null,
            spo2: vitals.spo2 || null
          });
          // console.log('Vitals saved to patient record');
        }
      } catch (vitalErr) {
        console.warn('Could not save vitals to patient record:', vitalErr);
        // Don't fail the prescription save if vitals save fails
      }

      // Save lab results to patient's lab record for bidirectional sync
      try {
        if (labResultEntries.length > 0) {
          for (const lab of labResultEntries) {
            // Skip entries already saved to DB (have an id) to avoid duplicates
            if (lab.id) continue;
            if (lab.result_value && lab.test_name) {
              await api.post(`/api/labs/${parsedPatientId}`, {
                test_name: lab.test_name,
                result_value: lab.result_value,
                result_unit: lab.result_unit || '',
                reference_range: lab.reference_range || '',
                test_category: lab.category || 'GENERAL',
                result_date: lab.date || new Date().toISOString().split('T')[0],
                report_group: 'Prescription'
              });
            }
          }
          // console.log('Lab results synced to patient overview:', labResultEntries.length);
          // Trigger refresh in PatientOverview by emitting a custom event
          window.dispatchEvent(new CustomEvent('patientDataRefresh', { detail: { patientId: parsedPatientId } }));
        }
      } catch (labErr) {
        console.warn('Could not sync lab results to patient record:', labErr);
        // Don't fail the prescription save if lab sync fails
      }

      // Store prescription ID for PDF download
      if (response.data?.id) {
        setCurrentPrescriptionId(response.data.id);
      }

      // Save ICD diagnoses if selected
      try {
        if (response.data?.id && selectedIcds.length > 0) {
          await api.post(`/api/prescriptions/detail/${response.data.id}/diagnoses`, selectedIcds);
          addToast('Diagnoses (ICD) saved', 'success');
        }
      } catch (e) {
        console.error('Failed to save ICD diagnoses:', e);
        addToast('Prescription saved, but ICD diagnoses could not be saved', 'warning');
      }

      // Save medicine defaults for future suggestions (fire-and-forget)
      try {
        for (const m of meds) {
          api.post('/api/medicines/defaults', {
            medicine_name: m.name || m.brand,
            dosage: m.dosage || null,
            frequency: m.frequency || null,
            duration: m.duration || null,
            timing: m.timing || null,
            instructions: m.instructions || null,
            quantity: m.qty || null
          }).catch(() => {});
        }
      } catch (e) { /* ignore */ }

      return response.data;
    } catch (error) {
      console.error('Save error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Failed to save prescription';
      addToast(errorMsg, 'error');
      throw error;
    } finally {
      setIsLoading(false);
      savingInProgress.current = false;
    }
  };

  // ========================================
  // Finish Visit
  // ========================================
  const handleFinish = async () => {
    try {
      // Step 1: Save the prescription
      await handleSave();

      // Step 2: Mark appointment as completed if appointment_id exists
      // Track whether the appointment was valid (so billing doesn't use a bad FK)
      let validAppointmentId = meta.appointment_id || null;
      if (meta.appointment_id) {
        try {
          await api.patch(`/api/appointments/${meta.appointment_id}/status`, {
            status: 'completed'
          });
          addToast('Appointment marked as completed', 'success');
        } catch (error) {
          if (error.response?.status === 404) {
            // Appointment doesn't exist — don't pass it to billing
            validAppointmentId = null;
          }
          console.error('Error marking appointment as completed:', error);
          addToast('Prescription saved but could not mark appointment as completed', 'warning');
        }
      }

      addToast('Prescription completed and visit ended', 'success');

      // Hand off to billing / receipt creation
      if (meta.patient_id && validAppointmentId) {
        navigate(`/receipts?patient=${meta.patient_id}&appointment=${validAppointmentId}&quick=true`);
      } else if (meta.patient_id) {
        navigate(`/receipts?patient=${meta.patient_id}&quick=true`);
      } else {
        navigate('/queue');
      }
    } catch (error) {
      console.error('Finish error:', error);
      // Error already shown in handleSave
    }
  };

  // ========================================
  // Clear Form
  // ========================================
  const handleClear = () => {
    setSymptoms([]);
    setDiagnoses([]);
    setMeds([]);
    setAdvice('');
    setPatientNotes('');
    setPrivateNotes('');
    setVitals({ temp: '', height: '', bmi: '', weight: '', pulse: '', blood_pressure: '', spo2: '' });
    setFollowUp({ days: '', date: '', autoFill: false });
    setSelectedAdvice([]);
    addToast('Prescription cleared', 'info');
  };

  // ========================================
  // Filtered Lists
  // ========================================
  // Note: filteredSymptoms is already defined above in component scope
  
  const filteredDiagnoses = diagnosisInput.length > 0
    ? diagnosisSuggestions.filter(d => 
        d.toLowerCase().startsWith(diagnosisInput.toLowerCase())
      )
    : diagnosisSuggestions.slice(0, 4);

  const combinedDiagnosisResults = (() => {
    const out = [];

    // 1) Backend results (Custom diagnoses first, then ICD-10 + ICD-11)
    for (const r of diagnosisSearchResults) {
      const label = r.diagnosis_name || r.code;
      if (!label) continue;
      out.push({ type: r.isCustom ? 'custom' : 'icd', label, code: r.code, description: r.description, version: r.version });
    }

    // 2) Quick suggestions (only if no ICD results or no input)
    if (out.length === 0) {
      for (const d of filteredDiagnoses) {
        out.push({ type: 'quick', label: d });
      }
    }

    // De-dup by label
    const seen = new Set();
    return out.filter(x => {
      const k = (x.label || '').toLowerCase().trim();
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  })();

  const filteredMeds = medInput.length > 0
    ? medicationSuggestions.filter(m =>
        (m.name || '').toLowerCase().includes(medInput.toLowerCase()) ||
        (m.brand || '').toLowerCase().includes(medInput.toLowerCase()) ||
        (m.composition || '').toLowerCase().includes(medInput.toLowerCase())
      )
    : medicationSuggestions.slice(0, 10);

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="space-y-4">
      {/* No Patient Selected - Show Search */}
      {!patient && !patientId && (
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Select a Patient</h3>

          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search by name, UHID, or phone number..."
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              value={patientSearch}
              onChange={(e) => {
                setPatientSearch(e.target.value);
                searchPatients(e.target.value);
                setShowPatientSearch(true);
              }}
              onFocus={() => setShowPatientSearch(true)}
            />

            {/* Search Results Dropdown */}
            {showPatientSearch && patientResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto">
                {patientResults.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => handlePatientSelect(p)}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-600">
                      UHID: {p.patient_id} • {p.phone} • {p.gender}, {calculateAge(p.dob)} years
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-center text-gray-600">
            <p className="mb-2">Or select from:</p>
            <div className="flex gap-3 justify-center">
              <Link to="/queue" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">
                View Queue
              </Link>
              <Link to="/patients" className="px-4 py-2 border border-primary text-primary rounded hover:bg-primary/10">
                All Patients
              </Link>
            </div>
            </div>
            </div>
            )}

      {/* Patient Info Header */}
      {patient && (
        <div className="bg-white border rounded shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{patient.name}</h2>
                  <select className="text-sm border rounded px-2 py-1">
                    <option>{patient.name}</option>
                  </select>
                </div>
                <p className="text-sm text-slate-600">
                  {calculateAge(patient.dob)} years, {patient.gender || ''} • UHID: {patient.patient_id || ''} • {patient.phone || ''}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                  <span>📅 {new Date(meta.prescription_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span>🕐 {meta.prescription_time}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="p-2 border rounded hover:bg-slate-50 transition active:scale-[0.98]" title="Edit" onClick={() => {}}>
                <FiEdit3 />
              </button>
              <button type="button" className="p-2 border rounded hover:bg-slate-50 transition active:scale-[0.98]" title="Video Call" onClick={() => {}}>
                <FiVideo />
              </button>
              <button type="button" className="p-2 border rounded hover:bg-slate-50 transition active:scale-[0.98]" title="Link" onClick={() => {}}>
                <FiLink2 />
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b">
            <button
              type="button"
              onClick={() => navigate(`/patient-overview/${patientId}`)}
              className="px-4 py-2 text-sm border-b-2 border-transparent hover:border-primary transition active:scale-[0.98]"
            >
              Patient Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('prescription')}
              className={`px-4 py-2 text-sm border-b-2 transition active:scale-[0.98] ${
                activeTab === 'prescription' ? 'border-primary text-primary' : 'border-transparent'
              }`}
            >
              Prescription Pad
            </button>
            <button
              type="button"
              onClick={() => navigate('/rx-template')}
              className="px-4 py-2 text-sm border-b-2 border-transparent hover:border-primary transition active:scale-[0.98]"
            >
              Templates
            </button>
            <button
              type="button"
              onClick={() => navigate('/pad-configuration')}
              className="px-4 py-2 text-sm border-b-2 border-transparent hover:border-primary transition active:scale-[0.98]"
            >
              Configure your pad
            </button>
          </div>
        </div>
      )}

      {/* PHASE 1: Quick Templates Bar */}
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              <span className="text-lg">🚀</span>
              Quick Templates
            </h3>
            <button
              onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
              className="text-xs bg-blue-200 hover:bg-blue-300 text-blue-900 px-2 py-1 rounded transition"
              title="Show keyboard shortcuts"
            >
              ⌨️ Ctrl+T
            </button>
          </div>
        </div>

        {/* Keyboard Help */}
        {showKeyboardHelp && (
          <div className="mb-3 p-3 bg-white rounded border border-blue-300 text-sm">
            <div className="font-semibold mb-2 text-gray-900">Keyboard Shortcuts:</div>
            <div className="grid grid-cols-2 gap-2">
              <div><kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Ctrl+T</kbd> Template</div>
              <div><kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Ctrl+S</kbd> Save</div>
              <div><kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Ctrl+P</kbd> Print</div>
              <div><kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Ctrl+M</kbd> Medicine</div>
              <div><kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Ctrl+L</kbd> Lab</div>
              <div><kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Ctrl+Shift+C</kbd> Clear</div>
            </div>
          </div>
        )}

        {/* Template Buttons */}
        <div className="flex flex-wrap gap-3">
          {Object.keys(quickTemplates).map(templateName => {
            const template = quickTemplates[templateName];
            const medCount = template.medications ? template.medications.length : 0;
            const getIcon = (name) => {
              const icons = {
                'URTI': '🤒',
                'Migraine': '🤕',
                'Gastritis': '🤢',
                'Hypertension': '💓',
                'Diabetes': '🩺',
                'Fever': '🌡️',
                'Anxiety': '😰',
                'Allergy': '🤧',
                'Cough': '🤐'
              };
              return icons[name] || '💊';
            };
            
            return (
              <button
                key={templateName}
                onClick={() => handleApplyTemplate(templateName)}
                className="px-4 py-3 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition transform hover:scale-110 hover:shadow-lg shadow-md text-sm flex flex-col items-center gap-1"
                title={`Apply ${template.name} template - ${medCount} medicines (fills form automatically)`}
              >
                <span className="text-xl">{getIcon(templateName)}</span>
                <span>{templateName}</span>
                <span className="text-xs opacity-85">{medCount} meds</span>
              </button>
            );
          })}

          {/* Custom Templates */}
          {customTemplates.length > 0 && (
            <>
              <div className="w-full h-0.5 bg-gray-300 my-2"></div>
              {customTemplates.map(template => {
                const medications = typeof template.medications === 'string' ? 
                  JSON.parse(template.medications) : template.medications || [];
                const medCount = medications.length;
                
                return (
                  <div key={template.id} className="relative group">
                    <button
                      onClick={() => handleApplyTemplate(template.template_name)}
                      className="px-4 py-3 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition transform hover:scale-110 hover:shadow-lg shadow-md text-sm flex flex-col items-center gap-1"
                      title={`Apply "${template.template_name}" custom template`}
                    >
                      <span className="text-xl">⭐</span>
                      <span className="text-xs line-clamp-1">{template.category || template.template_name}</span>
                      <span className="text-xs opacity-85">{medCount} meds</span>
                    </button>
                    {/* Delete button on hover */}
                    <button
                      onClick={() => handleDeleteCustomTemplate(template.id)}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                      title="Delete custom template"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </>
          )}

          {/* Create New Template Button */}
          <button
            onClick={() => setShowCreateTemplateModal(true)}
            className="px-4 py-3 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg font-semibold transition transform hover:scale-110 hover:shadow-lg shadow-md text-sm flex flex-col items-center gap-1"
            title="Save current prescription as custom template"
          >
            <span className="text-xl">➕</span>
            <span>Create</span>
            <span className="text-xs opacity-85">Template</span>
          </button>
        </div>

        {/* Template Info */}
        <div className="mt-3 text-xs text-gray-600 bg-white p-3 rounded border border-blue-200">
          <span className="font-semibold">💡 Pro Tip:</span> Click any button → Entire prescription fills in 1 second with pre-defined medicines, advice, and investigations! Create custom templates from your current prescription.
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="p-3 border-b flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-gray-800">Create New Template</h2>
              <button
                onClick={() => {
                  setShowCreateTemplateModal(false);
                  setNewTemplateName('');
                  setNewTemplateShortName('');
                  setTemplateFormData({
                    symptoms: '', diagnoses: '',
                    medications: [{ name: '', brand: '', composition: '', frequency: '', timing: 'After Meal', duration: '', instructions: '', qty: '' }],
                    investigations: '', precautions: '', diet_restrictions: '', activities: '', advice: '', follow_up_days: '', duration_days: '7'
                  });
                }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-3 space-y-3 overflow-y-auto flex-1">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Template Name *</label>
                  <input type="text" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Asthma Management" className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Short Name *</label>
                  <input type="text" value={newTemplateShortName} onChange={(e) => setNewTemplateShortName(e.target.value)}
                    placeholder="e.g., Asthma" maxLength="15" className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs" />
                </div>
              </div>

              {/* Symptoms & Diagnoses */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Symptoms</label>
                  <textarea value={templateFormData.symptoms}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, symptoms: e.target.value }))}
                    placeholder="Fever, Cough, Headache"
                    className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs" rows="2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Diagnoses</label>
                  <textarea value={templateFormData.diagnoses}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, diagnoses: e.target.value }))}
                    placeholder="Acute URI, Bronchitis"
                    className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs" rows="2" />
                </div>
              </div>

              {/* Medications */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Medications</label>
                  <button type="button" onClick={() => setTemplateFormData(prev => ({
                    ...prev,
                    medications: [...prev.medications, { name: '', brand: '', composition: '', frequency: '', timing: 'After Meal', duration: '', instructions: '', qty: '' }]
                  }))} className="text-xs px-2 py-0.5 bg-green-500 text-white rounded hover:bg-green-600">+ Add</button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {templateFormData.medications.map((med, idx) => (
                    <div key={idx} className="bg-gray-50 p-2 rounded border relative">
                      {templateFormData.medications.length > 1 && (
                        <button type="button" onClick={() => setTemplateFormData(prev => ({
                          ...prev, medications: prev.medications.filter((_, i) => i !== idx)
                        }))} className="absolute top-1 right-1 text-red-400 hover:text-red-600 text-xs">✕</button>
                      )}
                      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                        <input type="text" value={med.name} placeholder="Medicine Name *"
                          onChange={(e) => { const m = [...templateFormData.medications]; m[idx] = { ...m[idx], name: e.target.value }; setTemplateFormData(prev => ({ ...prev, medications: m })); }}
                          className="px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-purple-500" />
                        <input type="text" value={med.frequency} placeholder="Frequency (1-1-1)"
                          onChange={(e) => { const m = [...templateFormData.medications]; m[idx] = { ...m[idx], frequency: e.target.value }; setTemplateFormData(prev => ({ ...prev, medications: m })); }}
                          className="px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <select value={med.timing}
                          onChange={(e) => { const m = [...templateFormData.medications]; m[idx] = { ...m[idx], timing: e.target.value }; setTemplateFormData(prev => ({ ...prev, medications: m })); }}
                          className="px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-purple-500">
                          <option value="Before Meal">Before Meal</option>
                          <option value="After Meal">After Meal</option>
                          <option value="With Meal">With Meal</option>
                          <option value="Empty Stomach">Empty Stomach</option>
                          <option value="Bedtime">Bedtime</option>
                        </select>
                        <input type="text" value={med.duration} placeholder="Duration (5 days)"
                          onChange={(e) => { const m = [...templateFormData.medications]; m[idx] = { ...m[idx], duration: e.target.value }; setTemplateFormData(prev => ({ ...prev, medications: m })); }}
                          className="px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-purple-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investigations & Precautions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Investigations</label>
                  <textarea value={templateFormData.investigations}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, investigations: e.target.value }))}
                    placeholder="CBC, Blood Sugar, etc."
                    className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs" rows="1" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Precautions</label>
                  <textarea value={templateFormData.precautions}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, precautions: e.target.value }))}
                    placeholder="Avoid cold water..."
                    className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs" rows="1" />
                </div>
              </div>

              {/* Diet & Advice */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Diet Restrictions</label>
                  <textarea value={templateFormData.diet_restrictions}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, diet_restrictions: e.target.value }))}
                    placeholder="Avoid spicy food..."
                    className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs" rows="1" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Advice</label>
                  <textarea value={templateFormData.advice}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, advice: e.target.value }))}
                    placeholder="Plenty of fluids..."
                    className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs" rows="1" />
                </div>
              </div>

              {/* Follow-up & Duration */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Follow-up Days</label>
                  <input type="number" value={templateFormData.follow_up_days}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, follow_up_days: e.target.value }))}
                    placeholder="7" className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Duration Days</label>
                  <input type="number" value={templateFormData.duration_days}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, duration_days: e.target.value }))}
                    placeholder="7" className="w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs" />
                </div>
              </div>
            </div>

            <div className="p-3 border-t flex gap-2 shrink-0">
              <button
                onClick={() => {
                  setShowCreateTemplateModal(false);
                  setNewTemplateName('');
                  setNewTemplateShortName('');
                  setTemplateFormData({
                    symptoms: '', diagnoses: '',
                    medications: [{ name: '', brand: '', composition: '', frequency: '', timing: 'After Meal', duration: '', instructions: '', qty: '' }],
                    investigations: '', precautions: '', diet_restrictions: '', activities: '', advice: '', follow_up_days: '', duration_days: '7'
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsTemplate}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition"
                disabled={!newTemplateName.trim() || !newTemplateShortName.trim()}
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          {/* Dosage Calculator */}
          <div className="mb-4">
            <DosageCalculator
              patientWeight={parseFloat(vitals.weight) || 0}
              patientAge={patient ? calculateAge(patient.dob) : 0}
              dosageCalculator={dosageCalculator}
              language={language}
              addToast={addToast}
              addMedicine={(med) => {
                setMedications(prev => [...prev, med]);
                RecentlyUsedMedicines.add(med);
                const recent = RecentlyUsedMedicines.getAll();
                setRecentMedicines(recent.slice(0, 15));
              }}
            />
          </div>

          {/* Dynamic Sections - Render based on pad configuration */}
          {renderDynamicSections()}

            {/* Instruction Language Selector */}
            <div className="flex items-center gap-2 mb-3">
              <label htmlFor="instruction-language" className="text-sm font-medium text-gray-700">Instruction Language:</label>
              <select
                className="px-3 py-2 border rounded text-sm"
                id="instruction-language"
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
              >
                {instructionLanguages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-2">
              {!showTaperInput ? (
                <button
                  type="button"
                  onClick={() => setShowTaperInput(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded font-medium text-sm hover:bg-purple-700 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span className="text-base leading-none">↓</span> Add Tapering Dose
                </button>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="relative flex-1">
                    <label className="text-xs font-semibold text-purple-700 mb-1 block">Search medicine for tapering dose:</label>
                    <input
                      autoFocus
                      className="w-full px-3 py-2 border border-purple-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                      placeholder="Type medicine name (e.g. Prednisolone, Wysolone)..."
                      value={taperMedInput}
                      onChange={(e) => {
                        setTaperMedInput(e.target.value);
                        searchTaperMeds(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && taperMedInput.trim()) {
                          e.preventDefault();
                          addTaperMed(taperMedInput.trim());
                        }
                        if (e.key === 'Escape') {
                          setShowTaperInput(false);
                          setTaperMedInput('');
                          setTaperMedResults([]);
                        }
                      }}
                    />
                    {(taperMedResults.length > 0 || taperMedLoading) && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-purple-200 rounded shadow-lg max-h-60 overflow-y-auto">
                        {taperMedLoading && <div className="px-3 py-2 text-xs text-gray-500">Searching...</div>}
                        {taperMedResults.map((m, idx) => (
                          <button
                            key={`taper-${idx}`}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-purple-50 border-b text-sm"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addTaperMed(m)}
                          >
                            <div className="font-medium text-gray-900">{m.brand || m.name}</div>
                            {(m.composition || m.generic_name || m.strength) && (
                              <div className="text-xs text-gray-500">{[m.composition || m.generic_name, m.strength].filter(Boolean).join(' | ')}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowTaperInput(false); setTaperMedInput(''); setTaperMedResults([]); }}
                    className="mt-6 px-3 py-2 text-sm text-gray-500 hover:text-red-600 border rounded hover:border-red-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <input
                data-testid="medicine-input"
                className="w-full px-3 py-2 border rounded"
                placeholder="Start typing Medicines"
                value={medInput}
                onFocus={() => setMedDropdown(true)}
                onChange={(e) => {
                  setMedInput(e.target.value);
                  setMedDropdown(true);
                  setSnomedDrugPage(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && medInput.trim()) {
                    e.preventDefault();
                    addMed(medInput.trim());
                  }
                }}
                onBlur={() => setTimeout(() => setMedDropdown(false), 200)}
              />
              {medDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-80 overflow-y-auto">
                  {frequentlyPrescribedMeds.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-blue-50 text-xs font-semibold text-blue-900 border-b">
                        FREQUENTLY prescribed by you
                      </div>
                      {frequentlyPrescribedMeds.filter(m =>
                        (m.name || '').toLowerCase().includes(medInput.toLowerCase()) ||
                        (m.brand || '').toLowerCase().includes(medInput.toLowerCase())
                      ).map((m, idx) => (
                        <button
                          key={`freq-${idx}-${m.name}`}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addMed(m)}
                        >
                          <div className="font-medium">{m.name || m.brand}</div>
                          <div className="text-xs text-slate-600">{m.composition || m.generic_name || ''}</div>
                        </button>
                      ))}
                    </>
                  )}
                  {filteredMeds.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-green-50 text-xs font-semibold text-green-900 border-b">
                        MEDICINES ({filteredMeds.length} results)
                      </div>
                      {filteredMeds.map((m, idx) => (
                        <button
                          key={`sugg-${idx}-${m.name}`}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-green-50 border-b border-slate-100"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addMed(m)}
                        >
                          <div className="font-medium">{m.name || m.brand}</div>
                          <div className="text-xs text-slate-600">
                            {m.composition && <span>{m.composition}</span>}
                            {m.strength && <span> • {m.strength}</span>}
                            {m.dosage_form && <span> • {m.dosage_form}</span>}
                            {m.source && <span className="ml-1 px-1 py-0.5 bg-slate-100 rounded text-[10px]">{m.source}</span>}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {snomedDrugResults.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-purple-50 text-xs font-semibold text-purple-900 border-b flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                          <span>🔬 SNOMED CT Drug Database</span>
                          <span className="text-purple-600 font-normal">({snomedDrugResults.length} results)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" className="px-2 py-0.5 border rounded text-xs disabled:opacity-50" onClick={() => setSnomedDrugPage(p => Math.max(0, p - 1))} disabled={snomedDrugPage === 0}>Prev</button>
                          <span className="text-xs text-purple-700">Page {snomedDrugPage + 1}</span>
                          <button type="button" className="px-2 py-0.5 border rounded text-xs" onClick={() => setSnomedDrugPage(p => p + 1)}>Next</button>
                        </div>
                      </div>
                      {snomedDrugResults.map((drug, idx) => (
                        <button
                          key={`snomed-${idx}-${drug.conceptId}`}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-purple-50 border-b border-slate-100 last:border-0"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            // Convert SNOMED drug to medication format
                            const medData = {
                              name: drug.genericName || drug.drugName,
                              brand: drug.brandName || drug.drugName,
                              composition: drug.genericName || '',
                              strength: drug.strength || '',
                              dosageForm: drug.dosageForm || '',
                              snomedId: drug.conceptId,
                              available: true
                            };
                            addMed(medData);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-800">{drug.drugName || drug.brandName}</span>
                            {drug.dosageForm && (
                              <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{drug.dosageForm}</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            {drug.genericName && <span>{drug.genericName}</span>}
                            {drug.strength && <span> • {drug.strength}</span>}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {frequentlyPrescribedMeds.length === 0 && filteredMeds.length === 0 && snomedDrugResults.length === 0 && medInput.length === 0 && (
                    <div className="px-3 py-3 text-sm text-slate-500 text-center">
                      Start typing to search medicines...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drug Interaction Warnings */}
            {showInteractionWarnings && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm text-red-900">⚠️ Drug Interactions</h4>
                  <button
                    type="button"
                    onClick={() => setShowInteractionWarnings(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                {drugInteractions.length > 0 && (
                  <div className="space-y-1">
                    {drugInteractions.map((interaction, idx) => (
                      <div key={`interaction-${idx}`} className="text-xs">
                        <span className="font-medium">{interaction.medicine1}</span> + 
                        <span className="font-medium"> {interaction.medicine2}</span>: 
                        <span className={`ml-1 px-1 py-0.5 rounded text-white ${
                          interaction.severity === 'high' ? 'bg-red-500' :
                          interaction.severity === 'moderate' ? 'bg-orange-500' : 'bg-yellow-500'
                        }`}>
                          {interaction.severity}
                        </span>
                        <div className="text-gray-600 mt-1">{interaction.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Auto-save Status */}
            {autoSaveStatus && (
              <div className="mt-2 text-xs text-green-600 text-center">
                {autoSaveStatus}
              </div>
            )}

            {/* Display Added Items (Medications) */}
            <div className="space-y-4">
              {/* Medications List */}
              {meds.filter(m => !m.type || m.type === 'medication').length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-semibold text-sm mb-3 text-blue-800 flex items-center gap-2">
                    💊 Medications
                    <span className="text-xs font-normal bg-blue-100 px-2 py-0.5 rounded-full">
                      {meds.filter(m => !m.type || m.type === 'medication').length} items
                    </span>
                    <span className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMedicationsTemplateSelector(true)}
                        className="text-xs px-2 py-1 bg-blue-200 text-blue-700 rounded hover:bg-blue-300 transition"
                      >
                        📋 Load Template
                      </button>
                      {meds.filter(m => !m.type || m.type === 'medication').length > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            const tName = prompt('Template name:');
                            if (!tName) return;
                            const medsToSave = meds.filter(m => !m.type || m.type === 'medication').map(m => ({
                              medication_name: m.name || m.brand,
                              brand_name: m.brand || m.name,
                              frequency: m.frequency || '',
                              duration: m.duration || '',
                              timing: m.timing || '',
                              instructions: m.instructions || '',
                              quantity: m.qty || 0
                            }));
                            try {
                              await api.post('/api/medications-templates', { name: tName, medications: medsToSave });
                              addToast('Template saved!', 'success');
                              const res = await api.get('/api/medications-templates');
                              setMedicationsTemplates(res.data.templates || []);
                            } catch (e) {
                              addToast('Failed to save template', 'error');
                            }
                          }}
                          className="text-xs px-2 py-1 bg-green-200 text-green-700 rounded hover:bg-green-300 transition"
                        >
                          💾 Save as Template
                        </button>
                      )}
                    </span>
                  </h4>
                  <div className="bg-white border rounded overflow-x-auto">
                    <div className="grid min-w-[850px] bg-blue-100 text-xs font-semibold text-blue-800 px-3 py-2" style={{gridTemplateColumns:'40px 2fr 1fr 1fr 1fr 1fr 100px'}}>
                      <span>#</span>
                      <span>MEDICINE (Generic)</span>
                      <span>FREQUENCY</span>
                      <span>TIMING</span>
                      <span>DURATION</span>
                      <span>INSTRUCTIONS</span>
                      <span>QTY / ACTION</span>
                    </div>
                    {meds.filter(m => !m.type || m.type === 'medication').map((med, idx) => {
                      const actualIdx = meds.findIndex(m => m === med);
                      return (
                        <React.Fragment key={idx}>
                        <div className="grid min-w-[850px] px-3 py-2 border-t text-sm hover:bg-blue-50 transition" style={{gridTemplateColumns:'40px 2fr 1fr 1fr 1fr 1fr 100px'}}>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500 font-medium w-5">{idx + 1}.</span>
                            <div className="flex flex-col gap-0.5">
                              <button type="button" onClick={() => { if (actualIdx > 0) { const u = [...meds]; [u[actualIdx-1], u[actualIdx]] = [u[actualIdx], u[actualIdx-1]]; setMeds(u); }}} className="text-gray-400 hover:text-blue-600 leading-none text-xs" title="Move up">▲</button>
                              <button type="button" onClick={() => { if (actualIdx < meds.length-1) { const u = [...meds]; [u[actualIdx], u[actualIdx+1]] = [u[actualIdx+1], u[actualIdx]]; setMeds(u); }}} className="text-gray-400 hover:text-blue-600 leading-none text-xs" title="Move down">▼</button>
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{med.name || med.brand}</div>
                            {(med.composition || med.strength) && <div className="text-xs text-gray-500">{[med.composition, med.strength].filter(Boolean).join(' ')}</div>}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...meds];
                                updated[actualIdx].is_tapering = !updated[actualIdx].is_tapering;
                                if (updated[actualIdx].is_tapering && (!updated[actualIdx].tapering_schedule || updated[actualIdx].tapering_schedule.length === 0)) {
                                  updated[actualIdx].tapering_schedule = [
                                    { step_number: 1, dose: '10 mg', frequency: 'Once daily', duration_days: 5 },
                                    { step_number: 2, dose: '5 mg', frequency: 'Once daily', duration_days: 5 },
                                    { step_number: 3, dose: '2.5 mg', frequency: 'Once daily', duration_days: 5 }
                                  ];
                                }
                                setMeds(updated);
                              }}
                              className={`mt-1 px-2 py-0.5 rounded text-xs font-medium border transition-all ${
                                med.is_tapering
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                  : 'bg-white text-purple-600 border-purple-300 hover:bg-purple-50 hover:border-purple-400'
                              }`}
                              title="Toggle tapering dose schedule"
                            >
                              {med.is_tapering ? '✓ Tapering' : '↓ Taper'}
                            </button>
                          </div>
                          {/* Frequency - editable input with dropdown */}
                          <div className="relative">
                            <input
                              className="px-2 py-1 border rounded text-xs w-full pr-6"
                              value={med.frequency || ''}
                              onChange={(e) => {
                                const updated = [...meds];
                                updated[actualIdx].frequency = e.target.value;
                                updated[actualIdx].qty = calcQty(e.target.value, updated[actualIdx].duration) || updated[actualIdx].qty;
                                setMeds(updated);
                              }}
                              onFocus={(e) => e.target.nextSibling.style.display = 'block'}
                              onBlur={() => setTimeout(() => { try { document.querySelectorAll('.freq-dd').forEach(el => el.style.display = 'none'); } catch(e){} }, 200)}
                              placeholder="1-0-1"
                            />
                            <div className="freq-dd absolute left-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto" style={{display:'none'}}>
                              {allFrequencyPresets.map(f => (
                                <button key={f} type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    const updated = [...meds];
                                    updated[actualIdx].frequency = f;
                                    updated[actualIdx].qty = calcQty(f, updated[actualIdx].duration) || updated[actualIdx].qty;
                                    setMeds(updated);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 hover:text-blue-700 border-b border-gray-50"
                                >{f}</button>
                              ))}
                            </div>
                          </div>
                          {/* Timing - editable input with dropdown */}
                          <div className="relative">
                            <input
                              className="px-2 py-1 border rounded text-xs w-full"
                              value={med.timing || ''}
                              onChange={(e) => {
                                const updated = [...meds];
                                updated[actualIdx].timing = e.target.value;
                                setMeds(updated);
                              }}
                              onFocus={(e) => e.target.nextSibling.style.display = 'block'}
                              onBlur={() => setTimeout(() => { try { document.querySelectorAll('.timing-dd').forEach(el => el.style.display = 'none'); } catch(e){} }, 200)}
                              placeholder="After Meal"
                            />
                            <div className="timing-dd absolute left-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto" style={{display:'none'}}>
                              {(timingOptions[language] || timingOptions.en).map(opt => (
                                <button key={opt} type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    const updated = [...meds];
                                    updated[actualIdx].timing = opt;
                                    setMeds(updated);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 hover:text-blue-700 border-b border-gray-50"
                                >{opt}</button>
                              ))}
                            </div>
                          </div>
                          <input
                            className="px-2 py-1 border rounded text-xs"
                            value={med.duration || ''}
                            onChange={(e) => {
                              const updated = [...meds];
                              updated[actualIdx].duration = e.target.value;
                              updated[actualIdx].qty = calcQty(updated[actualIdx].frequency, e.target.value) || updated[actualIdx].qty;
                              setMeds(updated);
                            }}
                            placeholder="7 days"
                          />
                          <div className="relative">
                            <input
                              className="px-2 py-1 border rounded text-xs w-full"
                              value={med.instructions || ''}
                              onChange={(e) => {
                                const updated = [...meds];
                                updated[actualIdx].instructions = e.target.value;
                                setMeds(updated);
                              }}
                              onFocus={(e) => e.target.nextSibling.style.display = 'block'}
                              onBlur={() => setTimeout(() => { try { document.querySelectorAll('.instr-dd').forEach(el => el.style.display = 'none'); } catch(e){} }, 200)}
                              placeholder="Instructions"
                            />
                            <div className="instr-dd absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto" style={{display:'none'}}>
                              {[
                                {en: 'Take with water', hi: 'पानी के साथ लें', mr: 'पाण्याबरोबर घ्या'},
                                {en: 'Take after meals', hi: 'खाने के बाद लें', mr: 'जेवणानंतर घ्या'},
                                {en: 'Take before meals', hi: 'खाने से पहले लें', mr: 'जेवणापूर्वी घ्या'},
                                {en: 'Take on empty stomach', hi: 'खाली पेट पर लें', mr: 'रिकाम्या पोटी घ्या'},
                                {en: 'Take at bedtime', hi: 'सोते समय लें', mr: 'झोपण्यापूर्वी घ्या'},
                                {en: 'Take as prescribed by doctor', hi: 'डॉक्टर के निर्देशानुसार लें', mr: 'डॉक्टरांच्या सल्ल्यानुसार घ्या'},
                                {en: 'Take with water, do not exceed recommended dose', hi: 'पानी के साथ लें, अनुशंसित खुराक से अधिक न लें', mr: 'पाण्याबरोबर घ्या, शिफारस केलेल्या डोसपेक्षा जास्त घेऊ नका'},
                                {en: 'After food to avoid gastric irritation', hi: 'गैस्ट्रिक जलन से बचने के लिए खाने के बाद', mr: 'जठरामाशयीय जलनापासून बचण्यासाठी खाण्यानंतर'},
                                {en: 'Take 30 min before food', hi: 'खाने से 30 मिनट पहले लें', mr: 'खाण्यापूर्वी 30 मिनिटे आधी घ्या'},
                                {en: 'Do not crush or chew', hi: 'कुचलें या चबाएं नहीं', mr: 'कुस्करू किंवा चावू नका'},
                                {en: 'Complete the full course', hi: 'पूरा कोर्स पूरा करें', mr: 'संपूर्ण कोर्स पूर्ण करा'},
                                {en: 'SOS - take only when needed', hi: 'SOS - जरूरत पड़ने पर ही लें', mr: 'SOS - गरज असेल तेव्हाच घ्या'},
                                {en: 'For external use only', hi: 'केवल बाहरी उपयोग के लिए', mr: 'फक्त बाह्य वापरासाठी'},
                                {en: 'Apply locally', hi: 'स्थानीय रूप से लगाएं', mr: 'स्थानिकपणे लावा'},
                                {en: 'Avoid alcohol', hi: 'शराब से बचें', mr: 'मद्यपान टाळा'},
                                {en: 'May cause mild drowsiness', hi: 'हल्की नींद आ सकती है', mr: 'हल्की निंद्रा येऊ शकते'},
                              ].map((opt, oi) => (
                                <button key={oi} type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    const updated = [...meds];
                                    updated[actualIdx].instructions = opt[language] || opt.en;
                                    setMeds(updated);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 hover:text-blue-700 border-b border-gray-50"
                                >{opt[language] || opt.en}</button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              className="px-2 py-1 border rounded text-xs w-16"
                              type="number"
                              value={med.qty || ''}
                              onChange={(e) => {
                                const updated = [...meds];
                                updated[actualIdx].qty = e.target.value || '';
                                setMeds(updated);
                              }}
                            />
                            <button
                              onClick={() => removeMed(actualIdx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        {/* Tapering Schedule - Step-wise */}
                        {med.is_tapering && med.tapering_schedule && (
                          <div className="min-w-[850px] px-3 py-2 bg-purple-50 border-t border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-purple-700">Tapering Schedule</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...meds];
                                  const nextStep = updated[actualIdx].tapering_schedule.length + 1;
                                  updated[actualIdx].tapering_schedule.push({ step_number: nextStep, dose: '', frequency: 'Once daily', duration_days: 5 });
                                  setMeds(updated);
                                }}
                                className="text-xs px-2 py-0.5 bg-purple-200 text-purple-700 rounded hover:bg-purple-300"
                              >
                                + Add Step
                              </button>
                            </div>
                            <div className="grid grid-cols-[40px_1fr_1fr_80px_30px] gap-1 text-xs font-medium text-purple-600 mb-1 px-1">
                              <span>Step</span>
                              <span>Dose</span>
                              <span>Frequency</span>
                              <span>Duration</span>
                              <span></span>
                            </div>
                            {med.tapering_schedule.map((step, si) => (
                              <div key={si} className="grid grid-cols-[40px_1fr_1fr_80px_30px] gap-1 items-center mb-1">
                                <span className="text-xs font-bold text-purple-700 text-center">{si + 1}</span>
                                <input
                                  className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                                  value={step.dose}
                                  onChange={(e) => {
                                    const updated = [...meds];
                                    updated[actualIdx].tapering_schedule[si].dose = e.target.value;
                                    setMeds(updated);
                                  }}
                                  placeholder="e.g. 10 mg"
                                />
                                <select
                                  className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                                  value={step.frequency}
                                  onChange={(e) => {
                                    const updated = [...meds];
                                    updated[actualIdx].tapering_schedule[si].frequency = e.target.value;
                                    setMeds(updated);
                                  }}
                                >
                                  <option value="Once daily">Once daily</option>
                                  <option value="Twice daily">Twice daily</option>
                                  <option value="Thrice daily">Thrice daily</option>
                                  <option value="Every other day">Every other day</option>
                                  <option value="Once weekly">Once weekly</option>
                                  <option value="1-0-0">1-0-0</option>
                                  <option value="0-1-0">0-1-0</option>
                                  <option value="0-0-1">0-0-1</option>
                                  <option value="1-1-0">1-1-0</option>
                                  <option value="1-0-1">1-0-1</option>
                                  <option value="0-1-1">0-1-1</option>
                                  <option value="1-1-1">1-1-1</option>
                                </select>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    className="text-xs border rounded px-1 py-1 w-12 focus:outline-none focus:ring-1 focus:ring-purple-400"
                                    value={step.duration_days}
                                    onChange={(e) => {
                                      const updated = [...meds];
                                      updated[actualIdx].tapering_schedule[si].duration_days = parseInt(e.target.value) || 1;
                                      setMeds(updated);
                                    }}
                                  />
                                  <span className="text-xs text-gray-500">d</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...meds];
                                    updated[actualIdx].tapering_schedule = updated[actualIdx].tapering_schedule.filter((_, i) => i !== si);
                                    // Re-number steps
                                    updated[actualIdx].tapering_schedule.forEach((s, i) => s.step_number = i + 1);
                                    setMeds(updated);
                                  }}
                                  className="text-red-400 hover:text-red-600 text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {med.tapering_schedule.length > 0 && (
                              <div className="mt-2 text-xs text-purple-600 bg-purple-100 rounded px-2 py-1">
                                <span className="font-medium">Preview: </span>
                                {med.tapering_schedule.map((s, i) => (
                                  <span key={i}>
                                    {i > 0 && <span className="font-medium"> → Then </span>}
                                    {s.dose} {s.frequency} for {s.duration_days} day{s.duration_days > 1 ? 's' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Injections List */}
              {meds.filter(m => m.type === 'injection').length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <h4 className="font-semibold text-sm mb-3 text-orange-800 flex items-center gap-2">
                    💉 Injections / IVF
                    <span className="text-xs font-normal bg-orange-100 px-2 py-0.5 rounded-full">
                      {meds.filter(m => m.type === 'injection').length} items
                    </span>
                  </h4>
                  <div className="bg-white border rounded overflow-x-auto">
                    <div className="grid grid-cols-9 min-w-[950px] bg-orange-100 text-xs font-semibold text-orange-800 px-3 py-2">
                      <span className="col-span-2">INJECTION NAME</span>
                      <span>DOSE</span>
                      <span>ROUTE</span>
                      <span>INFUSION RATE</span>
                      <span>FREQUENCY</span>
                      <span>DURATION</span>
                      <span>INSTRUCTIONS</span>
                      <span className="text-center">ACTION</span>
                    </div>
                    {meds.filter(m => m.type === 'injection').map((inj, idx) => {
                      const actualIdx = meds.findIndex(m => m === inj);
                      return (
                        <div key={idx} className="grid grid-cols-9 min-w-[950px] px-3 py-2 border-t text-sm hover:bg-orange-50 transition">
                          <div className="col-span-2">
                            <div className="font-medium text-gray-900">{inj.brand || inj.name}</div>
                            {inj.composition && <div className="text-xs text-gray-500">{inj.composition}</div>}
                          </div>
                          <div className="text-xs text-gray-700">{inj.dosage || inj.dose || inj.strength || '-'}</div>
                          <div className="text-xs">
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{inj.route || inj.dosage_form || '-'}</span>
                          </div>
                          <div className="text-xs text-gray-600">{inj.infusion_rate || '-'}</div>
                          <div className="text-xs text-gray-700">{inj.frequency || '-'}</div>
                          <div className="text-xs text-gray-700">{inj.duration || '-'}</div>
                          <div className="text-xs text-gray-600 truncate" title={inj.instructions}>{translateInstruction(inj.instructions, language) || '-'}</div>
                          <div className="flex justify-center">
                            <button
                              onClick={() => removeMed(actualIdx)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                              title="Remove injection"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {meds.length === 0 && (
                <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <div className="text-gray-400 text-lg mb-2">💊 💉</div>
                  <div className="text-gray-500 text-sm">
                    No medications or injections added yet
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    Search above or use smart suggestions to add items
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMedicationsTemplateSelector(true)}
                    className="mt-3 text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                  >
                    📋 Load from Template
                  </button>
                </div>
              )}
            </div>
          

          {/* Injections section removed (merged into medications list). */}

          {/* Lab Investigations - Now dynamically rendered based on pad configuration */}
          {/* <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Lab Investigations</h3>
              <button
                onClick={async () => {
                  try {
                    const res = await api.get(`/api/lab-investigations?patient=${patientId}`);
                    const investigations = res.data.investigations || [];

                    if (investigations.length === 0) {
                      addToast('No previous lab results found', 'info');
                      return;
                    }

                    setPreviousLabResults(investigations);
                    setShowLabResultsModal(true);
                  } catch (error) {
                    console.error('Error fetching previous lab results:', error);
                    addToast('Failed to load previous lab results', 'error');
                  }
                }}
                className="text-sm text-primary hover:underline"
              >
                View Previous Results
              </button>
            </div>

            <div className="flex gap-2 mb-2">
              <input
                data-testid="lab-input"
                type="text"
                value={labTestInput}
                onChange={(e) => setLabTestInput(e.target.value)}
                className="flex-1 px-3 py-2 border rounded"
                placeholder="Add lab test (e.g., CBC, Blood Sugar, etc.)..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (labTestInput.trim()) {
                      setLabResults(prev => [...prev, {
                        test: labTestInput.trim(),
                        status: 'pending',
                        date: new Date().toISOString().split('T')[0]
                      }]);
                      setLabTestInput('');
                    }
                  }
                }}
              />
            </div>

            {labResults.length > 0 && (
              <div className="border rounded overflow-hidden">
                <div className="grid grid-cols-3 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                  <span>Test Name</span>
                  <span>Date</span>
                  <span>Action</span>
                </div>
                {labResults.map((lab, idx) => (
                  <div key={idx} className="grid grid-cols-3 px-3 py-2 border-t items-center text-sm">
                    <span>{lab.test}</span>
                    <span className="text-gray-600">{lab.date}</span>
                    <button
                      onClick={() => setLabResults(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advices - Now dynamically rendered based on pad configuration */}
          {/* <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{uiLabels['en']?.advice || 'Advices'}</h3>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={enableTranslations}
                    onChange={(e) => setEnableTranslations(e.target.checked)}
                  />
                  Enable Translations
                </label>
                {enableTranslations && (
                  <select
                    className="px-2 py-1 border rounded text-sm"
                    value={language}
                    onChange={(e) => changeLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="mr">Marathi</option>
                  </select>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(adviceTemplates.length > 0 ? adviceTemplates.map(t => t.text) : (predefinedAdvice[language] || predefinedAdvice.en)).map((adv) => (
                <label key={adv} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedAdvice.includes(adv)}
                    onChange={() => toggleAdvice(adv)}
                  />
                  {adv}
                </label>
              ))}
              {customAdviceItems.map((adv, idx) => (
                <span key={'ca2-' + idx} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedAdvice.includes(adv)}
                    onChange={() => toggleAdvice(adv)}
                  />
                  <span className="text-blue-700">{adv}</span>
                  <button type="button" onClick={() => deleteCustomAdvice(idx)} className="text-red-400 hover:text-red-600 text-xs ml-1">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                className="flex-1 px-2 py-1 text-sm border rounded"
                placeholder="Type custom advice and press Enter..."
                value={newAdviceInput}
                onChange={(e) => setNewAdviceInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomAdvice(newAdviceInput); } }}
              />
              <button
                type="button"
                onClick={() => addCustomAdvice(newAdviceInput)}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            <div className="border rounded p-2">
              <div className="flex gap-2 mb-2 border-b pb-2">
                <button
                  type="button"
                  onClick={() => formatAdvice('bold')}
                  className="px-2 py-1 text-sm border rounded hover:bg-slate-50 font-bold"
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => formatAdvice('italic')}
                  className="px-2 py-1 text-sm border rounded hover:bg-slate-50 italic"
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => formatAdvice('insertUnorderedList')}
                  className="px-2 py-1 text-sm border rounded hover:bg-slate-50"
                  title="List"
                >
                  •
                </button>
              </div>
              <div
                ref={adviceEditorRef}
                contentEditable
                className="min-h-[100px] p-2 focus:outline-none"
                onInput={(e) => setAdvice(e.target.innerText)}
                suppressContentEditableWarning={true}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={printOnPrescription}
                onChange={(e) => setPrintOnPrescription(e.target.checked)}
              />
              {language === 'hi' ? 'प्रिस्क्रिप्शन पर प्रिंट करें' : language === 'mr' ? 'प्रिस्क्रिप्शनवर छापा' : 'Print on prescription'}
            </label>
          </div>

          {/* Follow Up - Now dynamically rendered based on pad configuration */}
          {/* <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <h3 className="font-semibold">{uiLabels['en']?.followUp || 'Follow Up'}</h3>
            <div className="flex gap-2 items-center">
              <input
                className="px-3 py-2 border rounded"
                placeholder={language === 'hi' ? 'दिन' : language === 'mr' ? 'दिवस' : 'Days'}
                type="number"
                value={followUp.days}
                onChange={(e) => handleFollowUpDaysChange(e.target.value)}
              />
              <input
                className="px-3 py-2 border rounded"
                type="date"
                value={followUp.date}
                onChange={(e) => setFollowUp({ ...followUp, date: e.target.value })}
              />
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={followUp.autoFill}
                  onChange={(e) => setFollowUp({ ...followUp, autoFill: e.target.checked })}
                />
                {language === 'hi' ? 'Rx से ऑटो फिल' : language === 'mr' ? 'Rx वरून ऑटो भरा' : 'Auto Fill from Rx'}
              </label>
            </div>
            <textarea
              className="w-full px-3 py-2 border rounded"
              rows={2}
              placeholder={language === 'hi' ? 'नोट्स' : language === 'mr' ? 'टिपा' : 'Notes'}
            />
          </div> */}

          {/* Notes - Now dynamically rendered based on pad configuration */}
          {/* <div className="bg-white border rounded shadow-sm p-4 space-y-3">
            <h3 className="font-semibold">{language === 'hi' ? 'नोट्स' : language === 'mr' ? 'टिपा' : 'Notes'}</h3>
            <div>
              <label className="block text-sm font-medium mb-1">{uiLabels['en']?.patientNotes || 'Patient Notes'}</label>
              <textarea
                className="w-full px-3 py-2 border rounded"
                rows={3}
                placeholder={language === 'hi' ? 'रोगी को दिखने वाले नोट्स' : language === 'mr' ? 'रुग्यांना दिसणारे नोट्स' : 'Notes visible to patient'}
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {(uiLabels['en']?.privateNotes || 'PRIVATE NOTES').toUpperCase()}
                <span className="text-xs text-slate-500 ml-2">(These will not be printed)</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border rounded"
                rows={3}
                placeholder={language === 'hi' ? 'डॉक्टर के लिए निजी नोट्स' : language === 'mr' ? 'डॉक्टरसाठी खाजगी नोट्स' : 'Private notes for doctor'}
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
              />
            </div>
          </div> */}

          {/* Bottom Action Bar */}
          <div className="bg-white border rounded shadow-sm p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 mb-3">
              <button
                className="px-3 py-2 text-sm border rounded hover:bg-slate-50"
                onClick={handleClear}
              >
                Clear
              </button>
              <select
                className="px-3 py-2 text-sm border rounded"
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
              </select>
              <div className="relative" ref={templateDropdownRef}>
                <button
                  type="button"
                  className="px-3 py-2 text-sm border rounded bg-blue-50 flex items-center gap-2 min-w-[160px] justify-between"
                  onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                  title="Select Letterhead Template"
                >
                  <span className="truncate">
                    {selectedTemplateId
                      ? (receiptTemplates.find(t => t.id === selectedTemplateId)?.template_name || 'Template')
                      : (showDefaultLetterhead ? 'Default Letterhead' : 'No Letterhead')}
                  </span>
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showTemplateDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-50 min-w-[220px]">
                    {/* No Letterhead option */}
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${!selectedTemplateId && !showDefaultLetterhead ? 'bg-blue-50 font-medium' : ''}`}
                      onClick={() => { setSelectedTemplateId(null); setSelectedTemplate(null); setShowDefaultLetterhead(false); localStorage.setItem('hideDefaultLetterhead', 'true'); setShowTemplateDropdown(false); }}
                    >
                      No Letterhead
                    </button>
                    {/* Default Letterhead option */}
                    {showDefaultLetterhead && (
                      <div className={`flex items-center justify-between hover:bg-gray-100 ${!selectedTemplateId ? 'bg-blue-50' : ''}`}>
                        <button
                          type="button"
                          className="flex-1 text-left px-3 py-2 text-sm font-medium"
                          onClick={() => { setSelectedTemplateId(null); setSelectedTemplate(null); setShowTemplateDropdown(false); }}
                        >
                          Default Letterhead
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-red-400 hover:text-red-600 text-xs mr-1"
                          onClick={(e) => { e.stopPropagation(); hideDefaultLetterhead(); setShowTemplateDropdown(false); }}
                          title="Remove Default Letterhead"
                        >
                          &times;
                        </button>
                      </div>
                    )}
                    {/* Receipt templates */}
                    {receiptTemplates.map(template => (
                      <div key={template.id} className={`flex items-center justify-between hover:bg-gray-100 ${selectedTemplateId === template.id ? 'bg-blue-50' : ''}`}>
                        <button
                          type="button"
                          className="flex-1 text-left px-3 py-2 text-sm"
                          onClick={() => { setSelectedTemplateId(template.id); setSelectedTemplate(template); setShowTemplateDropdown(false); }}
                        >
                          {template.template_name} {template.is_default ? '(Default)' : ''}
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-red-400 hover:text-red-600 text-xs mr-1"
                          onClick={(e) => { e.stopPropagation(); deleteReceiptTemplate(template.id); }}
                          title="Delete template"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    {/* Restore default option if hidden */}
                    {!showDefaultLetterhead && (
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs text-blue-500 hover:bg-blue-50 border-t"
                        onClick={() => { setShowDefaultLetterhead(true); localStorage.removeItem('hideDefaultLetterhead'); setShowTemplateDropdown(false); addToast('Default Letterhead restored', 'info'); }}
                      >
                        + Restore Default Letterhead
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center justify-start md:justify-end">
              <button
                data-testid="save-btn"
                className="px-3 py-2 text-sm border rounded hover:bg-slate-50 disabled:opacity-50"
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Prescription'}
              </button>
              <button
                className="flex items-center gap-1 px-3 py-2 text-sm border rounded hover:bg-blue-50 text-blue-700 hover:border-blue-300"
                onClick={() => setShowTemplateModal(true)}
                title="Save current prescription as a template"
              >
                <FiBookmark />
                <span className="hidden sm:inline">Save as Template</span>
                <span className="sm:hidden">Template</span>
              </button>
              {currentPrescriptionId && (
                <button
                  className="flex items-center gap-1 px-3 py-2 text-sm border rounded hover:bg-green-50 text-green-700 hover:border-green-300"
                  onClick={() => downloadPrescriptionPDF(currentPrescriptionId, { language, templateId: selectedTemplateId, withLetterhead: printWithLetterhead })}
                  title="Download prescription as PDF"
                >
                  <FiDownload className="w-4 h-4" />
                  <span className="hidden sm:inline">Download PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>
              )}

              {/* WhatsApp Send */}
              <button
                className="flex items-center gap-1 px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition"
                onClick={() => {
                  const phone = patient?.phone || patient?.mobile;
                  if (!phone) {
                    addToast('Patient phone number not available', 'error');
                    return;
                  }
                  const patientName = patient?.name || patient?.first_name || 'Patient';
                  const medsText = meds.map(m => `- ${m.name || m.brand}${m.frequency ? ' (' + m.frequency + ')' : ''}${m.duration ? ' x ' + m.duration : ''}`).join('\n');
                  const pdfLink = currentPrescriptionId ? `${window.location.origin}/api/pdf/prescription/${currentPrescriptionId}` : '';
                  const message = `Hello ${patientName},\n\nYour prescription is ready.\n\n*Medicines:*\n${medsText}\n\n${advice ? '*Advice:* ' + advice + '\n' : ''}${followUp.days ? '*Follow up:* After ' + followUp.days + ' days\n' : ''}${pdfLink ? '\n📄 *View/Download Prescription:*\n' + pdfLink + '\n' : ''}\nPlease follow the prescribed medications as advised.\n\nGet well soon!`;
                  const cleanPhone = String(phone).replace(/\D/g, '');
                  const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
                  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
                }}
                title="Send prescription via WhatsApp"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              {/* Print Format Selector */}
              <div className="flex items-center gap-2 px-3 py-1 border rounded bg-gray-50">
                <span className="text-xs font-medium text-gray-700 hidden sm:inline">Print:</span>
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="radio"
                    value="A4"
                    checked={printFormat === 'A4'}
                    onChange={(e) => setPrintFormat(e.target.value)}
                    className="cursor-pointer"
                  />
                  <span>A4</span>
                </label>
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="radio"
                    value="A5"
                    checked={printFormat === 'A5'}
                    onChange={(e) => setPrintFormat(e.target.value)}
                    className="cursor-pointer"
                  />
                  <span>A5</span>
                </label>
              </div>

              {/* Letterhead toggle */}
              <label className="flex items-center gap-1.5 px-2 py-1 border rounded bg-gray-50 cursor-pointer text-xs text-gray-700 select-none" title="Include clinic header & footer when printing/downloading">
                <input
                  type="checkbox"
                  checked={printWithLetterhead}
                  onChange={e => setPrintWithLetterhead(e.target.checked)}
                  className="cursor-pointer"
                />
                <span className="hidden sm:inline">With Letterhead</span>
                <span className="sm:hidden">Letterhead</span>
              </label>

              <button
                className="px-3 py-1.5 text-sm border rounded hover:bg-slate-50"
                onClick={handlePrint}
              >
                Print
              </button>
              <button
                className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 min-w-[140px] sm:min-w-[160px] md:min-w-[180px] lg:min-w-[200px] font-medium shadow-sm hover:shadow-md transition-all duration-200 order-first md:order-last"
                onClick={handleFinish}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Send Rx & End Visit'}
              </button>
            </div>
          </div>

        </div>

        {/* Right Sidebar - Past Visits */}
        <aside className="space-y-4">
          <div className="bg-white border rounded shadow-sm p-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-3 border-b pb-2">
              <button
                onClick={() => setPastVisitsTab('past')}
                className={`px-2 py-1 text-xs border rounded ${
                  pastVisitsTab === 'past' ? 'bg-primary text-white' : 'hover:bg-slate-50'
                }`}
                title="Past Visits"
              >
                P
              </button>
              <button
                onClick={() => setPastVisitsTab('history')}
                className={`px-2 py-1 text-xs border rounded ${
                  pastVisitsTab === 'history' ? 'bg-primary text-white' : 'hover:bg-slate-50'
                }`}
                title="History"
              >
                H
              </button>
              <button
                onClick={() => setPastVisitsTab('vitals')}
                className={`px-2 py-1 text-xs border rounded ${
                  pastVisitsTab === 'vitals' ? 'bg-primary text-white' : 'hover:bg-slate-50'
                }`}
                title="Vitals"
              >
                V
              </button>
              <button
                onClick={() => setPastVisitsTab('records')}
                className={`px-2 py-1 text-xs border rounded relative ${
                  pastVisitsTab === 'records' ? 'bg-primary text-white' : 'hover:bg-slate-50'
                }`}
                title="Records"
              >
                R
                {pastRecords.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center">
                    {pastRecords.length > 9 ? '9+' : pastRecords.length}
                  </span>
                )}
              </button>
            </div>

            {/* See all link */}
            <div className="text-xs text-slate-600 mb-3">
              <Link to={`/patient-overview/${patientId}`} className="text-primary hover:underline">
                See all Past Visits {pastVisits.length > 0 && `[${pastVisits.length}]`}
              </Link>
            </div>

            {/* Tab Content */}
            {loadingPastData ? (
              <div className="text-xs text-slate-500 text-center py-4">Loading...</div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {pastVisitsTab === 'past' && (
                  <>
                    {pastPrescriptions.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-4">No past prescriptions</div>
                    ) : (
                      pastPrescriptions.map((visit, idx) => (
                        <div key={`past-${idx}`} className="border rounded p-2 space-y-1.5 hover:border-blue-300 transition">
                          {/* Header: Date + Copy Button */}
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-slate-700">
                              {new Date(visit.prescribed_date || visit.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                // Copy this prescription into current form
                                if (visit.chief_complaint) {
                                  const syms = visit.chief_complaint.split(',').map(s => s.trim()).filter(Boolean);
                                  setSymptoms(syms.map(s => ({ name: s, remarks: '' })));
                                }
                                if (visit.diagnoses && visit.diagnoses.length > 0) {
                                  setDiagnoses(visit.diagnoses);
                                } else if (visit.diagnosis) {
                                  setDiagnoses(visit.diagnosis.split(',').map(d => d.trim()).filter(Boolean));
                                }
                                if (visit.medications && visit.medications.length > 0) {
                                  const copiedMeds = visit.medications.map(med => ({
                                    name: med.medication_name || med.name || '',
                                    brand: med.medication_name || med.name || '',
                                    generic_name: med.generic_name || '',
                                    dosage: med.dosage || '',
                                    frequency: med.frequency || '',
                                    duration: med.duration || '',
                                    timing: translateTiming(med.timing, language) || med.timing || '',
                                    instructions: translateInstruction(med.instructions || med.notes || '', language) || med.instructions || med.notes || '',
                                    qty: med.quantity || '',
                                    type: med.type || 'medication',
                                    is_tapering: med.is_tapering || 0,
                                    tapering_schedule: med.tapering_schedule || []
                                  }));
                                  setMeds(copiedMeds);
                                }
                                if (visit.advice) setAdvice(visit.advice);
                                if (visit.follow_up_days) setFollowUp(prev => ({ ...prev, days: String(typeof visit.follow_up_days === 'object' ? (visit.follow_up_days?.days || '') : visit.follow_up_days || '') }));
                                if (visit.patient_notes) setPatientNotes(visit.patient_notes);
                                addToast('Prescription copied! Review and modify as needed.', 'success');
                              }}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition flex items-center gap-1"
                              title="Copy this prescription"
                            >
                              <FiCopy className="w-3 h-3" /> Copy
                            </button>
                          </div>

                          {/* Symptoms */}
                          {(visit.symptoms?.length > 0 || visit.chief_complaint) && (
                            <div className="flex items-start gap-1 text-xs">
                              <span className="shrink-0 w-4 h-4 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[9px] font-bold mt-0.5">S</span>
                              <span className="text-slate-600 leading-tight">
                                {visit.symptoms?.length > 0 ? visit.symptoms.join(', ') : visit.chief_complaint}
                              </span>
                            </div>
                          )}

                          {/* Diagnosis */}
                          {(visit.diagnoses?.length > 0 || visit.diagnosis) && (
                            <div className="flex items-start gap-1 text-xs">
                              <span className="shrink-0 w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[9px] font-bold mt-0.5">D</span>
                              <span className="text-slate-600 leading-tight">
                                {visit.diagnoses?.length > 0 ? visit.diagnoses.join(', ') : visit.diagnosis}
                              </span>
                            </div>
                          )}

                          {/* Medicines */}
                          {visit.medications && visit.medications.length > 0 && (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-xs">
                                <span className="shrink-0 w-4 h-4 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center text-[9px] font-bold">M</span>
                                <span className="font-medium text-slate-700">{visit.medications.filter(m => !m.type || m.type === 'medication').length} medicines</span>
                              </div>
                              {visit.medications.filter(m => !m.type || m.type === 'medication').map((med, mIdx) => (
                                <div key={`med-${mIdx}`} className="ml-5 text-[11px] text-slate-600 flex items-center gap-1">
                                  <span className="font-medium">{med.medication_name || med.name}</span>
                                  {med.frequency && <span className="text-slate-400">| {med.frequency}</span>}
                                  {med.duration && <span className="text-slate-400">| {med.duration}</span>}
                                </div>
                              ))}
                              {/* Injections */}
                              {visit.medications.filter(m => m.type === 'injection').length > 0 && (
                                <>
                                  <div className="flex items-center gap-1 text-xs mt-1">
                                    <span className="shrink-0 w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[9px] font-bold">I</span>
                                    <span className="font-medium text-slate-700">{visit.medications.filter(m => m.type === 'injection').length} injections</span>
                                  </div>
                                  {visit.medications.filter(m => m.type === 'injection').map((inj, iIdx) => (
                                    <div key={`inj-${iIdx}`} className="ml-5 text-[11px] text-slate-600">
                                      <span className="font-medium">{inj.medication_name || inj.name}</span>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          )}

                          {/* Advice preview */}
                          {visit.advice && (
                            <div className="flex items-start gap-1 text-xs">
                              <span className="shrink-0 w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[9px] font-bold mt-0.5">A</span>
                              <span className="text-slate-500 leading-tight line-clamp-2">{visit.advice}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}

                {pastVisitsTab === 'history' && (
                  <>
                    {pastVisits.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-4">No history available</div>
                    ) : (
                      pastVisits.slice(0, 5).map((visit, idx) => (
                        <div key={`history-${idx}`} className="border rounded p-2 space-y-1">
                          <div className="text-xs font-semibold">
                            {new Date(visit.appointment_date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-600">{visit.reason_for_visit || 'No reason specified'}</div>
                          {visit.notes && (
                            <div className="text-xs text-slate-500 italic">{visit.notes}</div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}

                {pastVisitsTab === 'vitals' && (
                  <>
                    {pastVitals.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-4">No vitals recorded</div>
                    ) : (
                      pastVitals.slice(0, 5).map((vital, idx) => (
                        <div key={`vital-${idx}`} className="border rounded p-2 space-y-1">
                          <div className="text-xs font-semibold">
                            {vital.date ? new Date(vital.date).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-xs text-slate-600">
                            {vital.value || 'No vitals data'}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {pastVisitsTab === 'records' && (
                  <>
                    {pastRecords.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-4">No records available</div>
                    ) : (
                      pastRecords.slice(0, 5).map((record, idx) => (
                        <div key={`record-${idx}`} className="border rounded p-2 space-y-1">
                          <div className="text-xs font-semibold">{record.record_title || record.record_type}</div>
                          <div className="text-xs text-slate-600">
                            {new Date(record.uploaded_date || record.created_at).toLocaleDateString()}
                          </div>
                          {record.description && (
                            <div className="text-xs text-slate-500 truncate">{record.description}</div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* Hidden printable region containing the Letterhead wrapper */}
      <div className="hidden print:block">
        <div ref={printRef}>
          {printFormat === 'A4' ? (
            <Suspense fallback={<div>Loading letterhead...</div>}>
              <Letterhead template={selectedTemplate} showLetterhead={printWithLetterhead}>
                <div>
                {patient && (
                <div style={{ marginBottom: 16, fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{patient.name}</div>
                      <div style={{ color: '#444' }}>
                        {`${patient.gender || ''} • ${patient.dob ? `${new Date(patient.dob).toLocaleDateString()} (${calculateAge(patient.dob)} yrs)` : ''} • ${patient.phone || ''}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>UHID: {patient.patient_id || ''}</div>
                      <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                        {new Date(meta.prescription_date).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })} • {meta.prescription_time}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(vitals.temp || vitals.height || vitals.bmi || vitals.weight || vitals.pulse) && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Vitals</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
                    {vitals.temp && <div>Temp: {vitals.temp}</div>}
                    {vitals.height && <div>Height: {vitals.height}</div>}
                    {vitals.bmi && <div>BMI: {vitals.bmi}</div>}
                    {vitals.weight && <div>Weight: {vitals.weight}</div>}
                    {vitals.pulse && <div>Pulse: {vitals.pulse}</div>}
                    {vitals.blood_pressure && <div>BP: {vitals.blood_pressure}</div>}
                    {vitals.spo2 && <div>SpO2: {vitals.spo2}%</div>}
                  </div>
                </div>
              )}

              {symptoms.length > 0 && (
                <div style={{ marginBottom: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>Symptoms: </span>
                  <span>{symptoms.map(s => {
                    const name = typeof s === 'object' ? s.name : s;
                    const remarks = typeof s === 'object' ? s.remarks : '';
                    return name + (remarks ? ` (${remarks})` : '');
                  }).join(', ')}</span>
                </div>
              )}

              {diagnoses.length > 0 && (
                <div style={{ marginBottom: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>Diagnosis: </span>
                  <span>{diagnoses.join(', ')}</span>
                </div>
              )}

              {meds.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Medications</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: '1px solid #ccc' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <th style={{ textAlign: 'center', border: '1px solid #ccc', padding: '6px 4px', width: '30px' }}>Sr.</th>
                        <th style={{ textAlign: 'left', border: '1px solid #ccc', padding: '6px 4px' }}>Medicine</th>
                        <th style={{ textAlign: 'center', border: '1px solid #ccc', padding: '6px 4px' }}>Frequency</th>
                        <th style={{ textAlign: 'left', border: '1px solid #ccc', padding: '6px 4px' }}>Timing</th>
                        <th style={{ textAlign: 'center', border: '1px solid #ccc', padding: '6px 4px' }}>Duration</th>
                        <th style={{ textAlign: 'center', border: '1px solid #ccc', padding: '6px 4px', width: '35px' }}>Qty</th>
                        <th style={{ textAlign: 'left', border: '1px solid #ccc', padding: '6px 4px' }}>Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meds.map((m, idx) => (
                        <React.Fragment key={`print-med-${idx}`}>
                          <tr>
                            <td style={{ border: '1px solid #ddd', padding: '6px 4px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #ddd', padding: '6px 4px' }}>
                              <div style={{ fontWeight: 600 }}>{m.brand || m.name}</div>
                              {m.composition && <div style={{ color: '#666', fontSize: 11 }}>{m.composition}</div>}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '6px 4px', textAlign: 'center' }}>{m.is_tapering ? 'Tapering' : m.frequency}</td>
                            <td style={{ border: '1px solid #ddd', padding: '6px 4px' }}>{translateTiming(m.timing, language)}</td>
                            <td style={{ border: '1px solid #ddd', padding: '6px 4px', textAlign: 'center' }}>{m.duration}</td>
                            <td style={{ border: '1px solid #ddd', padding: '6px 4px', textAlign: 'center' }}>{m.qty}</td>
                            <td style={{ border: '1px solid #ddd', padding: '6px 4px' }}>{translateInstruction(m.instructions, language)}</td>
                          </tr>
                          {m.is_tapering && m.tapering_schedule && m.tapering_schedule.length > 0 && (
                            <tr>
                              <td></td>
                              <td colSpan={6} style={{ border: '1px solid #ddd', padding: '4px 6px', backgroundColor: '#f5f0ff', fontSize: 11, color: '#5b21b6' }}>
                                <strong>Tapering: </strong>
                                {m.tapering_schedule.map((s, si) => (
                                  <span key={si}>{si > 0 && ' → '}{s.dose} {s.frequency} for {s.duration_days} day{s.duration_days !== 1 ? 's' : ''}</span>
                                ))}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Investigations: labAdvice + patient_notes if it starts with "Investigations:" */}
              {(() => {
                const notesIsInvestigation = patientNotes && /^investigations?:/i.test(patientNotes.trim());
                const investigationExtra = notesIsInvestigation ? patientNotes.replace(/^investigations?:\s*/i, '').trim() : '';
                if (!labAdvice && !investigationExtra) return null;
                return (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Investigations</div>
                    {labAdvice && <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{labAdvice}</div>}
                    {investigationExtra && <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginTop: labAdvice ? 4 : 0 }}>{investigationExtra}</div>}
                  </div>
                );
              })()}

              {/* Notes: only show patient_notes when it doesn't start with "Investigations:" */}
              {patientNotes && !/^investigations?:/i.test(patientNotes.trim()) && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{patientNotes}</div>
                </div>
              )}

              {labRemarks && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Lab Remarks</div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{labRemarks}</div>
                </div>
              )}

              {(advice || selectedAdvice.length > 0) && printOnPrescription && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Advice</div>
                  {advice && (
                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{advice}</div>
                  )}
                  {selectedAdvice.length > 0 && (
                    <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 16, fontSize: 13 }}>
                      {selectedAdvice.map((a, i) => (<li key={`print-adv-${i}`}>{a}</li>))}
                    </ul>
                  )}
                </div>
              )}

              {(followUp.days || followUp.date) && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Follow Up</div>
                  <div style={{ fontSize: 13 }}>
                    {(() => { const d = parseInt(followUp.days, 10); return d > 0 ? <>In {d} day(s){followUp.date ? ', ' : ''}</> : null; })()}
                    {followUp.date && <>on {new Date(followUp.date).toLocaleDateString()}</>}
                  </div>
                </div>
              )}
            </div>
          </Letterhead>
            </Suspense>
          ) : (
            <Suspense fallback={<div>Loading compact format...</div>}>
              <PrescriptionA5Format
              prescriptionData={{
                date: meta.prescription_date,
                prescription_id: meta.prescription_id,
                vitals: vitals,
                symptoms: symptoms,
                diagnosis: diagnoses,
                medications: meds,
                advice: advice,
                selectedAdvice: selectedAdvice
              }}
              patientData={{
                name: patient?.name,
                age: patient?.dob ? calculateAge(patient.dob) : 'N/A',
                gender: patient?.gender,
                phone: patient?.phone,
                patient_id: patient?.patient_id
              }}
              doctorData={{
                name: user?.name || 'Dr. Name',
                specialization: user?.specialization || ''
              }}
              clinicData={{
                name: 'Clinic Name',
                address: 'Clinic Address',
                phone: 'Clinic Phone'
              }}
            />
            </Suspense>
          )}
        </div>
      </div>

      {/* Specialty Selector Modal */}
      {showSpecialtySelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
              <Suspense fallback={<div className="p-6">Loading module...</div>}>
                <SpecialtySelector
                  patientData={{
                    age: patient?.dob ? calculateAge(patient.dob) : null,
                    weight: vitals.weight,
                    height: vitals.height,
                    ...patient
                  }}
                  onDataChange={handleSpecialtyDataChange}
                  onClose={() => setShowSpecialtySelector(false)}
                />
              </Suspense>
          </div>
        </div>
      )}

      {/* Lab Results Modal */}
      {showLabResultsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">Previous Lab Results</h2>
              <button
                onClick={() => setShowLabResultsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-6">
              {previousLabResults.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No previous lab results found</p>
              ) : (
                <div className="space-y-4">
                  {previousLabResults.map((result, idx) => (
                    <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{result.test_name || result.test}</h3>
                          <p className="text-sm text-gray-600">
                            Date: {new Date(result.date || result.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-sm rounded-full ${
                          result.status === 'completed' ? 'bg-green-100 text-green-800' :
                          result.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {result.status || 'Pending'}
                        </span>
                      </div>
                      {result.result && (
                        <div className="mt-2 p-3 bg-gray-50 rounded">
                          <p className="text-sm font-medium text-gray-700">Result:</p>
                          <p className="text-sm mt-1">{result.result}</p>
                        </div>
                      )}
                      {result.notes && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">{result.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowLabResultsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Symptoms Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Select Symptoms Template</h2>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {symptomsTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No templates available. Create templates in Settings.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {symptomsTemplates.map((template) => {
                    const templateSymptoms = Array.isArray(template.symptoms)
                      ? template.symptoms
                      : JSON.parse(template.symptoms || '[]');

                    return (
                      <div
                        key={template.id}
                        onClick={() => applySymptomTemplate(template)}
                        className="border rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{template.name}</h3>
                            {template.category && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                                {template.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {template.description && (
                          <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {templateSymptoms.slice(0, 4).map((symptom, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {symptom}
                            </span>
                          ))}
                          {templateSymptoms.length > 4 && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                              +{templateSymptoms.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Examination Findings Template Modal */}
      {showExaminationTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Examination Findings Templates</h2>
              <button
                onClick={() => setShowExaminationTemplateModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* Doctor's Custom Templates */}
              {customExamTemplates.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-blue-700 mb-2">Your Custom Templates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {customExamTemplates.map((template, idx) => (
                      <div
                        key={`custom-${idx}`}
                        className="border rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition relative group"
                      >
                        <div onClick={() => {
                          setGeneralExamination(template.general);
                          setSystemicExamination(template.systemic);
                          setShowExaminationTemplateModal(false);
                        }}>
                          <h3 className="font-semibold text-sm mb-1 text-blue-800">{template.name}</h3>
                          <p className="text-xs text-gray-600 line-clamp-2">{template.general}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = customExamTemplates.filter((_, i) => i !== idx);
                            setCustomExamTemplates(updated);
                            localStorage.setItem('custom_exam_templates', JSON.stringify(updated));
                            addToast('Template deleted', 'info');
                          }}
                          className="absolute top-1 right-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition text-sm px-1.5 py-0.5"
                          title="Delete template"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Templates */}
              <div>
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Default Templates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { name: 'Normal General Exam', general: 'Patient is conscious, oriented, afebrile. No pallor, icterus, cyanosis, clubbing, lymphadenopathy, edema.', systemic: 'CVS: S1S2 normal, no murmur. RS: Bilateral air entry equal, no added sounds. P/A: Soft, non-tender, no organomegaly. CNS: No focal neurological deficit.' },
                    { name: 'Fever Workup', general: 'Patient is febrile (temp recorded). Mild dehydration noted. No rash, no lymphadenopathy.', systemic: 'Throat: Congested. RS: Clear. P/A: Soft, no tenderness. No signs of meningeal irritation.' },
                    { name: 'Respiratory Exam', general: 'Patient appears comfortable at rest. Using accessory muscles - No. Cyanosis - No.', systemic: 'RS: Bilateral air entry present. Rhonchi/Crepitations heard in ___. Wheeze - Present/Absent. CVS: S1S2 normal.' },
                    { name: 'Abdominal Exam', general: 'Patient is conscious, oriented. No pallor, no icterus. Vital signs stable.', systemic: 'P/A: Soft/Distended, Tenderness in ___ quadrant. Bowel sounds: Present/Absent. No organomegaly. No guarding or rigidity.' },
                    { name: 'Cardiac Exam', general: 'Patient is comfortable at rest. JVP - Normal/Raised. Pedal edema - Present/Absent.', systemic: 'CVS: Apex beat in 5th ICS MCL. S1S2 heard. Murmur - Present/Absent. RS: Bilateral basal crepitations - Present/Absent.' },
                    { name: 'Musculoskeletal', general: 'Patient ambulatory. Gait - Normal/Antalgic. No obvious deformity.', systemic: 'Local examination: Swelling/Tenderness over ___. ROM - Limited/Full. Power - ___/5. Sensation intact.' },
                  ].map((template) => (
                    <div
                      key={template.name}
                      onClick={() => {
                        setGeneralExamination(template.general);
                        setSystemicExamination(template.systemic);
                        setShowExaminationTemplateModal(false);
                      }}
                      className="border rounded-lg p-3 hover:border-green-500 hover:bg-green-50 cursor-pointer transition"
                    >
                      <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                      <p className="text-xs text-gray-600 line-clamp-2">{template.general}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Current as Template */}
              {showSaveExamTemplate ? (
                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-gray-600 mb-2">Save Current Findings as Template</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border rounded text-sm"
                      placeholder="Template name..."
                      value={examTemplateName}
                      onChange={(e) => setExamTemplateName(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        if (!examTemplateName.trim()) { addToast('Enter template name', 'error'); return; }
                        if (!generalExamination && !systemicExamination) { addToast('Fill examination findings first', 'error'); return; }
                        const newTemplate = { name: examTemplateName, general: generalExamination, systemic: systemicExamination };
                        const updated = [...customExamTemplates, newTemplate];
                        setCustomExamTemplates(updated);
                        localStorage.setItem('custom_exam_templates', JSON.stringify(updated));
                        setExamTemplateName('');
                        setShowSaveExamTemplate(false);
                        addToast('Template saved', 'success');
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >Save</button>
                    <button
                      onClick={() => setShowSaveExamTemplate(false)}
                      className="px-3 py-2 border rounded text-sm hover:bg-gray-100"
                    >Cancel</button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex justify-between gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowSaveExamTemplate(true)}
                className="px-4 py-2 text-sm text-green-700 border border-green-300 rounded hover:bg-green-50"
                disabled={!generalExamination && !systemicExamination}
              >
                + Save Current as Template
              </button>
              <button
                onClick={() => setShowExaminationTemplateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lab Test Template Selector Modal */}
      {showLabTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {labParamFormTest ? `Fill Results: ${labParamFormTest.test_name}` : 'Select Lab Tests'}
              </h2>
              <button onClick={() => { setShowLabTemplateModal(false); setLabParamFormTest(null); setLabParamFormData([]); setLabSearchQuery(''); }} className="p-1 hover:bg-gray-100 rounded">
                <FiX size={20} />
              </button>
            </div>

            {/* Parameter Form View */}
            {labParamFormTest ? (
              <>
                <div className="overflow-y-auto flex-1 p-4">
                  <div className="mb-3 p-3 bg-purple-50 rounded-lg">
                    <div className="text-sm font-semibold text-purple-800">{labParamFormTest.test_name}</div>
                    <div className="text-xs text-purple-600">{labParamFormTest.category} | Sample: {labParamFormTest.sample_type || 'Blood'}</div>
                  </div>
                  {labParamLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading parameters...</div>
                  ) : labParamFormData.length > 0 ? (
                    <div className="border rounded overflow-hidden">
                      <div className="grid grid-cols-12 bg-gray-100 text-xs font-semibold text-gray-700 px-3 py-2 gap-2">
                        <span className="col-span-4">Parameter</span>
                        <span className="col-span-3">Result Value</span>
                        <span className="col-span-2">Unit</span>
                        <span className="col-span-3">Reference Range</span>
                      </div>
                      {labParamFormData.map((param, idx) => (
                        <div key={idx} className="grid grid-cols-12 px-3 py-2 text-sm border-t items-center gap-2">
                          <div className="col-span-4">
                            <div className="text-xs font-medium">{param.parameter_name}</div>
                            {param.short_name && param.short_name !== param.parameter_name && (
                              <div className="text-[10px] text-gray-400">{param.short_name}</div>
                            )}
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 border rounded text-xs focus:ring-1 focus:ring-purple-400 focus:border-purple-400"
                              placeholder="Enter value"
                              value={param.result_value || ''}
                              onChange={(e) => {
                                const updated = [...labParamFormData];
                                updated[idx].result_value = e.target.value;
                                setLabParamFormData(updated);
                              }}
                            />
                          </div>
                          <span className="col-span-2 text-xs text-gray-500">{param.unit || '-'}</span>
                          <span className="col-span-3 text-xs text-gray-500">{param.reference_range || '-'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500 text-sm mb-3">No predefined parameters for this test.</p>
                      <div className="max-w-xs mx-auto">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Enter Result Value</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded text-sm focus:ring-1 focus:ring-purple-400"
                          placeholder="Result value"
                          value={labParamFormTest.result_value || ''}
                          onChange={(e) => setLabParamFormTest(prev => ({ ...prev, result_value: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between gap-3 p-4 border-t bg-gray-50">
                  <button
                    type="button"
                    onClick={() => { setLabParamFormTest(null); setLabParamFormData([]); }}
                    className="px-4 py-2 border rounded hover:bg-gray-100 text-sm"
                  >
                    ← Back to Tests
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const entry = {
                        test_name: labParamFormTest.test_name,
                        test_code: labParamFormTest.test_code,
                        result_value: labParamFormTest.result_value || '',
                        result_unit: labParamFormTest.unit || '',
                        reference_range: labParamFormTest.reference_range || '',
                        category: labParamFormTest.category || '',
                        sample_type: labParamFormTest.sample_type || '',
                        lab_template_id: labParamFormTest.id,
                        parameters: labParamFormData.filter(p => p.result_value).map(p => ({
                          parameter_name: p.parameter_name,
                          loinc_num: p.loinc_num,
                          result_value: p.result_value,
                          unit: p.unit || '',
                          reference_range: p.reference_range || ''
                        }))
                      };
                      // Immediately save to DB so it persists and syncs with Patient Overview
                      try {
                        const resp = await api.post(`/api/labs/${patientId}`, {
                          test_name: entry.test_name,
                          result_value: entry.result_value,
                          result_unit: entry.result_unit,
                          reference_range: entry.reference_range,
                          test_category: entry.category || 'GENERAL',
                          result_date: new Date().toISOString().split('T')[0],
                          report_group: 'Prescription'
                        });
                        entry.id = resp.data.id;
                      } catch (err) {
                        console.error('Failed to immediately save lab result:', err);
                      }
                      setLabResultEntries(prev => [...prev, entry]);
                      addToast(`${labParamFormTest.test_name} added with results`, 'success');
                      setLabParamFormTest(null);
                      setLabParamFormData([]);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  >
                    Add to Prescription
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Search and Category Filter */}
                <div className="p-4 border-b space-y-3">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded text-sm focus:ring-1 focus:ring-purple-400"
                    placeholder="Search lab tests by name or code..."
                    value={labSearchQuery}
                    onChange={(e) => setLabSearchQuery(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLabCategory('')}
                      className={`px-3 py-1 text-xs rounded-full border transition ${!selectedLabCategory ? 'bg-purple-600 text-white border-purple-600' : 'hover:bg-purple-50 border-gray-300'}`}
                    >
                      All
                    </button>
                    {labTemplateCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedLabCategory(cat)}
                        className={`px-3 py-1 text-xs rounded-full border transition ${selectedLabCategory === cat ? 'bg-purple-600 text-white border-purple-600' : 'hover:bg-purple-50 border-gray-300'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Test List */}
                <div className="overflow-y-auto flex-1 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {labTemplates
                      .filter(t => !selectedLabCategory || t.category === selectedLabCategory)
                      .filter(t => !labSearchQuery || t.test_name.toLowerCase().includes(labSearchQuery.toLowerCase()) || (t.test_code && t.test_code.toLowerCase().includes(labSearchQuery.toLowerCase())))
                      .slice(0, 150)
                      .map(t => {
                        const alreadyAdded = labResultEntries.some(e => e.test_name === t.test_name);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={async () => {
                              if (alreadyAdded) return;
                              // Fetch parameters for this test
                              setLabParamLoading(true);
                              setLabParamFormTest(t);
                              try {
                                const res = await api.get(`/api/lab-templates/${t.id}/parameters`);
                                const params = res.data.parameters || [];
                                setLabParamFormData(params.map(p => ({ ...p, result_value: '' })));
                              } catch (err) {
                                console.error('Failed to fetch parameters:', err);
                                setLabParamFormData([]);
                              }
                              setLabParamLoading(false);
                            }}
                            disabled={alreadyAdded}
                            className={`text-left p-2 border rounded text-sm transition ${
                              alreadyAdded ? 'bg-green-50 border-green-300 opacity-60' : 'hover:bg-purple-50 hover:border-purple-300'
                            }`}
                          >
                            <div className="font-medium text-xs">{t.test_name}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {t.category && <span className="text-purple-600">{t.category}</span>}
                              {t.sample_type && <span> · {t.sample_type}</span>}
                            </div>
                            {alreadyAdded && <span className="text-[10px] text-green-600">✓ Added</span>}
                          </button>
                        );
                      })}
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
                  <button
                    onClick={() => { setShowLabTemplateModal(false); setLabSearchQuery(''); }}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upload File Modal for Lab Results & Medical Records */}
      {showRecordUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Upload File</h2>
              <button onClick={() => setShowRecordUploadModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!recordUploadForm.file) { addToast('Please select a file', 'error'); return; }
              if (!recordUploadForm.name.trim()) { addToast('Please enter a record name', 'error'); return; }
              setRecordUploadLoading(true);
              try {
                const formData = new FormData();
                formData.append('file', recordUploadForm.file);
                formData.append('name', recordUploadForm.name);
                formData.append('category', recordUploadForm.category);
                if (recordUploadForm.description) formData.append('description', recordUploadForm.description);
                const parsedId = parseInt(meta.patient_id || patientId);
                if (parsedId) {
                  await api.post(`/api/patient-data/records/${parsedId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                }
                setPrescriptionRecords(prev => [...prev, { name: recordUploadForm.name, category: recordUploadForm.category, description: recordUploadForm.description, file: recordUploadForm.file.name }]);
                addToast('Record uploaded successfully', 'success');
                setShowRecordUploadModal(false);
                setRecordUploadForm({ name: '', category: 'OTHERS', description: '', file: null });
              } catch (error) {
                console.error('Upload error:', error);
                addToast(error.response?.data?.error || 'Failed to upload record', 'error');
              } finally {
                setRecordUploadLoading(false);
              }
            }} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Record Name *</label>
                <input type="text" className="w-full px-3 py-2 border rounded" value={recordUploadForm.name} onChange={(e) => setRecordUploadForm({ ...recordUploadForm, name: e.target.value })} placeholder="e.g., Blood Test Report" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="w-full px-3 py-2 border rounded" value={recordUploadForm.category} onChange={(e) => setRecordUploadForm({ ...recordUploadForm, category: e.target.value })}>
                  <option value="OTHERS">Others</option>
                  <option value="BLOOD_TEST">Blood Test</option>
                  <option value="X_RAY">X-Ray</option>
                  <option value="MRI">MRI</option>
                  <option value="CT_SCAN">CT Scan</option>
                  <option value="ULTRASOUND">Ultrasound</option>
                  <option value="ECG">ECG</option>
                  <option value="PRESCRIPTION">Prescription</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                <input type="file" className="w-full px-3 py-2 border rounded" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setRecordUploadForm({ ...recordUploadForm, file: e.target.files[0] })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="w-full px-3 py-2 border rounded" rows={2} value={recordUploadForm.description} onChange={(e) => setRecordUploadForm({ ...recordUploadForm, description: e.target.value })} placeholder="Optional description..." />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowRecordUploadModal(false)} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100">Cancel</button>
                <button type="submit" disabled={recordUploadLoading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                  {recordUploadLoading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Record Modal for Lab Results & Medical Records */}
      {showAddRecordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Add Record</h2>
              <button onClick={() => setShowAddRecordModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!manualRecordForm.name.trim()) { addToast('Please enter a record name', 'error'); return; }
              setPrescriptionRecords(prev => [...prev, { name: manualRecordForm.name, category: manualRecordForm.category, description: manualRecordForm.description, date: manualRecordForm.date }]);
              addToast('Record added', 'success');
              setShowAddRecordModal(false);
              setManualRecordForm({ name: '', category: 'OTHERS', description: '', date: new Date().toISOString().split('T')[0] });
            }} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Record Name *</label>
                <input type="text" className="w-full px-3 py-2 border rounded" value={manualRecordForm.name} onChange={(e) => setManualRecordForm({ ...manualRecordForm, name: e.target.value })} placeholder="e.g., CBC Report" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="w-full px-3 py-2 border rounded" value={manualRecordForm.category} onChange={(e) => setManualRecordForm({ ...manualRecordForm, category: e.target.value })}>
                  <option value="OTHERS">Others</option>
                  <option value="BLOOD_TEST">Blood Test</option>
                  <option value="X_RAY">X-Ray</option>
                  <option value="MRI">MRI</option>
                  <option value="CT_SCAN">CT Scan</option>
                  <option value="ULTRASOUND">Ultrasound</option>
                  <option value="ECG">ECG</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" className="w-full px-3 py-2 border rounded" value={manualRecordForm.date} onChange={(e) => setManualRecordForm({ ...manualRecordForm, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="w-full px-3 py-2 border rounded" rows={2} value={manualRecordForm.description} onChange={(e) => setManualRecordForm({ ...manualRecordForm, description: e.target.value })} placeholder="Optional notes..." />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddRecordModal(false)} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diagnosis Template Selector Modal */}
      {showDiagnosisTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Select Diagnosis Template</h2>
              <button
                onClick={() => setShowDiagnosisTemplateSelector(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {diagnosisTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No templates available. Create templates in Settings.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {diagnosisTemplates.map((template) => {
                    const templateDiagnoses = Array.isArray(template.diagnoses)
                      ? template.diagnoses
                      : JSON.parse(template.diagnoses || '[]');

                    return (
                      <div
                        key={template.id}
                        onClick={() => applyDiagnosisTemplate(template)}
                        className="border rounded-lg p-3 hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{template.name}</h3>
                            {template.category && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                                {template.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {template.description && (
                          <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {templateDiagnoses.slice(0, 4).map((diagnosis, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {diagnosis}
                            </span>
                          ))}
                          {templateDiagnoses.length > 4 && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                              +{templateDiagnoses.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowDiagnosisTemplateSelector(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medications Template Selector Modal */}
      {showMedicationsTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Select Medications Template</h2>
              <button
                onClick={() => setShowMedicationsTemplateSelector(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {medicationsTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No templates available. Create templates in Settings.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {medicationsTemplates.map((template) => {
                    const templateMeds = Array.isArray(template.medications)
                      ? template.medications
                      : JSON.parse(template.medications || '[]');

                    return (
                      <div
                        key={template.id}
                        onClick={() => applyMedicationsTemplate(template)}
                        className="border rounded-lg p-3 hover:border-pink-500 hover:bg-pink-50 cursor-pointer transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{template.name}</h3>
                            {template.category && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-pink-100 text-pink-800 rounded">
                                {template.category}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm('Delete this template?')) return;
                              try {
                                await api.delete(`/api/medications-templates/${template.id}`);
                                setMedicationsTemplates(prev => prev.filter(t => t.id !== template.id));
                                addToast('Template deleted', 'success');
                              } catch (err) {
                                addToast('Failed to delete template', 'error');
                              }
                            }}
                            className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                            title="Delete template"
                          >
                            <FiX size={14} />
                          </button>
                        </div>

                        {template.description && (
                          <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                        )}

                        <div className="space-y-1">
                          {templateMeds.slice(0, 3).map((med, idx) => (
                            <div key={idx} className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-1">
                              <div className="font-medium">{med.brand || med.brand_name || med.name || med.medication_name}</div>
                              {(med.frequency || med.duration) && (
                                <div className="text-gray-600">
                                  {med.frequency} {med.duration && `• ${med.duration}`}
                                </div>
                              )}
                            </div>
                          ))}
                          {templateMeds.length > 3 && (
                            <div className="text-xs text-gray-600 text-center py-1">
                              +{templateMeds.length - 3} more medications
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowMedicationsTemplateSelector(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medication Suggestion Modal */}
      {showMedicationSuggestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">💊 Suggested Medications</h3>
              <button
                onClick={() => {
                  setShowMedicationSuggestionModal(false);
                  setPendingMedicationSuggestions([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600">
                Select medications you want to add to the prescription. Duplicates have been filtered out.
              </p>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {pendingMedicationSuggestions.map((med, idx) => (
                  <label key={`med-${idx}-${med.name}`} className="flex items-start gap-3 p-3 border rounded hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={true}
                      className="mt-1"
                      id={`med-check-${idx}`}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{med.brand || med.name}</div>
                      <div className="text-sm text-gray-600">{med.strength} {med.dosage_form}</div>
                      {med.frequency && (
                        <div className="text-xs text-gray-500 mt-1">
                          Frequency: {med.frequency}
                        </div>
                      )}
                      {med.duration && (
                        <div className="text-xs text-gray-500">
                          Duration: {med.duration}
                        </div>
                      )}
                      {med.instructions && (
                        <div className="text-xs text-blue-600 mt-1 font-medium">
                          💡 {med.instructions}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {pendingMedicationSuggestions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No medications to suggest
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowMedicationSuggestionModal(false);
                  setPendingMedicationSuggestions([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  // Get all checked medications
                  const selectedMeds = [];
                  pendingMedicationSuggestions.forEach((med, idx) => {
                    const checkbox = document.getElementById(`med-check-${idx}`);
                    if (checkbox && checkbox.checked) {
                      selectedMeds.push(med);
                    }
                  });
                  handleAcceptMedicationSuggestions(selectedMeds);
                }}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 font-medium"
              >
                Add Selected ({pendingMedicationSuggestions.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save as Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Save as Template</h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Asthma Management"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Name *
                </label>
                <input
                  type="text"
                  value={templateShortName}
                  onChange={(e) => setTemplateShortName(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Asthma"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Respiratory, Cardiac"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>

              <div className="bg-gray-50 p-3 rounded text-xs">
                <p className="font-medium mb-1">📋 Template will save with:</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• <span className="font-medium">{meds.length}</span> medicines</li>
                  <li>• <span className="font-medium">{symptoms.length}</span> symptoms</li>
                  <li>• <span className="font-medium">{diagnoses.length}</span> diagnoses</li>
                  <li>• Advice & precautions</li>
                  <li>• Follow-up: {(typeof followUp.days === 'object' ? '' : followUp.days) || 'Not set'} days</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveAsTemplate}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 font-medium"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}