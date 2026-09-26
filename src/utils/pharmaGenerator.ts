import { Medicine, Batch, MedicineType, InventoryCategory } from '../types';

export const ALPHABETS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Comprehensive Indian pharmaceutical brand prefixes categorized by exact starting letter
export const LETTER_BRANDS: Record<string, string[]> = {
  A: [
    'Augmentin', 'Azithral', 'Ascoril', 'Atropine', 'Acivir', 'Asthalin', 'Atorva', 'Amlokind',
    'Allegra', 'Althrocin', 'Aristozyme', 'Aciloc', 'Albendazole', 'Amikacin', 'Aceclo', 'Avil',
    'Actrapid', 'Acarbose', 'Anafortan', 'Alkof', 'Alex', 'Ambrodil', 'Amlovas', 'Alerid',
    'Asthakind', 'Aldactone', 'Ampicillin', 'Aptivate', 'Arkamin', 'Avastin', 'Azacitidine', 'Azathioprine'
  ],
  B: [
    'Betaloc', 'Benadryl', 'Betadine', 'Bimatoprost', 'Becosules', 'Budecort', 'Burnol', 'Bactrim',
    'Bilasure', 'Brufen', 'Buscopan', 'B-Long', 'Bio-D3', 'Bepotastine', 'Brimodin', 'Bepanthen',
    'Beclate', 'B-Complex', 'Bro-Zedex', 'Bilamid', 'Biltricide', 'Buminate', 'Bactoclav', 'Bifilac',
    'Bricanyl', 'Baclosign', 'Bleomycin', 'Bortezomib', 'Brinzolamide', 'Budeson', 'Bupron', 'Biovac'
  ],
  C: [
    'Calpol', 'Chericof', 'Ciplox', 'Candid-B', 'Cifran', 'Cetzine', 'Clavam', 'Combiflam',
    'Corex', 'Clexane', 'Cremaffin', 'Cosome', 'Ceftum', 'Cipcal', 'Cardivas', 'Concor',
    'Clonafit', 'Cyclopam', 'Chymoral', 'Cilacar', 'Cefix', 'Cobadex', 'Celin', 'Carmicide',
    'Ceftriaxone', 'Cipmox', 'Colimex', 'Cheston-Cold', 'Clexane', 'Cariplus', 'Cital', 'Clofert'
  ],
  D: [
    'Dolo', 'Duphalac', 'Dorzox', 'Diclofenac', 'Digene', 'Deriphyllin', 'Deplatt', 'Dulcolax',
    'Domstal', 'Drotin', 'Dynapar', 'Defcort', 'Daonil', 'Diane', 'Doxinate', 'Duolin',
    'Dexona', 'Doxicip', 'Dilzem', 'Dytor', 'Duloflex', 'Dom-DT', 'Diapride', 'Dolopar',
    'Doxolin', 'Drotikind', 'Doxorubicin', 'Decapeptyl', 'Dienogest', 'Dabigatran', 'Duvadilan', 'Dapavel'
  ],
  E: [
    'Eltroxin', 'Emeset', 'Eye-Mist', 'Erythromycin', 'Eldoper', 'Econorm', 'Ebercon', 'Envas',
    'Ecosprin', 'Evion', 'Enterogermina', 'Eliquis', 'Enoxaparin', 'Etoshine', 'Ebast', 'Esomac',
    'Esoran', 'E-Cod', 'Enzoflam', 'Ezedoc', 'Epilan', 'Esofag', 'Erytop', 'Etova',
    'Extacef', 'Entresto', 'Eptoin', 'Empagliflozin', 'Exermet', 'Encorate', 'Erlotinib', 'Esmolol'
  ],
  F: [
    'Febrex', 'Foristal', 'Flurbiprofen', 'Fucidin', 'Flagyl', 'Fastum', 'Fourderm', 'Foracort',
    'Febutaz', 'Faronem', 'Flavedon', 'Finast', 'Fole', 'Fucibet', 'Factive', 'Flohale',
    'Fevastin', 'Folvite', 'Flunarin', 'Furamide', 'Faropenem', 'Febrex-Plus', 'Flomist', 'Flexura',
    'Febrex-DS', 'Fluticasone', 'Fondaparinux', 'Fulvestrant', 'Folic-Acid', 'Famocid', 'Furosemide', 'Fusiderm'
  ],
  G: [
    'Glycomet', 'Gelusil', 'Gatifloxacin', 'Gentamicin', 'Grilinctus', 'Gudcef', 'Gabapin', 'Gemer',
    'Glybovin', 'Glucored', 'Glynase', 'Galvus', 'Gantin', 'Gestone', 'Gynaset', 'Gaviscon',
    'Gemcal', 'Glychek', 'Glucobay', 'Gris-OD', 'Glyzid', 'Gatiflox', 'Gastro-D', 'Gabaneuron',
    'Gudcef-Plus', 'Glimepiride', 'Gliclazide', 'Ganciclovir', 'Gefitinib', 'Gemcitabine', 'Goniovisc', 'Granisetron'
  ],
  H: [
    'Hifenac-P', 'Honitus', 'Homatropine', 'Hydrocortisone', 'Humalog', 'Himalaya-Kof', 'Human-Mixtard', 'Hepamerz',
    'Hyocimax', 'Haloperidol', 'H-Cort', 'Histac', 'Heptral', 'H-Tears', 'Hepsave', 'Hydroheal',
    'Hucog', 'Hyzaar', 'Hapenz', 'Haem-Up', 'Helminthox', 'Hydrochlor', 'Haldol', 'Hepa-Merz',
    'Homatrop', 'Hydroxyzine', 'Hyoscine', 'Hydralazine', 'Human-Insulatard', 'Heparin', 'Histafree', 'Hexidine'
  ],
  I: [
    'Ibugesic', 'Icarus', 'Itone', 'Iruxol', 'Itraconazole', 'Indocap', 'Ivabrad', 'Imol',
    'I-Site', 'I-Dew', 'Ismo', 'Ictammol', 'Insulatard', 'Itraspor', 'Iverpect', 'Ivermect',
    'Itrazole', 'I-Kul', 'Isordil', 'Inderal', 'Ivil-C', 'Insuget', 'Intagesic', 'Inmec',
    'Ibuprofen', 'Imatinib', 'Irinotecan', 'Ipratropium', 'Isoflurane', 'Irbesartan', 'Isotretinoin', 'Itopride'
  ],
  J: [
    'Januvia', 'Junior-Lanzol', 'Just-Tears', 'Juviseal', 'Jalra', 'Jardiance', 'Janumet', 'Jovial',
    'Jovia', 'Jiffy', 'Joykem', 'Jelusil', 'Jupiros', 'Juvocip', 'Joydol', 'Juvi-D3',
    'J-Flox', 'J-Cold', 'Jupipod', 'Janu-Met', 'J-Cef', 'J-Zole', 'J-Derm', 'J-Gest',
    'Jardiance-Duo', 'Jardiamet', 'Jylora', 'Jurnista', 'Javlor', 'Jamp', 'Jubilant-D', 'Junia'
  ],
  K: [
    'Ketorol', 'Koflet', 'Ketorolac', 'Kenacort', 'Kefpod', 'Klaricid', 'K-Bind', 'K-Cit',
    'Ketofly', 'Klacid', 'Kineto', 'Ketanov', 'Keraglo', 'Kenz', 'K-Pro', 'K-Sol',
    'Keto-Z', 'Kof-Care', 'Kavit', 'Kalium', 'K-Cort', 'Ketomac', 'Kofarest', 'Ketomesh',
    'Kanamycin', 'Ketoprofen', 'Ketoconazole', 'Klofen', 'Kalydeco', 'Kivexa', 'Kymriah', 'Kyprolis'
  ],
  L: [
    'Levocet', 'Liv-52', 'Loteprednol', 'Lulifin', 'Losar', 'Limcee', 'Lasix', 'Lipaglyn',
    'Livogen', 'Lonazep', 'Lanzol', 'Lupisulin', 'Levipil', 'Lobun', 'Lariago', 'Lulican',
    'Lopamide', 'Lorfast', 'Linid', 'Lucent', 'Lacarnit', 'Lulibet', 'Lariago-DS', 'Levaquin',
    'Levoflox', 'Lactulose', 'Linezolid', 'Liraglutide', 'Lenalidomide', 'Letrozole', 'Levosulpiride', 'Lamotrigine'
  ],
  M: [
    'Montair', 'Mucaine', 'Moxicip', 'Mupirocin', 'Moov', 'Metrogyl', 'Monocef', 'Meronem',
    'Meftal-Spas', 'Moxikind-CV', 'Macbery', 'Mifepristone', 'Mixtard', 'Micos', 'Monotrate', 'Mycobutol',
    'Medrol', 'Moxovas', 'M-Sol', 'Meganeuron', 'Monticope', 'Mucolite', 'Moxikind', 'Minipress',
    'Metformin', 'Methotrexate', 'Methylcobalamin', 'Meropenem', 'Midazolam', 'Morphine', 'Modafinil', 'Mycophenolate'
  ],
  N: [
    'Nise', 'Nor-Metrogyl', 'Natamycin', 'Neosporin', 'Nasivion', 'Neurobion', 'Nebicard', 'Nexpro',
    'Nurokind-LC', 'Norflox-TZ', 'Nimodip', 'Novomix', 'Nadifloxacin', 'Neksium', 'Nicardia', 'Nurozox',
    'Nimesulide', 'Niftas', 'Nise-Gel', 'Nifetab', 'Nuroday', 'Nebistol', 'Normax', 'Novorapid',
    'Naloxone', 'Nicergoline', 'Nifedipine', 'Nitrofurantoin', 'Nitroglycerin', 'Nortriptyline', 'Nystatin', 'Nintedanib'
  ],
  O: [
    'Omez', 'Ondem', 'Olopatadine', 'Omnigel', 'Oflox', 'Otrivin', 'Omnacortil', 'Ovral-L',
    'Ornida', 'Ocid', 'Oflotas', 'Olmezest', 'Orofer-XT', 'Onbrez', 'Optive', 'Oxytetracycline',
    'One-Alpha', 'O-Ceft', 'Ornilox', 'O-Dry', 'Oxra', 'Ocuvir', 'Oframax', 'Ocupol',
    'Omeprazole', 'Ondansetron', 'Oseltamivir', 'Oxaliplatin', 'Oxycodone', 'Octreotide', 'Olanzapine', 'Oxcarbazepine'
  ],
  P: [
    'Pan', 'P-650', 'Prednisolone', 'Povidone', 'Pantocid', 'Pregabalin', 'Panderm', 'Piptaz',
    'Polybion', 'Primolut-N', 'Pulmicort', 'Pantosec', 'Phensedyl', 'Puran-T4', 'Pacitane', 'Peg-Tears',
    'Prolomet', 'P-Cold', 'Paracip', 'Pyregesic', 'Pantodac', 'Plavix', 'Prebaxe', 'Proctosedyl',
    'Paracetamol', 'Pantoprazole', 'Paclitaxel', 'Pemetrexed', 'Piperacillin', 'Posaconazole', 'Propranolol', 'Pramipexole'
  ],
  Q: [
    'Qutipin', 'Q-Tus', 'Quinolex', 'Quadriderm', 'Q-Derm', 'Quetiapine', 'Quinapril', 'Q-Coenz',
    'Quflora', 'Quick-Gel', 'Q-Flox', 'Q-Heal', 'Q-Relief', 'Q-Zole', 'Q-Cal', 'Q-Tears',
    'Quinidine', 'Q-Mont', 'Q-Cet', 'Q-Beta', 'Q-Gud', 'Q-Dox', 'Q-Cold', 'Quinn',
    'Quinine', 'Quinol', 'Q-Ten', 'Q-Rest', 'Q-Sleep', 'Q-Tone', 'Q-Flex', 'Q-Gyl'
  ],
  R: [
    'Rablet', 'Radicool', 'Refresh-Tears', 'Relispray', 'Rozavel', 'R-Loc', 'Rantac', 'Rosuvas',
    'Ryzodeg', 'Revital', 'Rinostat', 'Regestrone', 'Reswas', 'Rifaximin', 'Riconia', 'Rabicip',
    'Roseday', 'Razo', 'R-Cine', 'Renocrit', 'Rablet-IT', 'Restyl', 'Rosuvas-F', 'Rabemac',
    'Ranitidine', 'Rabeprazole', 'Ramipril', 'Rifampicin', 'Rituximab', 'Rocuronium', 'Ropinirole', 'Risperidone'
  ],
  S: [
    'Shelcal', 'Solvin-Cold', 'Systane', 'Soframycin', 'Silverex', 'Sinarest', 'Starpress', 'Supradyn',
    'Stamlo', 'Storvas', 'Serlift', 'Susten', 'Siloderm', 'Skinlite', 'Stemetil', 'Septran',
    'SBL-Kof', 'Sucrafil', 'Solu-Medrol', 'S-Amlosafe', 'S-Numlo', 'Seretide', 'Supradyn-Daily', 'Sompraz',
    'Salbutamol', 'Sitagliptin', 'Spironolactone', 'Streptokinase', 'Sertraline', 'Sildenafil', 'Sofosbuvir', 'Somatostatin'
  ],
  T: [
    'Telma', 'T-Koff', 'Tobramycin', 'Terbinaforce', 'Taxim-O', 'Thyronorm', 'Theo-Asthalin', 'Trajenta',
    'Tryptomer', 'Teneligliptin', 'Tazomac', 'Triglynase', 'T-Bact', 'Topcef', 'Torsemide', 'Telsartan',
    'Tetralysal', 'Tebif', 'T-Minic', 'Telpres', 'Tri-Vobose', 'Terbicip', 'Trigan-D', 'T-Flox',
    'Telmisartan', 'Tramadol', 'Tigecycline', 'Tenofovir', 'Tamoxifen', 'Tacrolimus', 'Tamsulosin', 'Ticagrelor'
  ],
  U: [
    'Ultracet', 'Uphaar', 'Ultra-Tears', 'Unguentum', 'Uprise-D3', 'Udiliv', 'Ursobil', 'Urimax',
    'Unwanted-72', 'Ultravist', 'Urocontin', 'Ubi-Q', 'U-Lac', 'Uriliser', 'U-Flox', 'U-Cura',
    'U-Gyl', 'Ulcerone', 'U-Gud', 'Ursochol', 'Unienzyme', 'Uromax', 'Ulgel', 'Urospas',
    'Ursodeoxycholic', 'Urapidil', 'Urofollitropin', 'Ulinastatin', 'Ustekinumab', 'Urapidil', 'Unasyn', 'Urifast'
  ],
  V: [
    'Voveran', 'Ventryl', 'Vigamox', 'Volini', 'Vomistop', 'Vizylac', 'Vermox', 'Valparin',
    'Vildagliptin', 'Vertin', 'Vitamin-C', 'V-Gel', 'Veloz', 'Vosol', 'Veltam', 'Vaxirab',
    'V-Gain', 'Vitcofol', 'V-Bact', 'Vomistop-DT', 'Voveran-SR', 'Vildaprime', 'Vomikind', 'Vozet',
    'Vancomycin', 'Valsartan', 'Verapamil', 'Voriconazole', 'Vincristine', 'Vinblastine', 'Valganciclovir', 'Voglibose'
  ],
  W: [
    'Wikoryl', 'Welkof-DX', 'Winolap', 'Wartnil', 'Wosulin', 'Waxolve', 'Wymesone', 'Wysolone',
    'Wokadine', 'Wellmune', 'Wonder-Cold', 'W-Derm', 'W-Flox', 'Waxon', 'W-Cef', 'Walacort',
    'W-Gest', 'W-Tears', 'Wintogeno', 'Welmox', 'Wormin', 'Wepox', 'Wax-Drop', 'Wound-Heal',
    'Warfarin', 'Water-For-Injection', 'Wockhardt-Insulin', 'Welkof-LS', 'Wax-Off', 'W-Dox', 'W-Zole', 'W-Mont'
  ],
  X: [
    'Xyzal', 'Xpect-B', 'Xalatan', 'Xylocaine', 'Xylometazoline', 'Xifaxan', 'Xarelto', 'Xylomet',
    'Xylocard', 'X-Cept', 'X-Trine', 'X-Cold', 'Xyloprim', 'X-Flox', 'X-Bact', 'X-Gud',
    'Xylin', 'X-Cort', 'Xylone', 'Xopenex', 'X-Mox', 'Xylotears', 'X-Derm', 'Xyzal-M',
    'Xenical', 'Xgeva', 'Xalkori', 'Xtandi', 'Xolair', 'Xyloproct', 'Xanax', 'Xylid'
  ],
  Y: [
    'Yasmin', 'Y-Gut', 'Y-Drop', 'Yardley', 'Y-Cal', 'Yumit-Plus', 'Y-Flora', 'Y-Gast',
    'Y-Koff', 'Y-Derm', 'Y-Sleep', 'Y-Tone', 'Y-Bact', 'Y-Flox', 'Y-Cold', 'Y-Cef',
    'Y-Relief', 'Y-Vit', 'Y-Gud', 'Y-Zole', 'Y-Mont', 'Y-Gest', 'Y-Care', 'Yuvafem',
    'Yentreve', 'Yondelis', 'Yervoy', 'Yomesan', 'Yutopar', 'Y-Gest-SR', 'Y-Lax', 'Y-Tears'
  ],
  Z: [
    'Zerodol-SP', 'Zincovit', 'Zymar', 'Zole-F', 'Zifi', 'Zocon', 'Zantac', 'Zolpidem',
    'Zupar', 'Zyloric', 'Zepril', 'Zinetac', 'Zathrin', 'Zenflox', 'Zoclar', 'Zoryl',
    'Zinconia', 'Zolfresh', 'Zemet', 'Zecuf', 'Zevit', 'Zandu-Rhuma', 'Zantac-OD', 'Zilast',
    'Zidovudine', 'Zoledronic-Acid', 'Zopiclone', 'Zonisamide', 'Ziprasidone', 'Zileuton', 'Zuclopenthixol', 'Zaltoprofen'
  ]
};

