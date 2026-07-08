export type AeroTransportEntry = {
  commune: string;
  minutes: number;
  km: number;
  amount: number;
};

export type AeroFurnitureLine = {
  key: string;
  label: string;
  basePrice: number;
};

export type AeroFurnitureInput = {
  key: string;
  quantity: number;
  appliedPrice: number;
  /** Libellé libre saisi pour la ligne « Autre (veuillez préciser) ». */
  label?: string;
};

/** Clé de la ligne libre « Autre » de la liste des objets. */
export const AERO_OTHER_KEY = "autre";

export type AeroQuoteInputs = {
  furniture: AeroFurnitureInput[];
  doorSurface: number;
  shutterSurface: number;
  disassemblyHours: number;
  pickupEnabled: boolean;
  pickupCommune: string;
  deliveryEnabled: boolean;
  deliveryCommune: string;
};

export type AeroQuoteResult = {
  furnitureTotal: number;
  furnitureQuantity: number;
  doorTotal: number;
  shutterTotal: number;
  aerogommageTotal: number;
  disassemblyTotal: number;
  pickupEntry: AeroTransportEntry | null;
  pickupTotal: number;
  deliveryEntry: AeroTransportEntry | null;
  deliveryTotal: number;
  totalTtc: number;
};

export const AERO_RATES = {
  doorPerSquareMeter: 30,
  shutterPerSquareMeter: 25,
  disassemblyHourly: 30,
} as const;

export const AERO_FURNITURE: AeroFurnitureLine[] = [
  {
    "key": "armoire",
    "label": "Armoire",
    "basePrice": 100.0
  },
  {
    "key": "banc",
    "label": "Banc",
    "basePrice": 40.0
  },
  {
    "key": "bibliotheque",
    "label": "Bibliothèque",
    "basePrice": 80.0
  },
  {
    "key": "buffet",
    "label": "Buffet",
    "basePrice": 150.0
  },
  {
    "key": "bureau",
    "label": "Bureau",
    "basePrice": 80.0
  },
  {
    "key": "cadre_miroir",
    "label": "Cadre miroir",
    "basePrice": 20.0
  },
  {
    "key": "chaise",
    "label": "Chaise",
    "basePrice": 25.0
  },
  {
    "key": "coiffeuse",
    "label": "Coiffeuse",
    "basePrice": 50.0
  },
  {
    "key": "commode",
    "label": "Commode",
    "basePrice": 100.0
  },
  {
    "key": "lit_90_190",
    "label": "Lit 90/190",
    "basePrice": 50.0
  },
  {
    "key": "lit_140_190",
    "label": "Lit 140/190",
    "basePrice": 70.0
  },
  {
    "key": "malle___coffre",
    "label": "Malle - Coffre",
    "basePrice": 50.0
  },
  {
    "key": "meuble_tv",
    "label": "Meuble TV",
    "basePrice": 60.0
  },
  {
    "key": "salon_de_jardin",
    "label": "Salon de jardin",
    "basePrice": 80.0
  },
  {
    "key": "table_a_manger",
    "label": "Table à manger",
    "basePrice": 120.0
  },
  {
    "key": "table_basse",
    "label": "Table basse",
    "basePrice": 60.0
  },
  {
    "key": "table_chevet",
    "label": "Table chevet",
    "basePrice": 50.0
  },
  {
    "key": "tete_de_lit",
    "label": "Tête de lit",
    "basePrice": 40.0
  },
  {
    "key": "vaisselier",
    "label": "Vaisselier",
    "basePrice": 150.0
  },
  {
    key: AERO_OTHER_KEY,
    label: "Autre (veuillez préciser)",
    basePrice: 0,
  },
];