const SUFFIX_MODIFIERS = [
  '', 'Forte', 'Plus', 'Duo', 'Max', 'SR', 'XR', 'CR', 'XL', 'ER', 'Gold',
  'Advance', 'Total', 'Ultra', 'Pro', 'Active', 'D', 'CZ', 'LS', 'AM', 'H', 'CT', 'Beta', 'T'
];

interface MoleculeProfile {
  name: string;
  type: MedicineType;
  strength: string;
  packSize: string;
  standardMrp: number;
  gstPercent: number;
}

const MOLECULE_PROFILES: MoleculeProfile[] = [
  // Tablets
  { name: 'Paracetamol IP', type: 'Tablet', strength: '650mg', packSize: '15 Tablets / Strip', standardMrp: 34, gstPercent: 12 },
  { name: 'Amoxicillin + Clavulanic Acid', type: 'Tablet', strength: '625mg', packSize: '10 Tablets / Strip', standardMrp: 205, gstPercent: 12 },
  { name: 'Pantoprazole Gastro-resistant', type: 'Tablet', strength: '40mg', packSize: '15 Tablets / Strip', standardMrp: 145, gstPercent: 12 },
  { name: 'Azithromycin IP', type: 'Tablet', strength: '500mg', packSize: '5 Tablets / Strip', standardMrp: 130, gstPercent: 12 },
  { name: 'Telmisartan Tablets IP', type: 'Tablet', strength: '40mg', packSize: '15 Tablets / Strip', standardMrp: 175, gstPercent: 12 },
  { name: 'Montelukast Sodium + Levocetirizine', type: 'Tablet', strength: '10mg/5mg', packSize: '10 Tablets / Strip', standardMrp: 180, gstPercent: 12 },
  { name: 'Metformin Hydrochloride Prolonged-Release', type: 'Tablet', strength: '500mg', packSize: '20 Tablets / Strip', standardMrp: 65, gstPercent: 12 },
  { name: 'Atorvastatin Calcium IP', type: 'Tablet', strength: '10mg', packSize: '10 Tablets / Strip', standardMrp: 155, gstPercent: 12 },
  { name: 'Amlodipine Besylate IP', type: 'Tablet', strength: '5mg', packSize: '15 Tablets / Strip', standardMrp: 45, gstPercent: 12 },
  { name: 'Ciprofloxacin Hydrochloride', type: 'Tablet', strength: '500mg', packSize: '10 Tablets / Strip', standardMrp: 85, gstPercent: 12 },
  { name: 'Cetirizine Hydrochloride IP', type: 'Tablet', strength: '10mg', packSize: '10 Tablets / Strip', standardMrp: 38, gstPercent: 12 },
  { name: 'Ibuprofen + Paracetamol', type: 'Tablet', strength: '400/325mg', packSize: '15 Tablets / Strip', standardMrp: 52, gstPercent: 12 },
  { name: 'Diclofenac Sodium Enteric-Coated', type: 'Tablet', strength: '50mg', packSize: '10 Tablets / Strip', standardMrp: 48, gstPercent: 12 },
  { name: 'Losartan Potassium IP', type: 'Tablet', strength: '50mg', packSize: '15 Tablets / Strip', standardMrp: 110, gstPercent: 12 },
  { name: 'Rosuvastatin IP', type: 'Tablet', strength: '10mg', packSize: '10 Tablets / Strip', standardMrp: 195, gstPercent: 12 },
  { name: 'Clopidogrel Bisulphate IP', type: 'Tablet', strength: '75mg', packSize: '15 Tablets / Strip', standardMrp: 140, gstPercent: 12 },
  { name: 'Glimepiride IP', type: 'Tablet', strength: '2mg', packSize: '15 Tablets / Strip', standardMrp: 88, gstPercent: 12 },
  { name: 'Rabeprazole Sodium Gastro-resistant', type: 'Tablet', strength: '20mg', packSize: '15 Tablets / Strip', standardMrp: 135, gstPercent: 12 },
  { name: 'Levofloxacin Hemihydrate', type: 'Tablet', strength: '500mg', packSize: '10 Tablets / Strip', standardMrp: 120, gstPercent: 12 },
  { name: 'Sitagliptin Phosphate Monohydrate', type: 'Tablet', strength: '100mg', packSize: '15 Tablets / Strip', standardMrp: 320, gstPercent: 12 },
  { name: 'Aceclofenac + Paracetamol + Serratiopeptidase', type: 'Tablet', strength: '100/325/15mg', packSize: '10 Tablets / Strip', standardMrp: 135, gstPercent: 12 },
  { name: 'Tramadol Hydrochloride + Paracetamol', type: 'Tablet', strength: '37.5/325mg', packSize: '10 Tablets / Strip', standardMrp: 160, gstPercent: 12 },
  { name: 'Levocetirizine Dihydrochloride', type: 'Tablet', strength: '5mg', packSize: '10 Tablets / Strip', standardMrp: 55, gstPercent: 12 },
  { name: 'Calcium Carbonate with Vitamin D3', type: 'Tablet', strength: '500mg', packSize: '15 Tablets / Strip', standardMrp: 135, gstPercent: 12 },
  { name: 'Ferrous Ascorbate + Folic Acid', type: 'Tablet', strength: '100/1.5mg', packSize: '10 Tablets / Strip', standardMrp: 175, gstPercent: 12 },
  
  // Syrups & Suspensions
  { name: 'Levosalbutamol + Ambroxol + Guaiphenesin Expectorant', type: 'Syrup', strength: '100ml', packSize: '100ml Bottle', standardMrp: 115, gstPercent: 12 },
  { name: 'Diphenhydramine HCl Cough Formula', type: 'Syrup', strength: '150ml', packSize: '150ml Bottle', standardMrp: 138, gstPercent: 12 },
  { name: 'Dextromethorphan + Chlorpheniramine Maleate', type: 'Syrup', strength: '100ml', packSize: '100ml Bottle', standardMrp: 110, gstPercent: 12 },
  { name: 'Lactulose Oral Solution USP', type: 'Syrup', strength: '200ml', packSize: '200ml Bottle', standardMrp: 295, gstPercent: 12 },
  { name: 'Ondansetron Hydrochloride Oral Solution', type: 'Syrup', strength: '2mg/5ml', packSize: '30ml Bottle', standardMrp: 42, gstPercent: 12 },
  { name: 'Magaldrate + Simethicone Antacid Gel', type: 'Syrup', strength: '200ml', packSize: '200ml Bottle', standardMrp: 145, gstPercent: 12 },
  { name: 'Paracetamol Paediatric Suspension', type: 'Suspension', strength: '250mg/5ml', packSize: '60ml Bottle', standardMrp: 48, gstPercent: 12 },
  { name: 'Multivitamin, Minerals & Zinc Tonic', type: 'Syrup', strength: '200ml', packSize: '200ml Bottle', standardMrp: 160, gstPercent: 18 },
  { name: 'Cefixime Oral Suspension IP', type: 'Suspension', strength: '100mg/5ml', packSize: '30ml Dry Syrup Bottle', standardMrp: 98, gstPercent: 12 },
  { name: 'Bacillus Clausii Probiotic Spores', type: 'Suspension', strength: '2 Billion/5ml', packSize: 'Mini Bottles (5ml x 10)', standardMrp: 280, gstPercent: 12 },

  // Drops (Eye / Ear / Nasal)
  { name: 'Carboxymethylcellulose Lubricant Eye Drops', type: 'Drops', strength: '0.5% w/v', packSize: '10ml Dropper Vial', standardMrp: 145, gstPercent: 12 },
  { name: 'Moxifloxacin Ophthalmic Solution', type: 'Drops', strength: '0.5% w/v', packSize: '5ml Dropper Vial', standardMrp: 185, gstPercent: 12 },
  { name: 'Tobramycin Ophthalmic Solution', type: 'Drops', strength: '0.3% w/v', packSize: '5ml Dropper Vial', standardMrp: 118, gstPercent: 12 },
  { name: 'Ciprofloxacin Eye & Ear Drops', type: 'Drops', strength: '0.3% w/v', packSize: '10ml Dropper Vial', standardMrp: 28, gstPercent: 12 },
  { name: 'Bimatoprost Glaucoma Eye Drops', type: 'Drops', strength: '0.03% w/v', packSize: '3ml Dropper Vial', standardMrp: 395, gstPercent: 12 },
  { name: 'Olopatadine Anti-Allergy Eye Drops', type: 'Drops', strength: '0.1% w/v', packSize: '5ml Dropper Vial', standardMrp: 165, gstPercent: 12 },
  { name: 'Xylometazoline Nasal Drops', type: 'Drops', strength: '0.1% w/v', packSize: '10ml Dropper Bottle', standardMrp: 75, gstPercent: 12 },

  // Ointments & Gels & Creams
  { name: 'Povidone Iodine Antiseptic Ointment', type: 'Ointment', strength: '5% w/w', packSize: '20g Lami Tube', standardMrp: 85, gstPercent: 12 },
  { name: 'Framycetin Sulphate Skin Ointment', type: 'Ointment', strength: '1% w/w', packSize: '30g Tube', standardMrp: 64, gstPercent: 12 },
  { name: 'Mupirocin Antibiotic Ointment IP', type: 'Ointment', strength: '2% w/w', packSize: '5g Tube', standardMrp: 170, gstPercent: 12 },
  { name: 'Diclofenac Diethylamine Topical Pain Gel', type: 'Gel', strength: '30g', packSize: '30g Tube', standardMrp: 140, gstPercent: 12 },
  { name: 'Luliconazole Topical Antifungal Cream', type: 'Cream', strength: '1% w/w', packSize: '20g Tube', standardMrp: 310, gstPercent: 12 },
  { name: 'Silver Sulfadiazine Burn Relief Cream', type: 'Cream', strength: '1% w/w', packSize: '50g Jar', standardMrp: 95, gstPercent: 12 },

  // Capsules, Injections, Inhalers, Powders
  { name: 'Omeprazole Gastro-resistant IP', type: 'Capsule', strength: '20mg', packSize: '15 Capsules / Strip', standardMrp: 70, gstPercent: 12 },
  { name: 'Itraconazole Capsules BP', type: 'Capsule', strength: '100mg', packSize: '10 Capsules / Strip', standardMrp: 230, gstPercent: 12 },
  { name: 'Pregabalin IP', type: 'Capsule', strength: '75mg', packSize: '10 Capsules / Strip', standardMrp: 245, gstPercent: 12 },
  { name: 'Methylcobalamin + Alpha Lipoic Acid', type: 'Capsule', strength: '1500mcg', packSize: '15 Capsules / Strip', standardMrp: 280, gstPercent: 18 },
  { name: 'Ceftriaxone Sodium Injection IP', type: 'Injection', strength: '1000mg', packSize: '1 Vial + WFI Ampoule', standardMrp: 95, gstPercent: 12 },
  { name: 'Meropenem Trihydrate Injection IP', type: 'Injection', strength: '1000mg', packSize: '1 Vial Powder', standardMrp: 950, gstPercent: 12 },
  { name: 'Budesonide Resules / Inhaler', type: 'Inhaler', strength: '200mcg', packSize: '200 Metered Inhaler Doses', standardMrp: 380, gstPercent: 12 },
  { name: 'Salbutamol Sulphate Inhaler', type: 'Inhaler', strength: '100mcg', packSize: '200 Metered Inhaler Doses', standardMrp: 195, gstPercent: 12 },
  { name: 'Cholecalciferol (Vitamin D3) Granules', type: 'Powder', strength: '60000 IU', packSize: 'Sachet 1g', standardMrp: 62, gstPercent: 12 }
];

const MANUFACTURERS = [
  'Sun Pharmaceutical Industries Ltd',
  'Cipla Limited',
  'Dr. Reddy\'s Laboratories Ltd',
  'Torrent Pharmaceuticals Ltd',
  'Lupin Pharmaceuticals Ltd',
  'Alkem Laboratories Ltd',
  'Glenmark Pharmaceuticals Ltd',
  'Mankind Pharma Ltd',
  'Abbott Healthcare India Ltd',
  'Zydus Lifesciences Ltd',
  'Micro Labs Ltd',
  'Alembic Pharmaceuticals Ltd',
  'Intas Pharmaceuticals Ltd',
  'Ipca Laboratories Ltd',
  'Macleods Pharmaceuticals Ltd',
  'Aristo Pharmaceuticals Pvt Ltd',
  'GlaxoSmithKline Pharmaceuticals',
  'Sanofi India Limited',
  'Pfizer India Limited',
  'Novartis India Ltd'
];

const SUPPLIERS_LIST = [
  { id: 'sup-1', name: 'Sun Pharmaceutical Distributors Ltd.' },
  { id: 'sup-2', name: 'Apollo Healthcare Wholesale Logistics' },
  { id: 'sup-3', name: 'Cipla Med-Wholesale C&F Logistics' }
];