export const AERO_TRANSPORT_COMMUNES: AeroTransportEntry[] = [
  {
    "commune": "Abbecourt",
    "minutes": 26.566667,
    "km": 26.594,
    "amount": 40.0
  },
  {
    "commune": "Abbeville-Saint-Lucien",
    "minutes": 35.3,
    "km": 27.86,
    "amount": 40.0
  },
  {
    "commune": "Achy",
    "minutes": 22.183333,
    "km": 16.482,
    "amount": 30.0
  },
  {
    "commune": "Allonne",
    "minutes": 19.983333,
    "km": 20.606,
    "amount": 40.0
  },
  {
    "commune": "Amécourt",
    "minutes": 28.35,
    "km": 18.838,
    "amount": 30.0
  },
  {
    "commune": "Auchy-la-Montagne",
    "minutes": 39.066667,
    "km": 27.988,
    "amount": 40.0
  },
  {
    "commune": "Auneuil",
    "minutes": 17.833333,
    "km": 12.756,
    "amount": 30.0
  },
  {
    "commune": "Auteuil",
    "minutes": 26.933333,
    "km": 20.612,
    "amount": 40.0
  },
  {
    "commune": "Aux Marais",
    "minutes": 17.166667,
    "km": 14.538,
    "amount": 30.0
  },
  {
    "commune": "Avesnes-en-Bray",
    "minutes": 26.466667,
    "km": 20.528,
    "amount": 40.0
  },
  {
    "commune": "Bachivillers",
    "minutes": 31.333333,
    "km": 23.268,
    "amount": 40.0
  },
  {
    "commune": "Bailleul-sur-Thérain",
    "minutes": 32.266667,
    "km": 28.672,
    "amount": 40.0
  },
  {
    "commune": "Bazancourt",
    "minutes": 31.016667,
    "km": 22.966,
    "amount": 40.0
  },
  {
    "commune": "Bazincourt-sur-Epte",
    "minutes": 28.783333,
    "km": 19.046,
    "amount": 30.0
  },
  {
    "commune": "Beaumont-les-Nonains",
    "minutes": 28.866667,
    "km": 20.51,
    "amount": 40.0
  },
  {
    "commune": "Beauvais",
    "minutes": 23.2,
    "km": 17.584,
    "amount": 30.0
  },
  {
    "commune": "Beauvoir-en-Lyons",
    "minutes": 33.583333,
    "km": 29.04,
    "amount": 40.0
  },
  {
    "commune": "Berneuil-en-Bray",
    "minutes": 22.883333,
    "km": 18.918,
    "amount": 30.0
  },
  {
    "commune": "Bernouville",
    "minutes": 41.3,
    "km": 28.638,
    "amount": 40.0
  },
  {
    "commune": "Berthecourt",
    "minutes": 32.116667,
    "km": 31.392,
    "amount": 50.0
  },
  {
    "commune": "Bézancourt",
    "minutes": 32.1,
    "km": 24.274,
    "amount": 40.0
  },
  {
    "commune": "Bézu-la-Forêt",
    "minutes": 33.916667,
    "km": 24.508,
    "amount": 40.0
  },
  {
    "commune": "Bézu-Saint-Éloi",
    "minutes": 39.9,
    "km": 26.476,
    "amount": 40.0
  },
  {
    "commune": "Blacourt",
    "minutes": 6.4,
    "km": 3.834,
    "amount": 10.0
  },
  {
    "commune": "Blargies",
    "minutes": 43.216667,
    "km": 31.08,
    "amount": 50.0
  },
  {
    "commune": "Blicourt",
    "minutes": 33.716667,
    "km": 23.058,
    "amount": 40.0
  },
  {
    "commune": "Boissy-le-Bois",
    "minutes": 33.833333,
    "km": 23.626,
    "amount": 40.0
  },
  {
    "commune": "Bonlier",
    "minutes": 32.283333,
    "km": 24.076,
    "amount": 40.0
  },
  {
    "commune": "Bonnières",
    "minutes": 16.55,
    "km": 10.804,
    "amount": 30.0
  },
  {
    "commune": "Bosc-Hyons",
    "minutes": 29.216667,
    "km": 22.42,
    "amount": 40.0
  },
  {
    "commune": "Bosquentin",
    "minutes": 36.983333,
    "km": 27.966,
    "amount": 40.0
  },
  {
    "commune": "Boubiers",
    "minutes": 39.316667,
    "km": 30.338,
    "amount": 40.0
  },
  {
    "commune": "Bouchevilliers",
    "minutes": 25.316667,
    "km": 19.218,
    "amount": 30.0
  },
  {
    "commune": "Boury-en-Vexin",
    "minutes": 42.033333,
    "km": 30.396,
    "amount": 40.0
  },
  {
    "commune": "Boutavent",
    "minutes": 37.416667,
    "km": 27.518,
    "amount": 40.0
  },
  {
    "commune": "Boutencourt",
    "minutes": 25.166667,
    "km": 16.95,
    "amount": 30.0
  },
  {
    "commune": "Bouvresse",
    "minutes": 40.516667,
    "km": 29.784,
    "amount": 40.0
  },
  {
    "commune": "Brémontier-Merval",
    "minutes": 29.65,
    "km": 24.49,
    "amount": 40.0
  },
  {
    "commune": "Bresles",
    "minutes": 34.833333,
    "km": 29.862,
    "amount": 40.0
  },
  {
    "commune": "Briot",
    "minutes": 32.183333,
    "km": 25.28,
    "amount": 40.0
  },
  {
    "commune": "Brombos",
    "minutes": 32.15,
    "km": 25.792,
    "amount": 40.0
  },
  {
    "commune": "Broquiers",
    "minutes": 39.233333,
    "km": 29.028,
    "amount": 40.0
  },
  {
    "commune": "Buicourt",
    "minutes": 23.5,
    "km": 14.604,
    "amount": 30.0
  },
  {
    "commune": "Campeaux",
    "minutes": 37.916667,
    "km": 25.59,
    "amount": 40.0
  },
  {
    "commune": "Canny-sur-Thérain",
    "minutes": 40.216667,
    "km": 26.344,
    "amount": 40.0
  },
  {
    "commune": "Catheux",
    "minutes": 42.75,
    "km": 33.376,
    "amount": 50.0
  },
  {
    "commune": "Cempuis",
    "minutes": 34.716667,
    "km": 26.758,
    "amount": 40.0
  },
  {
    "commune": "Chambors",
    "minutes": 36.35,
    "km": 26.468,
    "amount": 40.0
  },
  {
    "commune": "Chaumont-en-Vexin",
    "minutes": 29.683333,
    "km": 22.064,
    "amount": 40.0
  },
  {
    "commune": "Chauvincourt-Provemont",
    "minutes": 45.0,
    "km": 33.624,
    "amount": 50.0
  },
  {
    "commune": "Choqueuse-les-Bénards",
    "minutes": 39.25,
    "km": 31.038,
    "amount": 50.0
  },
  {
    "commune": "Conteville",
    "minutes": 39.7,
    "km": 30.608,
    "amount": 50.0
  },
  {
    "commune": "Corbeil-Cerf",
    "minutes": 35.866667,
    "km": 29.474,
    "amount": 40.0
  },
  {
    "commune": "Courcelles-lès-Gisors",
    "minutes": 39.366667,
    "km": 28.246,
    "amount": 40.0
  },
  {
    "commune": "Crèvecoeur-le-Grand",
    "minutes": 34.1,
    "km": 27.108,
    "amount": 40.0
  },
  {
    "commune": "Crillon",
    "minutes": 15.866667,
    "km": 10.752,
    "amount": 30.0
  },
  {
    "commune": "Cuigy-en-Bray",
    "minutes": 8.383333,
    "km": 6.328,
    "amount": 20.0
  },
  {
    "commune": "Cuy-Saint-Fiacre",
    "minutes": 23.783333,
    "km": 19.328,
    "amount": 30.0
  },
  {
    "commune": "Daméraucourt",
    "minutes": 41.966667,
    "km": 33.414,
    "amount": 50.0
  },
  {
    "commune": "Dampierre-en-Bray",
    "minutes": 28.316667,
    "km": 23.104,
    "amount": 40.0
  },
  {
    "commune": "Dangu",
    "minutes": 40.616667,
    "km": 31.08,
    "amount": 50.0
  },
  {
    "commune": "Dargies",
    "minutes": 40.8,
    "km": 32.918,
    "amount": 50.0
  },
  {
    "commune": "Delincourt",
    "minutes": 41.466667,
    "km": 28.596,
    "amount": 40.0
  },
  {
    "commune": "Doudeauville",
    "minutes": 32.333333,
    "km": 25.904,
    "amount": 40.0
  },
  {
    "commune": "Doudeauville-en-Vexin",
    "minutes": 44.233333,
    "km": 32.996,
    "amount": 50.0
  },
  {
    "commune": "Elbeuf-en-Bray",
    "minutes": 26.233333,
    "km": 21.346,
    "amount": 40.0
  },
  {
    "commune": "Énencourt-Léage",
    "minutes": 26.516667,
    "km": 19.23,
    "amount": 30.0
  },
  {
    "commune": "Énencourt-le-Sec",
    "minutes": 29.866667,
    "km": 21.306,
    "amount": 40.0
  },
  {
    "commune": "Éragny-sur-Epte",
    "minutes": 30.233333,
    "km": 20.912,
    "amount": 40.0
  },
  {
    "commune": "Ernemont-Boutavent",
    "minutes": 33.783333,
    "km": 21.86,
    "amount": 40.0
  },
  {
    "commune": "Ernemont-la-Villette",
    "minutes": 22.816667,
    "km": 19.382,
    "amount": 30.0
  },
  {
    "commune": "Escames",
    "minutes": 27.1,
    "km": 16.682,
    "amount": 30.0
  },
  {
    "commune": "Espaubourg",
    "minutes": 7.983333,
    "km": 4.82,
    "amount": 10.0
  },
  {
    "commune": "Essuiles",
    "minutes": 43.9,
    "km": 33.398,
    "amount": 50.0
  },
  {
    "commune": "Étrépagny",
    "minutes": 42.483333,
    "km": 31.052,
    "amount": 50.0
  },
  {
    "commune": "Fay-les-Étangs",
    "minutes": 37.533333,
    "km": 27.788,
    "amount": 40.0
  },
  {
    "commune": "Ferrières-en-Bray",
    "minutes": 18.766667,
    "km": 15.43,
    "amount": 30.0
  },
  {
    "commune": "Feuquières",
    "minutes": 36.1,
    "km": 26.936,
    "amount": 40.0
  },
  {
    "commune": "Flavacourt",
    "minutes": 20.6,
    "km": 14.42,
    "amount": 30.0
  },
  {
    "commune": "Fleury",
    "minutes": 36.283333,
    "km": 27.394,
    "amount": 40.0
  },
  {
    "commune": "Fleury-la-Forêt",
    "minutes": 37.316667,
    "km": 30.502,
    "amount": 50.0
  },
  {
    "commune": "Fontaine-Lavaganne",
    "minutes": 25.85,
    "km": 19.498,
    "amount": 30.0
  },
  {
    "commune": "Fontaine-Saint-Lucien",
    "minutes": 34.766667,
    "km": 25.126,
    "amount": 40.0
  },
  {
    "commune": "Fontenay-Torcy",
    "minutes": 30.233333,
    "km": 20.068,
    "amount": 30.0
  },
  {
    "commune": "Formerie",
    "minutes": 42.4,
    "km": 29.954,
    "amount": 40.0
  },
  {
    "commune": "Fouquenies",
    "minutes": 22.216667,
    "km": 13.422,
    "amount": 30.0
  },
  {
    "commune": "Fouquerolles",
    "minutes": 35.216667,
    "km": 27.358,
    "amount": 40.0
  },
  {
    "commune": "Francastel",
    "minutes": 40.0,
    "km": 31.266,
    "amount": 50.0
  },
  {
    "commune": "Fresneaux-Montchevreuil",
    "minutes": 34.066667,
    "km": 24.532,
    "amount": 40.0
  },
  {
    "commune": "Fresne-Léguillon",
    "minutes": 37.766667,
    "km": 27.902,
    "amount": 40.0
  },
  {
    "commune": "Frocourt",
    "minutes": 20.2,
    "km": 18.978,
    "amount": 30.0
  },
  {
    "commune": "Fry",
    "minutes": 37.883333,
    "km": 31.544,
    "amount": 50.0
  },
  {
    "commune": "Gaillefontaine",
    "minutes": 45.8,
    "km": 35.632,
    "amount": 50.0
  },
  {
    "commune": "Gancourt-Saint-Étienne",
    "minutes": 28.866667,
    "km": 23.512,
    "amount": 40.0
  },
  {
    "commune": "Gaudechart",
    "minutes": 28.916667,
    "km": 22.006,
    "amount": 40.0
  },
  {
    "commune": "Gerberoy",
    "minutes": 23.7,
    "km": 14.592,
    "amount": 30.0
  },
  {
    "commune": "Gisors",
    "minutes": 32.75,
    "km": 24.176,
    "amount": 40.0
  },
  {
    "commune": "Glatigny",
    "minutes": 9.95,
    "km": 6.524,
    "amount": 20.0
  },
  {
    "commune": "Goincourt",
    "minutes": 18.266667,
    "km": 13.382,
    "amount": 30.0
  },
  {
    "commune": "Gournay-en-Bray",
    "minutes": 19.766667,
    "km": 16.094,
    "amount": 30.0
  },
  {
    "commune": "Grandvilliers",
    "minutes": 35.5,
    "km": 27.748,
    "amount": 40.0
  },
  {
    "commune": "Grémévillers",
    "minutes": 21.683333,
    "km": 15.752,
    "amount": 30.0
  },
  {
    "commune": "Grez",
    "minutes": 32.583333,
    "km": 24.574,
    "amount": 40.0
  },
  {
    "commune": "Grumesnil",
    "minutes": 42.8,
    "km": 29.852,
    "amount": 40.0
  },
  {
    "commune": "Guignecourt",
    "minutes": 32.066667,
    "km": 23.244,
    "amount": 40.0
  },
  {
    "commune": "Halloy",
    "minutes": 32.3,
    "km": 26.084,
    "amount": 40.0
  },
  {
    "commune": "Hannaches",
    "minutes": 20.95,
    "km": 13.69,
    "amount": 30.0
  },
  {
    "commune": "Hanvoile",
    "minutes": 15.05,
    "km": 8.81,
    "amount": 20.0
  },
  {
    "commune": "Hardivillers-en-Vexin",
    "minutes": 28.683333,
    "km": 20.112,
    "amount": 30.0
  },
  {
    "commune": "Haucourt",
    "minutes": 47.266667,
    "km": 33.33,
    "amount": 50.0
  },
  {
    "commune": "Haudivillers",
    "minutes": 39.116667,
    "km": 30.782,
    "amount": 50.0
  },
  {
    "commune": "Haussez",
    "minutes": 36.333333,
    "km": 28.838,
    "amount": 40.0
  },
  {
    "commune": "Hautbos",
    "minutes": 34.033333,
    "km": 24.6,
    "amount": 40.0
  },
  {
    "commune": "Hautcourt",
    "minutes": 13.0,
    "km": 10.3,
    "amount": 20.0
  },
  {
    "commune": "Haute-Épine",
    "minutes": 27.016667,
    "km": 20.806,
    "amount": 40.0
  },
  {
    "commune": "Hébécourt",
    "minutes": 30.466667,
    "km": 20.33,
    "amount": 30.0
  },
  {
    "commune": "Hécourt",
    "minutes": 25.016667,
    "km": 15.966,
    "amount": 30.0
  },
  {
    "commune": "Herchies",
    "minutes": 19.366667,
    "km": 10.774,
    "amount": 30.0
  },
  {
    "commune": "Héricourt-sur-Thérain",
    "minutes": 34.433333,
    "km": 22.718,
    "amount": 40.0
  },
  {
    "commune": "Hétomesnil",
    "minutes": 35.683333,
    "km": 27.764,
    "amount": 40.0
  },
  {
    "commune": "Heudicourt",
    "minutes": 36.8,
    "km": 26.494,
    "amount": 40.0
  },
  {
    "commune": "Hodenc-en-Bray",
    "minutes": 7.883333,
    "km": 4.46,
    "amount": 10.0
  },
  {
    "commune": "Hodenc-l'Évêque",
    "minutes": 29.016667,
    "km": 24.06,
    "amount": 40.0
  },
  {
    "commune": "Hodeng-Hodenger",
    "minutes": 33.866667,
    "km": 28.35,
    "amount": 40.0
  },
  {
    "commune": "Ivry-le-Temple",
    "minutes": 41.866667,
    "km": 31.576,
    "amount": 50.0
  },
  {
    "commune": "Jaméricourt",
    "minutes": 26.816667,
    "km": 19.492,
    "amount": 30.0
  },
  {
    "commune": "Jouy-sous-Thelle",
    "minutes": 26.816667,
    "km": 19.46,
    "amount": 30.0
  },
  {
    "commune": "Juvignies",
    "minutes": 34.016667,
    "km": 22.162,
    "amount": 40.0
  },
  {
    "commune": "La Feuillie",
    "minutes": 35.116667,
    "km": 32.53,
    "amount": 50.0
  },
  {
    "commune": "La Houssoye",
    "minutes": 21.166667,
    "km": 14.488,
    "amount": 30.0
  },
  {
    "commune": "La Neuve-Grange",
    "minutes": 41.183333,
    "km": 30.722,
    "amount": 50.0
  },
  {
    "commune": "La Neuville-d'Aumont",
    "minutes": 29.75,
    "km": 24.59,
    "amount": 40.0
  },
  {
    "commune": "La Neuville-Garnier",
    "minutes": 26.6,
    "km": 19.382,
    "amount": 30.0
  },
  {
    "commune": "La Neuville-Saint-Pierre",
    "minutes": 35.166667,
    "km": 30.484,
    "amount": 40.0
  },
  {
    "commune": "La Neuville-sur-Oudeuil",
    "minutes": 27.966667,
    "km": 20.258,
    "amount": 30.0
  },
  {
    "commune": "La Neuville-Vault",
    "minutes": 15.8,
    "km": 8.89,
    "amount": 20.0
  },
  {
    "commune": "Laboissière-en-Thelle",
    "minutes": 40.033333,
    "km": 31.0,
    "amount": 50.0
  },
  {
    "commune": "Labosse",
    "minutes": 19.5,
    "km": 12.606,
    "amount": 30.0
  },
  {
    "commune": "Lachapelle-aux-Pots",
    "minutes": 6.383333,
    "km": 3.59,
    "amount": 10.0
  },
  {
    "commune": "Lachapelle-sous-Gerberoy",
    "minutes": 19.7,
    "km": 13.39,
    "amount": 30.0
  },
  {
    "commune": "Lachaussée-du-Bois-d'Écu",
    "minutes": 39.983333,
    "km": 30.428,
    "amount": 40.0
  },
  {
    "commune": "Lafraye",
    "minutes": 37.516667,
    "km": 29.432,
    "amount": 40.0
  },
  {
    "commune": "Lalande-en-Son",
    "minutes": 21.183333,
    "km": 12.914,
    "amount": 30.0
  },
  {
    "commune": "Lalandelle",
    "minutes": 13.383333,
    "km": 7.826,
    "amount": 20.0
  },
  {
    "commune": "Lattainville",
    "minutes": 38.233333,
    "km": 27.6,
    "amount": 40.0
  },
  {
    "commune": "Laverrière",
    "minutes": 43.283333,
    "km": 31.648,
    "amount": 50.0
  },
  {
    "commune": "Laversines",
    "minutes": 30.983333,
    "km": 26.242,
    "amount": 40.0
  },
  {
    "commune": "Le Coudray-Saint-Germer",
    "minutes": 15.05,
    "km": 8.936,
    "amount": 20.0
  },
  {
    "commune": "Le Coudray-sur-Thelle",
    "minutes": 34.366667,
    "km": 27.384,
    "amount": 40.0
  },
  {
    "commune": "Le Déluge",
    "minutes": 33.583333,
    "km": 27.196,
    "amount": 40.0
  },
  {
    "commune": "Le Fay-Saint-Quentin",
    "minutes": 36.116667,
    "km": 29.86,
    "amount": 40.0
  },
  {
    "commune": "Le Gallet",
    "minutes": 38.233333,
    "km": 30.528,
    "amount": 50.0
  },
  {
    "commune": "Le Hamel",
    "minutes": 37.95,
    "km": 26.956,
    "amount": 40.0
  },
  {
    "commune": "Le Mesnil-Théribus",
    "minutes": 30.566667,
    "km": 22.082,
    "amount": 40.0
  },
  {
    "commune": "Le Mont-Saint-Adrien",
    "minutes": 20.666667,
    "km": 11.624,
    "amount": 30.0
  },
  {
    "commune": "Le Vaumain",
    "minutes": 22.266667,
    "km": 15.214,
    "amount": 30.0
  },
  {
    "commune": "Le Vauroux",
    "minutes": 14.566667,
    "km": 10.362,
    "amount": 20.0
  },
  {
    "commune": "Lhéraule",
    "minutes": 11.516667,
    "km": 6.912,
    "amount": 20.0
  },
  {
    "commune": "Liancourt-Saint-Pierre",
    "minutes": 38.066667,
    "km": 28.004,
    "amount": 40.0
  },
  {
    "commune": "Lierville",
    "minutes": 40.166667,
    "km": 32.75,
    "amount": 50.0
  },
  {
    "commune": "Lihus",
    "minutes": 30.783333,
    "km": 24.524,
    "amount": 40.0
  },
  {
    "commune": "Lilly",
    "minutes": 39.866667,
    "km": 29.94,
    "amount": 40.0
  },
  {
    "commune": "Loconville",
    "minutes": 34.933333,
    "km": 25.524,
    "amount": 40.0
  },
  {
    "commune": "Longchamps",
    "minutes": 38.216667,
    "km": 28.376,
    "amount": 40.0
  },
  {
    "commune": "Lormaison",
    "minutes": 38.216667,
    "km": 31.248,
    "amount": 50.0
  },
  {
    "commune": "Loueuse",
    "minutes": 30.8,
    "km": 20.246,
    "amount": 30.0
  },
  {
    "commune": "Luchy",
    "minutes": 39.366667,
    "km": 26.068,
    "amount": 40.0
  },
  {
    "commune": "Mainneville",
    "minutes": 27.216667,
    "km": 21.812,
    "amount": 40.0
  },
  {
    "commune": "Maisoncelle-Saint-Pierre",
    "minutes": 34.083333,
    "km": 23.214,
    "amount": 40.0
  },
  {
    "commune": "Marseille-en-Beauvaisis",
    "minutes": 24.833333,
    "km": 18.066,
    "amount": 30.0
  },
  {
    "commune": "Martagny",
    "minutes": 30.95,
    "km": 22.062,
    "amount": 40.0
  },
  {
    "commune": "Martincourt",
    "minutes": 18.45,
    "km": 11.762,
    "amount": 30.0
  },
  {
    "commune": "Maulers",
    "minutes": 38.25,
    "km": 27.914,
    "amount": 40.0
  },
  {
    "commune": "Ménerval",
    "minutes": 31.566667,
    "km": 27.138,
    "amount": 40.0
  },
  {
    "commune": "Méru",
    "minutes": 39.916667,
    "km": 32.774,
    "amount": 50.0
  },
  {
    "commune": "Mésangueville",
    "minutes": 37.416667,
    "km": 30.608,
    "amount": 50.0
  },
  {
    "commune": "Mesnil-sous-Vienne",
    "minutes": 30.733333,
    "km": 22.396,
    "amount": 40.0
  },
  {
    "commune": "Milly-sur-Thérain",
    "minutes": 23.883333,
    "km": 15.038,
    "amount": 30.0
  },
  {
    "commune": "Molagnies",
    "minutes": 26.25,
    "km": 20.63,
    "amount": 40.0
  },
  {
    "commune": "Moliens",
    "minutes": 41.833333,
    "km": 30.12,
    "amount": 40.0
  },
  {
    "commune": "Monceaux-l'Abbaye",
    "minutes": 38.883333,
    "km": 28.378,
    "amount": 40.0
  },
  {
    "commune": "Monneville",
    "minutes": 42.933333,
    "km": 32.07,
    "amount": 50.0
  },
  {
    "commune": "Montherlant",
    "minutes": 34.616667,
    "km": 26.958,
    "amount": 40.0
  },
  {
    "commune": "Montjavoult",
    "minutes": 41.766667,
    "km": 31.066,
    "amount": 50.0
  },
  {
    "commune": "Montreuil-sur-Thérain",
    "minutes": 27.516667,
    "km": 27.36,
    "amount": 40.0
  },
  {
    "commune": "Montroty",
    "minutes": 26.816667,
    "km": 20.826,
    "amount": 40.0
  },
  {
    "commune": "Morgny",
    "minutes": 38.216667,
    "km": 28.702,
    "amount": 40.0
  },
  {
    "commune": "Morvillers",
    "minutes": 25.016667,
    "km": 18.332,
    "amount": 30.0
  },
  {
    "commune": "Muidorge",
    "minutes": 39.666667,
    "km": 25.65,
    "amount": 40.0
  },
  {
    "commune": "Mureaumont",
    "minutes": 34.266667,
    "km": 24.33,
    "amount": 40.0
  },
  {
    "commune": "Neaufles-Saint-Martin",
    "minutes": 35.116667,
    "km": 26.446,
    "amount": 40.0
  },
  {
    "commune": "Neuf-Marché",
    "minutes": 23.0,
    "km": 17.252,
    "amount": 30.0
  },
  {
    "commune": "Nivillers",
    "minutes": 29.883333,
    "km": 22.91,
    "amount": 40.0
  },
  {
    "commune": "Noailles",
    "minutes": 33.366667,
    "km": 29.42,
    "amount": 40.0
  },
  {
    "commune": "Omécourt",
    "minutes": 33.55,
    "km": 24.056,
    "amount": 40.0
  },
  {
    "commune": "Ons-en-Bray",
    "minutes": 9.583333,
    "km": 5.134,
    "amount": 10.0
  },
  {
    "commune": "Oroër",
    "minutes": 34.4,
    "km": 27.65,
    "amount": 40.0
  },
  {
    "commune": "Oudeuil",
    "minutes": 29.3,
    "km": 19.766,
    "amount": 30.0
  },
  {
    "commune": "Pierrefitte-en-Beauvaisis",
    "minutes": 16.6,
    "km": 9.028,
    "amount": 20.0
  },
  {
    "commune": "Pisseleu",
    "minutes": 30.216667,
    "km": 20.532,
    "amount": 40.0
  },
  {
    "commune": "Ponchon",
    "minutes": 26.3,
    "km": 27.998,
    "amount": 40.0
  },
  {
    "commune": "Porcheux",
    "minutes": 23.65,
    "km": 16.42,
    "amount": 30.0
  },
  {
    "commune": "Pouilly",
    "minutes": 37.5,
    "km": 26.974,
    "amount": 40.0
  },
  {
    "commune": "Prévillers",
    "minutes": 31.566667,
    "km": 24.386,
    "amount": 40.0
  },
  {
    "commune": "Puiseux-en-Bray",
    "minutes": 17.316667,
    "km": 12.576,
    "amount": 30.0
  },
  {
    "commune": "Rainvillers",
    "minutes": 17.383333,
    "km": 12.158,
    "amount": 30.0
  },
  {
    "commune": "Reilly",
    "minutes": 36.033333,
    "km": 26.834,
    "amount": 40.0
  },
  {
    "commune": "Ressons-l'Abbaye",
    "minutes": 31.6,
    "km": 26.546,
    "amount": 40.0
  },
  {
    "commune": "Reuil-sur-Brêche",
    "minutes": 40.35,
    "km": 32.274,
    "amount": 50.0
  },
  {
    "commune": "Rochy-Condé",
    "minutes": 28.983333,
    "km": 25.906,
    "amount": 40.0
  },
  {
    "commune": "Rotangy",
    "minutes": 36.216667,
    "km": 26.144,
    "amount": 40.0
  },
  {
    "commune": "Rothois",
    "minutes": 28.833333,
    "km": 21.72,
    "amount": 40.0
  },
  {
    "commune": "Roy-Boissy",
    "minutes": 25.683333,
    "km": 18.436,
    "amount": 30.0
  },
  {
    "commune": "Saint-Arnoult",
    "minutes": 35.9,
    "km": 25.996,
    "amount": 40.0
  },
  {
    "commune": "Saint-Aubin-en-Bray",
    "minutes": 6.15,
    "km": 2.388,
    "amount": 10.0
  },
  {
    "commune": "Saint-Crépin-Ibouvillers",
    "minutes": 38.2,
    "km": 29.488,
    "amount": 40.0
  },
  {
    "commune": "Saint-Deniscourt",
    "minutes": 29.75,
    "km": 21.082,
    "amount": 40.0
  },
  {
    "commune": "Saint-Denis-le-Ferment",
    "minutes": 37.716667,
    "km": 23.092,
    "amount": 40.0
  },
  {
    "commune": "Saint-Germain-la-Poterie",
    "minutes": 15.95,
    "km": 10.42,
    "amount": 20.0
  },
  {
    "commune": "Saint-Germer-de-Fly",
    "minutes": 14.5,
    "km": 10.412,
    "amount": 20.0
  },
  {
    "commune": "Saint-Léger-en-Bray",
    "minutes": 16.416667,
    "km": 13.704,
    "amount": 30.0
  },
  {
    "commune": "Saint-Martin-le-Noeud",
    "minutes": 18.85,
    "km": 16.582,
    "amount": 30.0
  },
  {
    "commune": "Saint-Maur",
    "minutes": 29.283333,
    "km": 22.778,
    "amount": 40.0
  },
  {
    "commune": "Saint-Michel-d'Halescourt",
    "minutes": 40.033333,
    "km": 31.746,
    "amount": 50.0
  },
  {
    "commune": "Saint-Omer-en-Chaussée",
    "minutes": 25.483333,
    "km": 17.62,
    "amount": 30.0
  },
  {
    "commune": "Saint-Paul",
    "minutes": 10.85,
    "km": 8.162,
    "amount": 20.0
  },
  {
    "commune": "Saint-Pierre-es-Champs",
    "minutes": 19.1,
    "km": 15.34,
    "amount": 30.0
  },
  {
    "commune": "Saint-Quentin-des-Prés",
    "minutes": 24.25,
    "km": 19.422,
    "amount": 30.0
  },
  {
    "commune": "Saint-Samson-la-Poterie",
    "minutes": 35.416667,
    "km": 24.132,
    "amount": 40.0
  },
  {
    "commune": "Saint-Sulpice",
    "minutes": 23.683333,
    "km": 23.022,
    "amount": 40.0
  },
  {
    "commune": "Sancourt",
    "minutes": 34.95,
    "km": 24.922,
    "amount": 40.0
  },
  {
    "commune": "Sarcus",
    "minutes": 37.933333,
    "km": 30.022,
    "amount": 40.0
  },
  {
    "commune": "Sarnois",
    "minutes": 37.5,
    "km": 29.528,
    "amount": 40.0
  },
  {
    "commune": "Saumont-la-Poterie",
    "minutes": 32.416667,
    "km": 30.026,
    "amount": 40.0
  },
  {
    "commune": "Savignies",
    "minutes": 14.45,
    "km": 7.198,
    "amount": 20.0
  },
  {
    "commune": "Senantes",
    "minutes": 13.15,
    "km": 8.766,
    "amount": 20.0
  },
  {
    "commune": "Senots",
    "minutes": 38.5,
    "km": 26.942,
    "amount": 40.0
  },
  {
    "commune": "Sérifontaine",
    "minutes": 20.933333,
    "km": 14.1,
    "amount": 30.0
  },
  {
    "commune": "Silly-Tillard",
    "minutes": 32.65,
    "km": 26.544,
    "amount": 40.0
  },
  {
    "commune": "Sommereux",
    "minutes": 41.933333,
    "km": 30.426,
    "amount": 40.0
  },
  {
    "commune": "Songeons",
    "minutes": 26.4,
    "km": 16.314,
    "amount": 30.0
  },
  {
    "commune": "Sully",
    "minutes": 28.566667,
    "km": 18.428,
    "amount": 30.0
  },
  {
    "commune": "Talmontiers",
    "minutes": 22.666667,
    "km": 15.274,
    "amount": 30.0
  },
  {
    "commune": "Therdonne",
    "minutes": 27.883333,
    "km": 21.734,
    "amount": 40.0
  },
  {
    "commune": "Thérines",
    "minutes": 28.766667,
    "km": 21.138,
    "amount": 40.0
  },
  {
    "commune": "Thibivillers",
    "minutes": 25.316667,
    "km": 17.738,
    "amount": 30.0
  },
  {
    "commune": "Thieuloy-Saint-Antoine",
    "minutes": 29.516667,
    "km": 23.716,
    "amount": 40.0
  },
  {
    "commune": "Tillé",
    "minutes": 29.25,
    "km": 20.768,
    "amount": 40.0
  },
  {
    "commune": "Tourly",
    "minutes": 42.15,
    "km": 31.798,
    "amount": 50.0
  },
  {
    "commune": "Trie-Château",
    "minutes": 34.566667,
    "km": 22.96,
    "amount": 40.0
  },
  {
    "commune": "Trie-la-Ville",
    "minutes": 28.383333,
    "km": 21.57,
    "amount": 40.0
  },
  {
    "commune": "Troissereux",
    "minutes": 26.716667,
    "km": 15.472,
    "amount": 30.0
  },
  {
    "commune": "Troussures",
    "minutes": 12.333333,
    "km": 9.106,
    "amount": 20.0
  },
  {
    "commune": "Valdampierre",
    "minutes": 33.516667,
    "km": 23.944,
    "amount": 40.0
  },
  {
    "commune": "Vaudancourt",
    "minutes": 43.25,
    "km": 30.798,
    "amount": 50.0
  },
  {
    "commune": "Velennes",
    "minutes": 35.416667,
    "km": 26.9,
    "amount": 40.0
  },
  {
    "commune": "Verderel-lès-Sauqueuse",
    "minutes": 29.816667,
    "km": 18.298,
    "amount": 30.0
  },
  {
    "commune": "Viefvillers",
    "minutes": 35.416667,
    "km": 29.562,
    "amount": 40.0
  },
  {
    "commune": "Villembray",
    "minutes": 11.583333,
    "km": 7.282,
    "amount": 20.0
  },
  {
    "commune": "Villers-Saint-Barthélemy",
    "minutes": 12.116667,
    "km": 8.148,
    "amount": 20.0
  },
  {
    "commune": "Villers-Saint-Sépulcre",
    "minutes": 30.816667,
    "km": 29.678,
    "amount": 40.0
  },
  {
    "commune": "Villers-sur-Auchy",
    "minutes": 16.416667,
    "km": 12.666,
    "amount": 30.0
  },
  {
    "commune": "Villers-sur-Bonnières",
    "minutes": 18.6,
    "km": 13.38,
    "amount": 30.0
  },
  {
    "commune": "Villers-sur-Trie",
    "minutes": 27.633333,
    "km": 19.204,
    "amount": 30.0
  },
  {
    "commune": "Villers-Vermont",
    "minutes": 34.0,
    "km": 24.372,
    "amount": 40.0
  },
  {
    "commune": "Villotran",
    "minutes": 24.366667,
    "km": 17.248,
    "amount": 30.0
  },
  {
    "commune": "Vrocourt",
    "minutes": 19.316667,
    "km": 12.61,
    "amount": 30.0
  },
  {
    "commune": "Wambez",
    "minutes": 19.05,
    "km": 12.44,
    "amount": 30.0
  },
  {
    "commune": "Warluis",
    "minutes": 22.6,
    "km": 23.78,
    "amount": 40.0
  }
];