/**
 * Generates an 8,000 medicine catalog uniformly distributed across all 26 alphabets (A-Z).
 * Guarantees exactly 8,000 medicines and 8,000 batches.
 * Letters A through R have 308 medicines each (18 * 308 = 5,544)
 * Letters S through Z have 307 medicines each (8 * 307 = 2,456)
 * Total = exactly 8,000 medicines.
 */
export function generate8kPharmaDataset(
  seedMedicines: Medicine[] = [],
  seedBatches: Batch[] = []
): {
  medicines: Medicine[];
  batches: Batch[];
} {
  const medicines: Medicine[] = [...seedMedicines];
  const batches: Batch[] = [...seedBatches];

  const moleculeCount = MOLECULE_PROFILES.length;
  const mfgCount = MANUFACTURERS.length;
  const suffixCount = SUFFIX_MODIFIERS.length;

  const todayTime = new Date('2026-09-22').getTime();
  const dayMs = 86400000;

  // Group existing seed medicines by first letter
  const existingByLetter = new Map<string, Medicine[]>();
  for (const letter of ALPHABETS) {
    existingByLetter.set(letter, []);
  }

  for (const med of seedMedicines) {
    const firstChar = med.name.trim().charAt(0).toUpperCase();
    if (existingByLetter.has(firstChar)) {
      existingByLetter.get(firstChar)!.push(med);
    }
  }

  let globalIdCounter = seedMedicines.length + 1;

  ALPHABETS.forEach((letter, letterIdx) => {
    // 18 letters * 308 = 5544, 8 letters * 307 = 2456 => Total = 8,000 exactly
    const targetCountForLetter = letterIdx < 18 ? 308 : 307;
    const currentCount = existingByLetter.get(letter)?.length || 0;
    const needed = Math.max(0, targetCountForLetter - currentCount);

    const brandPrefixes = LETTER_BRANDS[letter] || [letter + 'pharma'];
    const prefixCount = brandPrefixes.length;

    for (let i = 0; i < needed; i++) {
      const prefixIdx = i % prefixCount;
      const suffixIdx = Math.floor(i / prefixCount) % suffixCount;
      const molIdx = (i * 3 + Math.floor(i / 17)) % moleculeCount;
      const mfgIdx = (i * 7 + 5) % mfgCount;
      const supIdx = (i * 2 + 1) % SUPPLIERS_LIST.length;

      const basePrefix = brandPrefixes[prefixIdx];
      const suffix = SUFFIX_MODIFIERS[suffixIdx];
      const mol = MOLECULE_PROFILES[molIdx];

      // Format clean, realistic name strictly starting with this alphabet letter
      const repeatCycle = Math.floor(i / (prefixCount * suffixCount));
      const cycleTag = repeatCycle > 0 ? `-${repeatCycle + 1}` : '';
      const typeLabel =
        mol.type === 'Drops'
          ? 'Drops'
          : mol.type === 'Syrup'
          ? 'Syrup'
          : mol.type === 'Suspension'
          ? 'Suspension'
          : mol.type === 'Ointment'
          ? 'Ointment'
          : mol.type === 'Cream'
          ? 'Cream'
          : mol.type === 'Gel'
          ? 'Gel'
          : mol.type === 'Inhaler'
          ? 'Inhaler'
          : mol.type === 'Injection'
          ? 'Injection'
          : mol.type === 'Powder'
          ? 'Powder'
          : mol.type === 'Capsule'
          ? 'Capsules'
          : 'Tablets';
      const name = `${basePrefix}${suffix ? ' ' + suffix : ''}${cycleTag} ${mol.strength} ${typeLabel}`;

      const medId = `med-8k-${letter.toLowerCase()}-${i + 1}`;

      // Calculate price variations
      const priceVariation = 0.88 + ((i * 11) % 30) / 100;
      const mrp = Math.round(mol.standardMrp * priceVariation * 10) / 10;
      const purchasePrice = Math.round(mrp * 0.72 * 100) / 100;
      const sellingPrice = Math.round(mrp * 0.95 * 100) / 100;

      // Realistic stock & expiry distribution:
      // - 88% normal healthy stock (50 - 450 units)
      // - 7% low stock (<= 25 units)
      // - 2% out of stock (0 units)
      // - 3% expiring soon or expired (< 90 days)
      const stockPattern = (i * 13) % 100;
      let batchQty = 60 + ((i * 19) % 360);
      let daysToExpiry = 180 + ((i * 29) % 750); // 6 to 30 months ahead

      if (stockPattern < 2) {
        batchQty = 0; // Out of stock
      } else if (stockPattern < 9) {
        batchQty = 3 + (i % 22); // Low stock (3 to 24 units)
      }

      if (stockPattern >= 9 && stockPattern < 11) {
        daysToExpiry = -(15 + (i % 50)); // Expired (15 to 64 days ago)
      } else if (stockPattern >= 11 && stockPattern < 15) {
        daysToExpiry = 8 + (i % 75); // Expiring soon (<90 days)
      }

      const expiryDate = new Date(todayTime + daysToExpiry * dayMs).toISOString().split('T')[0];
      const mfgDate = new Date(todayTime - (365 + (i % 180)) * dayMs).toISOString().slice(0, 7);

      const classification =
        mol.type === 'Injection'
          ? 'Schedule H1'
          : i % 3 === 0
          ? 'Schedule H'
          : i % 5 === 0
          ? 'OTC'
          : 'Schedule H';

      const med: Medicine = {
        id: medId,
        name,
        genericName: mol.name,
        type: mol.type,
        manufacturer: MANUFACTURERS[mfgIdx],
        strength: mol.strength,
        packSize: mol.packSize,
        mrp,
        purchasePrice,
        sellingPrice,
        discountPercent: 5,
        gstPercent: mol.gstPercent,
        barcode: `890${String(1000000000 + globalIdCounter).padStart(10, '0')}`,
        classification,
        minStockAlert: 30,
        preferredSupplierId: SUPPLIERS_LIST[supIdx].id,
        createdAt: '2026-08-01',
        isFromBill: i % 4 === 0,
        lastInwardBillId: i % 4 === 0 ? `INV-2026-${2000 + (i % 7000)}` : undefined,
        lastInwardDate: '2026-09-15',
      };

      medicines.push(med);

      // Generate corresponding active batch
      const batchId = `batch-8k-${letter.toLowerCase()}-${i + 1}`;
      const batchNumber = `BT-${letter}${(100 + (i % 900))}-${String.fromCharCode(65 + (i % 26))}`;

      const batch: Batch = {
        id: batchId,
        medicineId: medId,
        batchNumber,
        mfgDate,
        expiryDate,
        quantity: batchQty,
        initialQuantity: Math.max(batchQty, 100),
        purchasePrice,
        mrp,
        supplierId: SUPPLIERS_LIST[supIdx].id,
        supplierName: SUPPLIERS_LIST[supIdx].name,
        invoiceNumber: `INV-2026-${2000 + (i % 7000)}`,
        receivedDate: '2026-09-15',
      };

      batches.push(batch);
      globalIdCounter++;
    }
  });

  // Guarantee all 8,000 medicines are stored in strict alphabetical order (A to Z)
  medicines.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  return { medicines, batches };
}

// Backward-compatible aliases
export const generate25kPharmaDataset = generate8kPharmaDataset;
export const generateLargePharmaDataset = generate8kPharmaDataset;