export function normalizeAeroCommune(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function findAeroTransportCommune(commune: string): AeroTransportEntry | null {
  const needle = normalizeAeroCommune(commune);
  if (!needle) return null;
  return (
    AERO_TRANSPORT_COMMUNES.find((entry) => normalizeAeroCommune(entry.commune) === needle) ??
    AERO_TRANSPORT_COMMUNES.find((entry) => normalizeAeroCommune(entry.commune).startsWith(needle)) ??
    null
  );
}

export function getAeroCommuneSuggestions(commune: string, limit = 8): AeroTransportEntry[] {
  const needle = normalizeAeroCommune(commune);
  if (!needle) return [];
  return AERO_TRANSPORT_COMMUNES
    .filter((entry) => normalizeAeroCommune(entry.commune).includes(needle))
    .slice(0, limit);
}

function positive(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateAeroQuote(inputs: AeroQuoteInputs): AeroQuoteResult {
  const furnitureTotal = inputs.furniture.reduce(
    (sum, line) => sum + positive(line.quantity) * positive(line.appliedPrice),
    0,
  );
  const furnitureQuantity = inputs.furniture.reduce(
    (sum, line) => sum + positive(line.quantity),
    0,
  );
  const doorTotal = positive(inputs.doorSurface) * AERO_RATES.doorPerSquareMeter;
  const shutterTotal = positive(inputs.shutterSurface) * AERO_RATES.shutterPerSquareMeter;
  const aerogommageTotal = furnitureTotal + doorTotal + shutterTotal;
  const disassemblyTotal = positive(inputs.disassemblyHours) * AERO_RATES.disassemblyHourly;
  const pickupEntry = inputs.pickupEnabled ? findAeroTransportCommune(inputs.pickupCommune) : null;
  const deliveryEntry = inputs.deliveryEnabled ? findAeroTransportCommune(inputs.deliveryCommune) : null;
  const pickupTotal = pickupEntry?.amount ?? 0;
  const deliveryTotal = deliveryEntry?.amount ?? 0;
  const totalTtc = aerogommageTotal + disassemblyTotal + pickupTotal + deliveryTotal;

  return {
    furnitureTotal,
    furnitureQuantity,
    doorTotal,
    shutterTotal,
    aerogommageTotal,
    disassemblyTotal,
    pickupEntry,
    pickupTotal,
    deliveryEntry,
    deliveryTotal,
    totalTtc,
  };
}
