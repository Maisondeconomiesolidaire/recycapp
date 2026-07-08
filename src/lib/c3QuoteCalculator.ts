export type C3Departure = "LCP" | "GEB";

export type C3SectorEntry = {
  insee: string;
  commune: string;
  minutes: number;
  km: number;
};

export type C3QuoteInputs = {
  departure: C3Departure;
  commune: string;
  /** Adresse de collecte complète (pour l'affichage du devis). */
  collectAddress?: string;
  /**
   * Distance/durée routières (aller simple) calculées depuis l'adresse de
   * collecte. Prioritaire sur le référentiel commune quand renseignée.
   */
  manualDistance?: { km: number; minutes: number } | null;
  rotations: number;
  vehicles: number;
  travelAgents: number;
  loadingAgents: number;
  loadingHours: number;
  storageFurnitureValue: number;
  tableChairsValue: number;
  cookerValue: number;
  dishwasherWasherValue: number;
  fridgeValue: number;
  otherValue: number;
  wasteVolume: number;
};

export type C3QuoteResult = {
  entry: C3SectorEntry | null;
  /** Distance/durée aller simple retenues (adresse calculée ou référentiel). */
  oneWayKm: number;
  oneWayMinutes: number;
  hasRoute: boolean;
  totalKm: number;
  totalTravelHours: number;
  travelCost: number;
  loadingTotalHours: number;
  loadingCost: number;
  reusableValue: number;
  wasteCost: number;
  subtotalHt: number;
  vat: number;
  totalTtc: number;
};

export const C3_RATES = {
  kilometer: 1,
  travelHourly: 13.06,
  loadingHourly: 13.06,
  wastePerCubicMeter: 60,
  vat: 0.2,
} as const;

export const C3_SECTORS: Record<C3Departure, C3SectorEntry[]> = {
  "LCP": [
    {
      "insee": "60002",
      "commune": "Abbecourt",
      "minutes": 26.566667,
      "km": 26.594
    },
    {
      "insee": "60003",
      "commune": "Abbeville-Saint-Lucien",
      "minutes": 35.3,
      "km": 27.86
    },
    {
      "insee": "60004",
      "commune": "Achy",
      "minutes": 22.183333,
      "km": 16.482
    },
    {
      "insee": "60009",
      "commune": "Allonne",
      "minutes": 19.983333,
      "km": 20.606
    },
    {
      "insee": "27010",
      "commune": "Amécourt",
      "minutes": 28.35,
      "km": 18.838
    },
    {
      "insee": "60026",
      "commune": "Auchy-la-Montagne",
      "minutes": 39.066667,
      "km": 27.988
    },
    {
      "insee": "60029",
      "commune": "Auneuil",
      "minutes": 17.833333,
      "km": 12.756
    },
    {
      "insee": "60030",
      "commune": "Auteuil",
      "minutes": 26.933333,
      "km": 20.612
    },
    {
      "insee": "60703",
      "commune": "Aux Marais",
      "minutes": 17.166667,
      "km": 14.538
    },
    {
      "insee": "76048",
      "commune": "Avesnes-en-Bray",
      "minutes": 26.466667,
      "km": 20.528
    },
    {
      "insee": "60038",
      "commune": "Bachivillers",
      "minutes": 31.333333,
      "km": 23.268
    },
    {
      "insee": "60041",
      "commune": "Bailleul-sur-Thérain",
      "minutes": 32.266667,
      "km": 28.672
    },
    {
      "insee": "60049",
      "commune": "Bazancourt",
      "minutes": 31.016667,
      "km": 22.966
    },
    {
      "insee": "27045",
      "commune": "Bazincourt-sur-Epte",
      "minutes": 28.783333,
      "km": 19.046
    },
    {
      "insee": "60054",
      "commune": "Beaumont-les-Nonains",
      "minutes": 28.866667,
      "km": 20.51
    },
    {
      "insee": "60057",
      "commune": "Beauvais",
      "minutes": 23.2,
      "km": 17.584
    },
    {
      "insee": "76067",
      "commune": "Beauvoir-en-Lyons",
      "minutes": 33.583333,
      "km": 29.04
    },
    {
      "insee": "60063",
      "commune": "Berneuil-en-Bray",
      "minutes": 22.883333,
      "km": 18.918
    },
    {
      "insee": "27059",
      "commune": "Bernouville",
      "minutes": 41.3,
      "km": 28.638
    },
    {
      "insee": "60065",
      "commune": "Berthecourt",
      "minutes": 32.116667,
      "km": 31.392
    },
    {
      "insee": "76093",
      "commune": "Bézancourt",
      "minutes": 32.1,
      "km": 24.274
    },
    {
      "insee": "27066",
      "commune": "Bézu-la-Forêt",
      "minutes": 33.916667,
      "km": 24.508
    },
    {
      "insee": "27067",
      "commune": "Bézu-Saint-Éloi",
      "minutes": 39.9,
      "km": 26.476
    },
    {
      "insee": "60073",
      "commune": "Blacourt",
      "minutes": 6.4,
      "km": 3.834
    },
    {
      "insee": "60076",
      "commune": "Blargies",
      "minutes": 43.216667,
      "km": 31.08
    },
    {
      "insee": "60077",
      "commune": "Blicourt",
      "minutes": 33.716667,
      "km": 23.058
    },
    {
      "insee": "60080",
      "commune": "Boissy-le-Bois",
      "minutes": 33.833333,
      "km": 23.626
    },
    {
      "insee": "60081",
      "commune": "Bonlier",
      "minutes": 32.283333,
      "km": 24.076
    },
    {
      "insee": "60084",
      "commune": "Bonnières",
      "minutes": 16.55,
      "km": 10.804
    },
    {
      "insee": "76124",
      "commune": "Bosc-Hyons",
      "minutes": 29.216667,
      "km": 22.42
    },
    {
      "insee": "27094",
      "commune": "Bosquentin",
      "minutes": 36.983333,
      "km": 27.966
    },
    {
      "insee": "60089",
      "commune": "Boubiers",
      "minutes": 39.316667,
      "km": 30.338
    },
    {
      "insee": "27098",
      "commune": "Bouchevilliers",
      "minutes": 25.316667,
      "km": 19.218
    },
    {
      "insee": "60095",
      "commune": "Boury-en-Vexin",
      "minutes": 42.033333,
      "km": 30.396
    },
    {
      "insee": "60096",
      "commune": "Boutavent",
      "minutes": 37.416667,
      "km": 27.518
    },
    {
      "insee": "60097",
      "commune": "Boutencourt",
      "minutes": 25.166667,
      "km": 16.95
    },
    {
      "insee": "60098",
      "commune": "Bouvresse",
      "minutes": 40.516667,
      "km": 29.784
    },
    {
      "insee": "76142",
      "commune": "Brémontier-Merval",
      "minutes": 29.65,
      "km": 24.49
    },
    {
      "insee": "60103",
      "commune": "Bresles",
      "minutes": 34.833333,
      "km": 29.862
    },
    {
      "insee": "60108",
      "commune": "Briot",
      "minutes": 32.183333,
      "km": 25.28
    },
    {
      "insee": "60109",
      "commune": "Brombos",
      "minutes": 32.15,
      "km": 25.792
    },
    {
      "insee": "60110",
      "commune": "Broquiers",
      "minutes": 39.233333,
      "km": 29.028
    },
    {
      "insee": "60114",
      "commune": "Buicourt",
      "minutes": 23.5,
      "km": 14.604
    },
    {
      "insee": "60122",
      "commune": "Campeaux",
      "minutes": 37.916667,
      "km": 25.59
    },
    {
      "insee": "60128",
      "commune": "Canny-sur-Thérain",
      "minutes": 40.216667,
      "km": 26.344
    },
    {
      "insee": "60131",
      "commune": "Catheux",
      "minutes": 42.75,
      "km": 33.376
    },
    {
      "insee": "60136",
      "commune": "Cempuis",
      "minutes": 34.716667,
      "km": 26.758
    },
    {
      "insee": "60140",
      "commune": "Chambors",
      "minutes": 36.35,
      "km": 26.468
    },
    {
      "insee": "60143",
      "commune": "Chaumont-en-Vexin",
      "minutes": 29.683333,
      "km": 22.064
    },
    {
      "insee": "27153",
      "commune": "Chauvincourt-Provemont",
      "minutes": 45.0,
      "km": 33.624
    },
    {
      "insee": "60153",
      "commune": "Choqueuse-les-Bénards",
      "minutes": 39.25,
      "km": 31.038
    },
    {
      "insee": "60161",
      "commune": "Conteville",
      "minutes": 39.7,
      "km": 30.608
    },
    {
      "insee": "60162",
      "commune": "Corbeil-Cerf",
      "minutes": 35.866667,
      "km": 29.474
    },
    {
      "insee": "60169",
      "commune": "Courcelles-lès-Gisors",
      "minutes": 39.366667,
      "km": 28.246
    },
    {
      "insee": "60178",
      "commune": "Crèvecoeur-le-Grand",
      "minutes": 34.1,
      "km": 27.108
    },
    {
      "insee": "60180",
      "commune": "Crillon",
      "minutes": 15.866667,
      "km": 10.752
    },
    {
      "insee": "60187",
      "commune": "Cuigy-en-Bray",
      "minutes": 8.383333,
      "km": 6.328
    },
    {
      "insee": "76208",
      "commune": "Cuy-Saint-Fiacre",
      "minutes": 23.783333,
      "km": 19.328
    },
    {
      "insee": "60193",
      "commune": "Daméraucourt",
      "minutes": 41.966667,
      "km": 33.414
    },
    {
      "insee": "76209",
      "commune": "Dampierre-en-Bray",
      "minutes": 28.316667,
      "km": 23.104
    },
    {
      "insee": "27199",
      "commune": "Dangu",
      "minutes": 40.616667,
      "km": 31.08
    },
    {
      "insee": "60194",
      "commune": "Dargies",
      "minutes": 40.8,
      "km": 32.918
    },
    {
      "insee": "60195",
      "commune": "Delincourt",
      "minutes": 41.466667,
      "km": 28.596
    },
    {
      "insee": "76218",
      "commune": "Doudeauville",
      "minutes": 32.333333,
      "km": 25.904
    },
    {
      "insee": "27204",
      "commune": "Doudeauville-en-Vexin",
      "minutes": 44.233333,
      "km": 32.996
    },
    {
      "insee": "76229",
      "commune": "Elbeuf-en-Bray",
      "minutes": 26.233333,
      "km": 21.346
    },
    {
      "insee": "60208",
      "commune": "Énencourt-Léage",
      "minutes": 26.516667,
      "km": 19.23
    },
    {
      "insee": "60209",
      "commune": "Énencourt-le-Sec",
      "minutes": 29.866667,
      "km": 21.306
    },
    {
      "insee": "60211",
      "commune": "Éragny-sur-Epte",
      "minutes": 30.233333,
      "km": 20.912
    },
    {
      "insee": "60214",
      "commune": "Ernemont-Boutavent",
      "minutes": 33.783333,
      "km": 21.86
    },
    {
      "insee": "76242",
      "commune": "Ernemont-la-Villette",
      "minutes": 22.816667,
      "km": 19.382
    },
    {
      "insee": "60217",
      "commune": "Escames",
      "minutes": 27.1,
      "km": 16.682
    },
    {
      "insee": "60220",
      "commune": "Espaubourg",
      "minutes": 7.983333,
      "km": 4.82
    },
    {
      "insee": "60222",
      "commune": "Essuiles",
      "minutes": 43.9,
      "km": 33.398
    },
    {
      "insee": "27226",
      "commune": "Étrépagny",
      "minutes": 42.483333,
      "km": 31.052
    },
    {
      "insee": "60228",
      "commune": "Fay-les-Étangs",
      "minutes": 37.533333,
      "km": 27.788
    },
    {
      "insee": "76260",
      "commune": "Ferrières-en-Bray",
      "minutes": 18.766667,
      "km": 15.43
    },
    {
      "insee": "60233",
      "commune": "Feuquières",
      "minutes": 36.1,
      "km": 26.936
    },
    {
      "insee": "60235",
      "commune": "Flavacourt",
      "minutes": 20.6,
      "km": 14.42
    },
    {
      "insee": "60239",
      "commune": "Fleury",
      "minutes": 36.283333,
      "km": 27.394
    },
    {
      "insee": "27245",
      "commune": "Fleury-la-Forêt",
      "minutes": 37.316667,
      "km": 30.502
    },
    {
      "insee": "60242",
      "commune": "Fontaine-Lavaganne",
      "minutes": 25.85,
      "km": 19.498
    },
    {
      "insee": "60243",
      "commune": "Fontaine-Saint-Lucien",
      "minutes": 34.766667,
      "km": 25.126
    },
    {
      "insee": "60244",
      "commune": "Fontenay-Torcy",
      "minutes": 30.233333,
      "km": 20.068
    },
    {
      "insee": "60245",
      "commune": "Formerie",
      "minutes": 42.4,
      "km": 29.954
    },
    {
      "insee": "60250",
      "commune": "Fouquenies",
      "minutes": 22.216667,
      "km": 13.422
    },
    {
      "insee": "60251",
      "commune": "Fouquerolles",
      "minutes": 35.216667,
      "km": 27.358
    },
    {
      "insee": "60253",
      "commune": "Francastel",
      "minutes": 40.0,
      "km": 31.266
    },
    {
      "insee": "60256",
      "commune": "Fresneaux-Montchevreuil",
      "minutes": 34.066667,
      "km": 24.532
    },
    {
      "insee": "60257",
      "commune": "Fresne-Léguillon",
      "minutes": 37.766667,
      "km": 27.902
    },
    {
      "insee": "60264",
      "commune": "Frocourt",
      "minutes": 20.2,
      "km": 18.978
    },
    {
      "insee": "76292",
      "commune": "Fry",
      "minutes": 37.883333,
      "km": 31.544
    },
    {
      "insee": "76295",
      "commune": "Gaillefontaine",
      "minutes": 45.8,
      "km": 35.632
    },
    {
      "insee": "76297",
      "commune": "Gancourt-Saint-Étienne",
      "minutes": 28.866667,
      "km": 23.512
    },
    {
      "insee": "60269",
      "commune": "Gaudechart",
      "minutes": 28.916667,
      "km": 22.006
    },
    {
      "insee": "60271",
      "commune": "Gerberoy",
      "minutes": 23.7,
      "km": 14.592
    },
    {
      "insee": "27284",
      "commune": "Gisors",
      "minutes": 32.75,
      "km": 24.176
    },
    {
      "insee": "60275",
      "commune": "Glatigny",
      "minutes": 9.95,
      "km": 6.524
    },
    {
      "insee": "60277",
      "commune": "Goincourt",
      "minutes": 18.266667,
      "km": 13.382
    },
    {
      "insee": "76312",
      "commune": "Gournay-en-Bray",
      "minutes": 19.766667,
      "km": 16.094
    },
    {
      "insee": "60286",
      "commune": "Grandvilliers",
      "minutes": 35.5,
      "km": 27.748
    },
    {
      "insee": "60288",
      "commune": "Grémévillers",
      "minutes": 21.683333,
      "km": 15.752
    },
    {
      "insee": "60289",
      "commune": "Grez",
      "minutes": 32.583333,
      "km": 24.574
    },
    {
      "insee": "76332",
      "commune": "Grumesnil",
      "minutes": 42.8,
      "km": 29.852
    },
    {
      "insee": "60290",
      "commune": "Guignecourt",
      "minutes": 32.066667,
      "km": 23.244
    },
    {
      "insee": "60295",
      "commune": "Halloy",
      "minutes": 32.3,
      "km": 26.084
    },
    {
      "insee": "60296",
      "commune": "Hannaches",
      "minutes": 20.95,
      "km": 13.69
    },
    {
      "insee": "60298",
      "commune": "Hanvoile",
      "minutes": 15.05,
      "km": 8.81
    },
    {
      "insee": "60300",
      "commune": "Hardivillers-en-Vexin",
      "minutes": 28.683333,
      "km": 20.112
    },
    {
      "insee": "60301",
      "commune": "Haucourt",
      "minutes": 47.266667,
      "km": 33.33
    },
    {
      "insee": "60302",
      "commune": "Haudivillers",
      "minutes": 39.116667,
      "km": 30.782
    },
    {
      "insee": "76345",
      "commune": "Haussez",
      "minutes": 36.333333,
      "km": 28.838
    },
    {
      "insee": "60303",
      "commune": "Hautbos",
      "minutes": 34.033333,
      "km": 24.6
    },
    {
      "insee": "60304",
      "commune": "Haute-Épine",
      "minutes": 27.016667,
      "km": 20.806
    },
    {
      "insee": "27324",
      "commune": "Hébécourt",
      "minutes": 30.466667,
      "km": 20.33
    },
    {
      "insee": "60306",
      "commune": "Hécourt",
      "minutes": 25.016667,
      "km": 15.966
    },
    {
      "insee": "60310",
      "commune": "Herchies",
      "minutes": 19.366667,
      "km": 10.774
    },
    {
      "insee": "60312",
      "commune": "Héricourt-sur-Thérain",
      "minutes": 34.433333,
      "km": 22.718
    },
    {
      "insee": "60314",
      "commune": "Hétomesnil",
      "minutes": 35.683333,
      "km": 27.764
    },
    {
      "insee": "27333",
      "commune": "Heudicourt",
      "minutes": 36.8,
      "km": 26.494
    },
    {
      "insee": "60315",
      "commune": "Hodenc-en-Bray",
      "minutes": 7.883333,
      "km": 4.46
    },
    {
      "insee": "60316",
      "commune": "Hodenc-l'Évêque",
      "minutes": 29.016667,
      "km": 24.06
    },
    {
      "insee": "76364",
      "commune": "Hodeng-Hodenger",
      "minutes": 33.866667,
      "km": 28.35
    },
    {
      "insee": "60321",
      "commune": "Ivry-le-Temple",
      "minutes": 41.866667,
      "km": 31.576
    },
    {
      "insee": "60322",
      "commune": "Jaméricourt",
      "minutes": 26.816667,
      "km": 19.492
    },
    {
      "insee": "60327",
      "commune": "Jouy-sous-Thelle",
      "minutes": 26.816667,
      "km": 19.46
    },
    {
      "insee": "60328",
      "commune": "Juvignies",
      "minutes": 34.016667,
      "km": 22.162
    },
    {
      "insee": "76263",
      "commune": "La Feuillie",
      "minutes": 35.116667,
      "km": 32.53
    },
    {
      "insee": "60319",
      "commune": "La Houssoye",
      "minutes": 21.166667,
      "km": 14.488
    },
    {
      "insee": "27430",
      "commune": "La Neuve-Grange",
      "minutes": 41.183333,
      "km": 30.722
    },
    {
      "insee": "60453",
      "commune": "La Neuville-d'Aumont",
      "minutes": 29.75,
      "km": 24.59
    },
    {
      "insee": "60455",
      "commune": "La Neuville-Garnier",
      "minutes": 26.6,
      "km": 19.382
    },
    {
      "insee": "60457",
      "commune": "La Neuville-Saint-Pierre",
      "minutes": 35.166667,
      "km": 30.484
    },
    {
      "insee": "60458",
      "commune": "La Neuville-sur-Oudeuil",
      "minutes": 27.966667,
      "km": 20.258
    },
    {
      "insee": "60460",
      "commune": "La Neuville-Vault",
      "minutes": 15.8,
      "km": 8.89
    },
    {
      "insee": "60330",
      "commune": "Laboissière-en-Thelle",
      "minutes": 40.033333,
      "km": 31.0
    },
    {
      "insee": "60331",
      "commune": "Labosse",
      "minutes": 19.5,
      "km": 12.606
    },
    {
      "insee": "60333",
      "commune": "Lachapelle-aux-Pots",
      "minutes": 6.383333,
      "km": 3.59
    },
    {
      "insee": "60335",
      "commune": "Lachapelle-sous-Gerberoy",
      "minutes": 19.7,
      "km": 13.39
    },
    {
      "insee": "60336",
      "commune": "Lachaussée-du-Bois-d'Écu",
      "minutes": 39.983333,
      "km": 30.428
    },
    {
      "insee": "60339",
      "commune": "Lafraye",
      "minutes": 37.516667,
      "km": 29.432
    },
    {
      "insee": "60343",
      "commune": "Lalande-en-Son",
      "minutes": 21.183333,
      "km": 12.914
    },
    {
      "insee": "60344",
      "commune": "Lalandelle",
      "minutes": 13.383333,
      "km": 7.826
    },
    {
      "insee": "60352",
      "commune": "Lattainville",
      "minutes": 38.233333,
      "km": 27.6
    },
    {
      "insee": "60354",
      "commune": "Laverrière",
      "minutes": 43.283333,
      "km": 31.648
    },
    {
      "insee": "60355",
      "commune": "Laversines",
      "minutes": 30.983333,
      "km": 26.242
    },
    {
      "insee": "60164",
      "commune": "Le Coudray-Saint-Germer",
      "minutes": 15.05,
      "km": 8.936
    },
    {
      "insee": "60165",
      "commune": "Le Coudray-sur-Thelle",
      "minutes": 34.366667,
      "km": 27.384
    },
    {
      "insee": "60196",
      "commune": "Le Déluge",
      "minutes": 33.583333,
      "km": 27.196
    },
    {
      "insee": "60230",
      "commune": "Le Fay-Saint-Quentin",
      "minutes": 36.116667,
      "km": 29.86
    },
    {
      "insee": "60267",
      "commune": "Le Gallet",
      "minutes": 38.233333,
      "km": 30.528
    },
    {
      "insee": "60297",
      "commune": "Le Hamel",
      "minutes": 37.95,
      "km": 26.956
    },
    {
      "insee": "60401",
      "commune": "Le Mesnil-Théribus",
      "minutes": 30.566667,
      "km": 22.082
    },
    {
      "insee": "60428",
      "commune": "Le Mont-Saint-Adrien",
      "minutes": 20.666667,
      "km": 11.624
    },
    {
      "insee": "60660",
      "commune": "Le Vaumain",
      "minutes": 22.266667,
      "km": 15.214
    },
    {
      "insee": "60662",
      "commune": "Le Vauroux",
      "minutes": 14.566667,
      "km": 10.362
    },
    {
      "insee": "60359",
      "commune": "Lhéraule",
      "minutes": 11.516667,
      "km": 6.912
    },
    {
      "insee": "60361",
      "commune": "Liancourt-Saint-Pierre",
      "minutes": 38.066667,
      "km": 28.004
    },
    {
      "insee": "60363",
      "commune": "Lierville",
      "minutes": 40.166667,
      "km": 32.75
    },
    {
      "insee": "60365",
      "commune": "Lihus",
      "minutes": 30.783333,
      "km": 24.524
    },
    {
      "insee": "27369",
      "commune": "Lilly",
      "minutes": 39.866667,
      "km": 29.94
    },
    {
      "insee": "60367",
      "commune": "Loconville",
      "minutes": 34.933333,
      "km": 25.524
    },
    {
      "insee": "27372",
      "commune": "Longchamps",
      "minutes": 38.216667,
      "km": 28.376
    },
    {
      "insee": "60370",
      "commune": "Lormaison",
      "minutes": 38.216667,
      "km": 31.248
    },
    {
      "insee": "60371",
      "commune": "Loueuse",
      "minutes": 30.8,
      "km": 20.246
    },
    {
      "insee": "60372",
      "commune": "Luchy",
      "minutes": 39.366667,
      "km": 26.068
    },
    {
      "insee": "27379",
      "commune": "Mainneville",
      "minutes": 27.216667,
      "km": 21.812
    },
    {
      "insee": "60376",
      "commune": "Maisoncelle-Saint-Pierre",
      "minutes": 34.083333,
      "km": 23.214
    },
    {
      "insee": "60387",
      "commune": "Marseille-en-Beauvaisis",
      "minutes": 24.833333,
      "km": 18.066
    },
    {
      "insee": "27392",
      "commune": "Martagny",
      "minutes": 30.95,
      "km": 22.062
    },
    {
      "insee": "60388",
      "commune": "Martincourt",
      "minutes": 18.45,
      "km": 11.762
    },
    {
      "insee": "60390",
      "commune": "Maulers",
      "minutes": 38.25,
      "km": 27.914
    },
    {
      "insee": "76423",
      "commune": "Ménerval",
      "minutes": 31.566667,
      "km": 27.138
    },
    {
      "insee": "60395",
      "commune": "Méru",
      "minutes": 39.916667,
      "km": 32.774
    },
    {
      "insee": "76426",
      "commune": "Mésangueville",
      "minutes": 37.416667,
      "km": 30.608
    },
    {
      "insee": "27405",
      "commune": "Mesnil-sous-Vienne",
      "minutes": 30.733333,
      "km": 22.396
    },
    {
      "insee": "60403",
      "commune": "Milly-sur-Thérain",
      "minutes": 23.883333,
      "km": 15.038
    },
    {
      "insee": "76440",
      "commune": "Molagnies",
      "minutes": 26.25,
      "km": 20.63
    },
    {
      "insee": "60405",
      "commune": "Moliens",
      "minutes": 41.833333,
      "km": 30.12
    },
    {
      "insee": "60407",
      "commune": "Monceaux-l'Abbaye",
      "minutes": 38.883333,
      "km": 28.378
    },
    {
      "insee": "60411",
      "commune": "Monneville",
      "minutes": 42.933333,
      "km": 32.07
    },
    {
      "insee": "60417",
      "commune": "Montherlant",
      "minutes": 34.616667,
      "km": 26.958
    },
    {
      "insee": "60420",
      "commune": "Montjavoult",
      "minutes": 41.766667,
      "km": 31.066
    },
    {
      "insee": "60426",
      "commune": "Montreuil-sur-Thérain",
      "minutes": 27.516667,
      "km": 27.36
    },
    {
      "insee": "76450",
      "commune": "Montroty",
      "minutes": 26.816667,
      "km": 20.826
    },
    {
      "insee": "27417",
      "commune": "Morgny",
      "minutes": 38.216667,
      "km": 28.702
    },
    {
      "insee": "60435",
      "commune": "Morvillers",
      "minutes": 25.016667,
      "km": 18.332
    },
    {
      "insee": "60442",
      "commune": "Muidorge",
      "minutes": 39.666667,
      "km": 25.65
    },
    {
      "insee": "60444",
      "commune": "Mureaumont",
      "minutes": 34.266667,
      "km": 24.33
    },
    {
      "insee": "27426",
      "commune": "Neaufles-Saint-Martin",
      "minutes": 35.116667,
      "km": 26.446
    },
    {
      "insee": "76463",
      "commune": "Neuf-Marché",
      "minutes": 23.0,
      "km": 17.252
    },
    {
      "insee": "60461",
      "commune": "Nivillers",
      "minutes": 29.883333,
      "km": 22.91
    },
    {
      "insee": "60462",
      "commune": "Noailles",
      "minutes": 33.366667,
      "km": 29.42
    },
    {
      "insee": "60476",
      "commune": "Omécourt",
      "minutes": 33.55,
      "km": 24.056
    },
    {
      "insee": "60477",
      "commune": "Ons-en-Bray",
      "minutes": 9.583333,
      "km": 5.134
    },
    {
      "insee": "60480",
      "commune": "Oroër",
      "minutes": 34.4,
      "km": 27.65
    },
    {
      "insee": "60484",
      "commune": "Oudeuil",
      "minutes": 29.3,
      "km": 19.766
    },
    {
      "insee": "60490",
      "commune": "Pierrefitte-en-Beauvaisis",
      "minutes": 16.6,
      "km": 9.028
    },
    {
      "insee": "60493",
      "commune": "Pisseleu",
      "minutes": 30.216667,
      "km": 20.532
    },
    {
      "insee": "60504",
      "commune": "Ponchon",
      "minutes": 26.3,
      "km": 27.998
    },
    {
      "insee": "60510",
      "commune": "Porcheux",
      "minutes": 23.65,
      "km": 16.42
    },
    {
      "insee": "60512",
      "commune": "Pouilly",
      "minutes": 37.5,
      "km": 26.974
    },
    {
      "insee": "60514",
      "commune": "Prévillers",
      "minutes": 31.566667,
      "km": 24.386
    },
    {
      "insee": "60516",
      "commune": "Puiseux-en-Bray",
      "minutes": 17.316667,
      "km": 12.576
    },
    {
      "insee": "60523",
      "commune": "Rainvillers",
      "minutes": 17.383333,
      "km": 12.158
    },
    {
      "insee": "60528",
      "commune": "Reilly",
      "minutes": 36.033333,
      "km": 26.834
    },
    {
      "insee": "60532",
      "commune": "Ressons-l'Abbaye",
      "minutes": 31.6,
      "km": 26.546
    },
    {
      "insee": "60535",
      "commune": "Reuil-sur-Brêche",
      "minutes": 40.35,
      "km": 32.274
    },
    {
      "insee": "60542",
      "commune": "Rochy-Condé",
      "minutes": 28.983333,
      "km": 25.906
    },
    {
      "insee": "60549",
      "commune": "Rotangy",
      "minutes": 36.216667,
      "km": 26.144
    },
    {
      "insee": "60550",
      "commune": "Rothois",
      "minutes": 28.833333,
      "km": 21.72
    },
    {
      "insee": "60557",
      "commune": "Roy-Boissy",
      "minutes": 25.683333,
      "km": 18.436
    },
    {
      "insee": "60566",
      "commune": "Saint-Arnoult",
      "minutes": 35.9,
      "km": 25.996
    },
    {
      "insee": "60567",
      "commune": "Saint-Aubin-en-Bray",
      "minutes": 6.15,
      "km": 2.388
    },
    {
      "insee": "60570",
      "commune": "Saint-Crépin-Ibouvillers",
      "minutes": 38.2,
      "km": 29.488
    },
    {
      "insee": "60571",
      "commune": "Saint-Deniscourt",
      "minutes": 29.75,
      "km": 21.082
    },
    {
      "insee": "27533",
      "commune": "Saint-Denis-le-Ferment",
      "minutes": 37.716667,
      "km": 23.092
    },
    {
      "insee": "60576",
      "commune": "Saint-Germain-la-Poterie",
      "minutes": 15.95,
      "km": 10.42
    },
    {
      "insee": "60577",
      "commune": "Saint-Germer-de-Fly",
      "minutes": 14.5,
      "km": 10.412
    },
    {
      "insee": "60583",
      "commune": "Saint-Léger-en-Bray",
      "minutes": 16.416667,
      "km": 13.704
    },
    {
      "insee": "60586",
      "commune": "Saint-Martin-le-Noeud",
      "minutes": 18.85,
      "km": 16.582
    },
    {
      "insee": "60588",
      "commune": "Saint-Maur",
      "minutes": 29.283333,
      "km": 22.778
    },
    {
      "insee": "76623",
      "commune": "Saint-Michel-d'Halescourt",
      "minutes": 40.033333,
      "km": 31.746
    },
    {
      "insee": "60590",
      "commune": "Saint-Omer-en-Chaussée",
      "minutes": 25.483333,
      "km": 17.62
    },
    {
      "insee": "60591",
      "commune": "Saint-Paul",
      "minutes": 10.85,
      "km": 8.162
    },
    {
      "insee": "60592",
      "commune": "Saint-Pierre-es-Champs",
      "minutes": 19.1,
      "km": 15.34
    },
    {
      "insee": "60594",
      "commune": "Saint-Quentin-des-Prés",
      "minutes": 24.25,
      "km": 19.422
    },
    {
      "insee": "60596",
      "commune": "Saint-Samson-la-Poterie",
      "minutes": 35.416667,
      "km": 24.132
    },
    {
      "insee": "60598",
      "commune": "Saint-Sulpice",
      "minutes": 23.683333,
      "km": 23.022
    },
    {
      "insee": "27614",
      "commune": "Sancourt",
      "minutes": 34.95,
      "km": 24.922
    },
    {
      "insee": "60604",
      "commune": "Sarcus",
      "minutes": 37.933333,
      "km": 30.022
    },
    {
      "insee": "60605",
      "commune": "Sarnois",
      "minutes": 37.5,
      "km": 29.528
    },
    {
      "insee": "76666",
      "commune": "Saumont-la-Poterie",
      "minutes": 32.416667,
      "km": 30.026
    },
    {
      "insee": "60609",
      "commune": "Savignies",
      "minutes": 14.45,
      "km": 7.198
    },
    {
      "insee": "60611",
      "commune": "Senantes",
      "minutes": 13.15,
      "km": 8.766
    },
    {
      "insee": "60613",
      "commune": "Senots",
      "minutes": 38.5,
      "km": 26.942
    },
    {
      "insee": "60616",
      "commune": "Sérifontaine",
      "minutes": 20.933333,
      "km": 14.1
    },
    {
      "insee": "60620",
      "commune": "Silly-Tillard",
      "minutes": 32.65,
      "km": 26.544
    },
    {
      "insee": "60622",
      "commune": "Sommereux",
      "minutes": 41.933333,
      "km": 30.426
    },
    {
      "insee": "60623",
      "commune": "Songeons",
      "minutes": 26.4,
      "km": 16.314
    },
    {
      "insee": "60624",
      "commune": "Sully",
      "minutes": 28.566667,
      "km": 18.428
    },
    {
      "insee": "60626",
      "commune": "Talmontiers",
      "minutes": 22.666667,
      "km": 15.274
    },
    {
      "insee": "60628",
      "commune": "Therdonne",
      "minutes": 27.883333,
      "km": 21.734
    },
    {
      "insee": "60629",
      "commune": "Thérines",
      "minutes": 28.766667,
      "km": 21.138
    },
    {
      "insee": "60630",
      "commune": "Thibivillers",
      "minutes": 25.316667,
      "km": 17.738
    },
    {
      "insee": "60633",
      "commune": "Thieuloy-Saint-Antoine",
      "minutes": 29.516667,
      "km": 23.716
    },
    {
      "insee": "60639",
      "commune": "Tillé",
      "minutes": 29.25,
      "km": 20.768
    },
    {
      "insee": "60640",
      "commune": "Tourly",
      "minutes": 42.15,
      "km": 31.798
    },
    {
      "insee": "60644",
      "commune": "Trie-Château",
      "minutes": 34.566667,
      "km": 22.96
    },
    {
      "insee": "60645",
      "commune": "Trie-la-Ville",
      "minutes": 28.383333,
      "km": 21.57
    },
    {
      "insee": "60646",
      "commune": "Troissereux",
      "minutes": 26.716667,
      "km": 15.472
    },
    {
      "insee": "60649",
      "commune": "Troussures",
      "minutes": 12.333333,
      "km": 9.106
    },
    {
      "insee": "60652",
      "commune": "Valdampierre",
      "minutes": 33.516667,
      "km": 23.944
    },
    {
      "insee": "60659",
      "commune": "Vaudancourt",
      "minutes": 43.25,
      "km": 30.798
    },
    {
      "insee": "60663",
      "commune": "Velennes",
      "minutes": 35.416667,
      "km": 26.9
    },
    {
      "insee": "60668",
      "commune": "Verderel-lès-Sauqueuse",
      "minutes": 29.816667,
      "km": 18.298
    },
    {
      "insee": "60673",
      "commune": "Viefvillers",
      "minutes": 35.416667,
      "km": 29.562
    },
    {
      "insee": "60677",
      "commune": "Villembray",
      "minutes": 11.583333,
      "km": 7.282
    },
    {
      "insee": "60681",
      "commune": "Villers-Saint-Barthélemy",
      "minutes": 12.116667,
      "km": 8.148
    },
    {
      "insee": "60685",
      "commune": "Villers-Saint-Sépulcre",
      "minutes": 30.816667,
      "km": 29.678
    },
    {
      "insee": "60687",
      "commune": "Villers-sur-Auchy",
      "minutes": 16.416667,
      "km": 12.666
    },
    {
      "insee": "60688",
      "commune": "Villers-sur-Bonnières",
      "minutes": 18.6,
      "km": 13.38
    },
    {
      "insee": "60690",
      "commune": "Villers-sur-Trie",
      "minutes": 27.633333,
      "km": 19.204
    },
    {
      "insee": "60691",
      "commune": "Villers-Vermont",
      "minutes": 34.0,
      "km": 24.372
    },
    {
      "insee": "60694",
      "commune": "Villotran",
      "minutes": 24.366667,
      "km": 17.248
    },
    {
      "insee": "60697",
      "commune": "Vrocourt",
      "minutes": 19.316667,
      "km": 12.61
    },
    {
      "insee": "60699",
      "commune": "Wambez",
      "minutes": 19.05,
      "km": 12.44
    },
    {
      "insee": "60700",
      "commune": "Warluis",
      "minutes": 22.6,
      "km": 23.78
    }
  ],
  "GEB": [
    {
      "insee": "60001",
      "commune": "Abancourt",
      "minutes": 42.666667,
      "km": 29.036
    },
    {
      "insee": "60002",
      "commune": "Abbecourt",
      "minutes": 40.183333,
      "km": 40.9
    },
    {
      "insee": "60003",
      "commune": "Abbeville-Saint-Lucien",
      "minutes": 47.85,
      "km": 42.328
    },
    {
      "insee": "60004",
      "commune": "Achy",
      "minutes": 27.633333,
      "km": 24.422
    },
    {
      "insee": "60009",
      "commune": "Allonne",
      "minutes": 35.95,
      "km": 35.828
    },
    {
      "insee": "95011",
      "commune": "Ambleville",
      "minutes": 53.216667,
      "km": 41.974
    },
    {
      "insee": "27010",
      "commune": "Amécourt",
      "minutes": 14.616667,
      "km": 12.192
    },
    {
      "insee": "27012",
      "commune": "Amfreville-les-Champs",
      "minutes": 51.55,
      "km": 42.076
    },
    {
      "insee": "76025",
      "commune": "Argueil",
      "minutes": 24.15,
      "km": 18.808
    },
    {
      "insee": "60026",
      "commune": "Auchy-la-Montagne",
      "minutes": 39.65,
      "km": 37.592
    },
    {
      "insee": "76035",
      "commune": "Aumale",
      "minutes": 50.216667,
      "km": 38.828
    },
    {
      "insee": "60029",
      "commune": "Auneuil",
      "minutes": 32.366667,
      "km": 26.582
    },
    {
      "insee": "60030",
      "commune": "Auteuil",
      "minutes": 39.7,
      "km": 36.434
    },
    {
      "insee": "27026",
      "commune": "Authevernes",
      "minutes": 42.4,
      "km": 34.334
    },
    {
      "insee": "76042",
      "commune": "Auvilliers",
      "minutes": 47.016667,
      "km": 39.568
    },
    {
      "insee": "60703",
      "commune": "Aux Marais",
      "minutes": 32.45,
      "km": 29.514
    },
    {
      "insee": "76046",
      "commune": "Auzouville-sur-Ry",
      "minutes": 34.716667,
      "km": 34.284
    },
    {
      "insee": "76048",
      "commune": "Avesnes-en-Bray",
      "minutes": 10.033333,
      "km": 5.904
    },
    {
      "insee": "27034",
      "commune": "Bacqueville",
      "minutes": 47.366667,
      "km": 37.0
    },
    {
      "insee": "60049",
      "commune": "Bazancourt",
      "minutes": 17.333333,
      "km": 11.53
    },
    {
      "insee": "27045",
      "commune": "Bazincourt-sur-Epte",
      "minutes": 21.233333,
      "km": 18.476
    },
    {
      "insee": "76060",
      "commune": "Beaubec-la-Rosière",
      "minutes": 32.0,
      "km": 27.438
    },
    {
      "insee": "60051",
      "commune": "Beaudéduit",
      "minutes": 47.5,
      "km": 40.462
    },
    {
      "insee": "27048",
      "commune": "Beauficel-en-Lyons",
      "minutes": 26.75,
      "km": 20.046
    },
    {
      "insee": "60054",
      "commune": "Beaumont-les-Nonains",
      "minutes": 43.766667,
      "km": 33.024
    },
    {
      "insee": "76065",
      "commune": "Beaussault",
      "minutes": 36.316667,
      "km": 30.5
    },
    {
      "insee": "60057",
      "commune": "Beauvais",
      "minutes": 37.633333,
      "km": 31.956
    },
    {
      "insee": "76067",
      "commune": "Beauvoir-en-Lyons",
      "minutes": 18.633333,
      "km": 14.464
    },
    {
      "insee": "60063",
      "commune": "Berneuil-en-Bray",
      "minutes": 38.916667,
      "km": 33.836
    },
    {
      "insee": "27059",
      "commune": "Bernouville",
      "minutes": 30.15,
      "km": 25.126
    },
    {
      "insee": "76093",
      "commune": "Bézancourt",
      "minutes": 15.616667,
      "km": 11.634
    },
    {
      "insee": "27066",
      "commune": "Bézu-la-Forêt",
      "minutes": 18.05,
      "km": 13.788
    },
    {
      "insee": "27067",
      "commune": "Bézu-Saint-Éloi",
      "minutes": 25.55,
      "km": 22.198
    },
    {
      "insee": "76094",
      "commune": "Bierville",
      "minutes": 45.8,
      "km": 41.146
    },
    {
      "insee": "60073",
      "commune": "Blacourt",
      "minutes": 19.216667,
      "km": 15.292
    },
    {
      "insee": "76100",
      "commune": "Blainville-Crevon",
      "minutes": 41.116667,
      "km": 37.508
    },
    {
      "insee": "60076",
      "commune": "Blargies",
      "minutes": 37.9,
      "km": 26.362
    },
    {
      "insee": "60077",
      "commune": "Blicourt",
      "minutes": 36.116667,
      "km": 32.682
    },
    {
      "insee": "76106",
      "commune": "Bois-d'Ennebourg",
      "minutes": 41.95,
      "km": 39.636
    },
    {
      "insee": "76107",
      "commune": "Bois-Guilbert",
      "minutes": 37.85,
      "km": 29.182
    },
    {
      "insee": "76109",
      "commune": "Bois-Héroult",
      "minutes": 35.683333,
      "km": 29.7
    },
    {
      "insee": "76111",
      "commune": "Bois-l'Évêque",
      "minutes": 37.5,
      "km": 37.554
    },
    {
      "insee": "76113",
      "commune": "Boissay",
      "minutes": 37.366667,
      "km": 34.156
    },
    {
      "insee": "60081",
      "commune": "Bonlier",
      "minutes": 46.033333,
      "km": 38.884
    },
    {
      "insee": "60084",
      "commune": "Bonnières",
      "minutes": 24.85,
      "km": 21.72
    },
    {
      "insee": "76120",
      "commune": "Bosc-Bordel",
      "minutes": 32.85,
      "km": 31.446
    },
    {
      "insee": "76121",
      "commune": "Bosc-Édeline",
      "minutes": 31.983333,
      "km": 29.054
    },
    {
      "insee": "76124",
      "commune": "Bosc-Hyons",
      "minutes": 11.833333,
      "km": 7.932
    },
    {
      "insee": "76126",
      "commune": "Bosc-Mesnil",
      "minutes": 40.016667,
      "km": 40.138
    },
    {
      "insee": "27094",
      "commune": "Bosquentin",
      "minutes": 19.85,
      "km": 15.048
    },
    {
      "insee": "60089",
      "commune": "Boubiers",
      "minutes": 37.2,
      "km": 33.98
    },
    {
      "insee": "27098",
      "commune": "Bouchevilliers",
      "minutes": 8.85,
      "km": 8.112
    },
    {
      "insee": "60090",
      "commune": "Bouconvillers",
      "minutes": 42.733333,
      "km": 39.128
    },
    {
      "insee": "76130",
      "commune": "Bouelles",
      "minutes": 43.116667,
      "km": 36.654
    },
    {
      "insee": "27104",
      "commune": "Bourg-Beaudouin",
      "minutes": 43.45,
      "km": 38.776
    },
    {
      "insee": "60095",
      "commune": "Boury-en-Vexin",
      "minutes": 37.533333,
      "km": 30.85
    },
    {
      "insee": "60097",
      "commune": "Boutencourt",
      "minutes": 28.633333,
      "km": 25.14
    },
    {
      "insee": "60098",
      "commune": "Bouvresse",
      "minutes": 36.016667,
      "km": 24.7
    },
    {
      "insee": "76139",
      "commune": "Bradiancourt",
      "minutes": 36.2,
      "km": 36.692
    },
    {
      "insee": "76142",
      "commune": "Brémontier-Merval",
      "minutes": 15.033333,
      "km": 10.966
    },
    {
      "insee": "60108",
      "commune": "Briot",
      "minutes": 35.566667,
      "km": 28.238
    },
    {
      "insee": "60109",
      "commune": "Brombos",
      "minutes": 35.233333,
      "km": 27.614
    },
    {
      "insee": "60110",
      "commune": "Broquiers",
      "minutes": 39.066667,
      "km": 27.78
    },
    {
      "insee": "76146",
      "commune": "Buchy",
      "minutes": 40.066667,
      "km": 36.004
    },
    {
      "insee": "95119",
      "commune": "Buhy",
      "minutes": 41.333333,
      "km": 36.858
    },
    {
      "insee": "60114",
      "commune": "Buicourt",
      "minutes": 14.383333,
      "km": 10.894
    },
    {
      "insee": "60122",
      "commune": "Campeaux",
      "minutes": 28.916667,
      "km": 19.69
    },
    {
      "insee": "60128",
      "commune": "Canny-sur-Thérain",
      "minutes": 26.883333,
      "km": 18.676
    },
    {
      "insee": "76163",
      "commune": "Catenay",
      "minutes": 38.85,
      "km": 35.246
    },
    {
      "insee": "60131",
      "commune": "Catheux",
      "minutes": 44.55,
      "km": 39.96
    },
    {
      "insee": "60136",
      "commune": "Cempuis",
      "minutes": 37.133333,
      "km": 32.69
    },
    {
      "insee": "60140",
      "commune": "Chambors",
      "minutes": 30.666667,
      "km": 26.83
    },
    {
      "insee": "27151",
      "commune": "Charleval",
      "minutes": 35.35,
      "km": 31.738
    },
    {
      "insee": "95141",
      "commune": "Charmont",
      "minutes": 49.7,
      "km": 40.64
    },
    {
      "insee": "95142",
      "commune": "Chars",
      "minutes": 45.516667,
      "km": 41.7
    },
    {
      "insee": "27152",
      "commune": "Château-sur-Epte",
      "minutes": 43.433333,
      "km": 35.846
    },
    {
      "insee": "60143",
      "commune": "Chaumont-en-Vexin",
      "minutes": 40.266667,
      "km": 32.06
    },
    {
      "insee": "27153",
      "commune": "Chauvincourt-Provemont",
      "minutes": 33.366667,
      "km": 26.6
    },
    {
      "insee": "60153",
      "commune": "Choqueuse-les-Bénards",
      "minutes": 40.7,
      "km": 37.326
    },
    {
      "insee": "76185",
      "commune": "Compainville",
      "minutes": 32.883333,
      "km": 27.824
    },
    {
      "insee": "76186",
      "commune": "Conteville",
      "minutes": 36.016667,
      "km": 30.234
    },
    {
      "insee": "60161",
      "commune": "Conteville",
      "minutes": 41.0,
      "km": 37.6
    },
    {
      "insee": "27176",
      "commune": "Coudray",
      "minutes": 31.133333,
      "km": 25.91
    },
    {
      "insee": "60169",
      "commune": "Courcelles-lès-Gisors",
      "minutes": 30.366667,
      "km": 27.738
    },
    {
      "insee": "60178",
      "commune": "Crèvecoeur-le-Grand",
      "minutes": 36.283333,
      "km": 34.762
    },
    {
      "insee": "60180",
      "commune": "Crillon",
      "minutes": 20.3,
      "km": 18.524
    },
    {
      "insee": "76199",
      "commune": "Criquiers",
      "minutes": 38.766667,
      "km": 27.98
    },
    {
      "insee": "76201",
      "commune": "Croisy-sur-Andelle",
      "minutes": 25.566667,
      "km": 26.31
    },
    {
      "insee": "60187",
      "commune": "Cuigy-en-Bray",
      "minutes": 16.183333,
      "km": 13.228
    },
    {
      "insee": "27194",
      "commune": "Cuverville",
      "minutes": 46.116667,
      "km": 37.506
    },
    {
      "insee": "76208",
      "commune": "Cuy-Saint-Fiacre",
      "minutes": 10.333333,
      "km": 5.86
    },
    {
      "insee": "60193",
      "commune": "Daméraucourt",
      "minutes": 42.533333,
      "km": 36.092
    },
    {
      "insee": "76209",
      "commune": "Dampierre-en-Bray",
      "minutes": 15.366667,
      "km": 10.124
    },
    {
      "insee": "27199",
      "commune": "Dangu",
      "minutes": 35.283333,
      "km": 28.814
    },
    {
      "insee": "60194",
      "commune": "Dargies",
      "minutes": 41.733333,
      "km": 35.948
    },
    {
      "insee": "60195",
      "commune": "Delincourt",
      "minutes": 34.166667,
      "km": 29.174
    },
    {
      "insee": "60199",
      "commune": "Doméliers",
      "minutes": 42.683333,
      "km": 42.082
    },
    {
      "insee": "76218",
      "commune": "Doudeauville",
      "minutes": 19.2,
      "km": 12.694
    },
    {
      "insee": "27204",
      "commune": "Doudeauville-en-Vexin",
      "minutes": 28.583333,
      "km": 22.032
    },
    {
      "insee": "27205",
      "commune": "Douville-sur-Andelle",
      "minutes": 49.066667,
      "km": 40.496
    },
    {
      "insee": "27214",
      "commune": "Écouis",
      "minutes": 40.6,
      "km": 32.482
    },
    {
      "insee": "76229",
      "commune": "Elbeuf-en-Bray",
      "minutes": 11.05,
      "km": 7.238
    },
    {
      "insee": "76230",
      "commune": "Elbeuf-sur-Andelle",
      "minutes": 30.35,
      "km": 28.178
    },
    {
      "insee": "60205",
      "commune": "Élencourt",
      "minutes": 41.133333,
      "km": 34.642
    },
    {
      "insee": "60208",
      "commune": "Énencourt-Léage",
      "minutes": 28.416667,
      "km": 24.666
    },
    {
      "insee": "80276",
      "commune": "Équennes-Éramecourt",
      "minutes": 42.866667,
      "km": 39.302
    },
    {
      "insee": "60211",
      "commune": "Éragny-sur-Epte",
      "minutes": 22.3,
      "km": 20.09
    },
    {
      "insee": "60214",
      "commune": "Ernemont-Boutavent",
      "minutes": 27.45,
      "km": 18.824
    },
    {
      "insee": "76242",
      "commune": "Ernemont-la-Villette",
      "minutes": 3.583333,
      "km": 2.966
    },
    {
      "insee": "76243",
      "commune": "Ernemont-sur-Buchy",
      "minutes": 40.466667,
      "km": 33.794
    },
    {
      "insee": "60217",
      "commune": "Escames",
      "minutes": 19.716667,
      "km": 13.494
    },
    {
      "insee": "76244",
      "commune": "Esclavelles",
      "minutes": 38.55,
      "km": 40.638
    },
    {
      "insee": "60219",
      "commune": "Escles-Saint-Pierre",
      "minutes": 51.283333,
      "km": 38.36
    },
    {
      "insee": "60220",
      "commune": "Espaubourg",
      "minutes": 19.133333,
      "km": 15.736
    },
    {
      "insee": "27226",
      "commune": "Étrépagny",
      "minutes": 28.0,
      "km": 22.346
    },
    {
      "insee": "27232",
      "commune": "Farceaux",
      "minutes": 35.666667,
      "km": 27.812
    },
    {
      "insee": "60228",
      "commune": "Fay-les-Étangs",
      "minutes": 47.85,
      "km": 36.076
    },
    {
      "insee": "76260",
      "commune": "Ferrières-en-Bray",
      "minutes": 6.783333,
      "km": 4.098
    },
    {
      "insee": "60233",
      "commune": "Feuquières",
      "minutes": 36.05,
      "km": 26.39
    },
    {
      "insee": "76265",
      "commune": "Flamets-Frétils",
      "minutes": 41.933333,
      "km": 35.764
    },
    {
      "insee": "60235",
      "commune": "Flavacourt",
      "minutes": 22.766667,
      "km": 20.646
    },
    {
      "insee": "60239",
      "commune": "Fleury",
      "minutes": 48.866667,
      "km": 38.356
    },
    {
      "insee": "27245",
      "commune": "Fleury-la-Forêt",
      "minutes": 21.533333,
      "km": 17.666
    },
    {
      "insee": "27246",
      "commune": "Fleury-sur-Andelle",
      "minutes": 42.35,
      "km": 35.622
    },
    {
      "insee": "76269",
      "commune": "Fontaine-en-Bray",
      "minutes": 35.333333,
      "km": 36.55
    },
    {
      "insee": "60242",
      "commune": "Fontaine-Lavaganne",
      "minutes": 26.833333,
      "km": 25.988
    },
    {
      "insee": "60243",
      "commune": "Fontaine-Saint-Lucien",
      "minutes": 49.066667,
      "km": 39.56
    },
    {
      "insee": "60244",
      "commune": "Fontenay-Torcy",
      "minutes": 22.266667,
      "km": 14.298
    },
    {
      "insee": "76276",
      "commune": "Forges-les-Eaux",
      "minutes": 28.016667,
      "km": 24.698
    },
    {
      "insee": "60245",
      "commune": "Formerie",
      "minutes": 34.066667,
      "km": 23.926
    },
    {
      "insee": "60248",
      "commune": "Fouilloy",
      "minutes": 47.6,
      "km": 36.04
    },
    {
      "insee": "60250",
      "commune": "Fouquenies",
      "minutes": 37.4,
      "km": 27.618
    },
    {
      "insee": "60251",
      "commune": "Fouquerolles",
      "minutes": 49.166667,
      "km": 41.894
    },
    {
      "insee": "80340",
      "commune": "Fourcigny",
      "minutes": 50.483333,
      "km": 40.678
    },
    {
      "insee": "60253",
      "commune": "Francastel",
      "minutes": 42.033333,
      "km": 39.88
    },
    {
      "insee": "27070",
      "commune": "Frenelles-en-Vexin",
      "minutes": 42.4,
      "km": 33.678
    },
    {
      "insee": "60257",
      "commune": "Fresne-Léguillon",
      "minutes": 52.15,
      "km": 39.19
    },
    {
      "insee": "76285",
      "commune": "Fresne-le-Plan",
      "minutes": 38.983333,
      "km": 37.222
    },
    {
      "insee": "60264",
      "commune": "Frocourt",
      "minutes": 35.833333,
      "km": 34.016
    },
    {
      "insee": "76292",
      "commune": "Fry",
      "minutes": 21.35,
      "km": 16.366
    },
    {
      "insee": "76295",
      "commune": "Gaillefontaine",
      "minutes": 29.733333,
      "km": 24.564
    },
    {
      "insee": "27276",
      "commune": "Gamaches-en-Vexin",
      "minutes": 34.7,
      "km": 27.378
    },
    {
      "insee": "76297",
      "commune": "Gancourt-Saint-Étienne",
      "minutes": 15.4,
      "km": 10.024
    },
    {
      "insee": "60269",
      "commune": "Gaudechart",
      "minutes": 31.033333,
      "km": 28.23
    },
    {
      "insee": "80375",
      "commune": "Gauville",
      "minutes": 52.483333,
      "km": 41.872
    },
    {
      "insee": "60271",
      "commune": "Gerberoy",
      "minutes": 17.066667,
      "km": 13.24
    },
    {
      "insee": "27284",
      "commune": "Gisors",
      "minutes": 26.583333,
      "km": 24.14
    },
    {
      "insee": "60275",
      "commune": "Glatigny",
      "minutes": 22.883333,
      "km": 16.31
    },
    {
      "insee": "60277",
      "commune": "Goincourt",
      "minutes": 33.316667,
      "km": 28.052
    },
    {
      "insee": "60280",
      "commune": "Gourchelles",
      "minutes": 48.233333,
      "km": 33.962
    },
    {
      "insee": "76312",
      "commune": "Gournay-en-Bray",
      "minutes": 1.416667,
      "km": 0.858
    },
    {
      "insee": "76316",
      "commune": "Grainville-sur-Ry",
      "minutes": 34.3,
      "km": 35.664
    },
    {
      "insee": "60286",
      "commune": "Grandvilliers",
      "minutes": 36.35,
      "km": 30.506
    },
    {
      "insee": "76323",
      "commune": "Graval",
      "minutes": 45.166667,
      "km": 37.886
    },
    {
      "insee": "60288",
      "commune": "Grémévillers",
      "minutes": 19.566667,
      "km": 18.81
    },
    {
      "insee": "60289",
      "commune": "Grez",
      "minutes": 33.716667,
      "km": 30.29
    },
    {
      "insee": "76332",
      "commune": "Grumesnil",
      "minutes": 29.466667,
      "km": 21.136
    },
    {
      "insee": "27304",
      "commune": "Guerny",
      "minutes": 38.05,
      "km": 32.322
    },
    {
      "insee": "60290",
      "commune": "Guignecourt",
      "minutes": 46.216667,
      "km": 37.916
    },
    {
      "insee": "27307",
      "commune": "Guiseniers",
      "minutes": 50.566667,
      "km": 38.552
    },
    {
      "insee": "80402",
      "commune": "Guizancourt",
      "minutes": 45.816667,
      "km": 40.384
    },
    {
      "insee": "27310",
      "commune": "Hacqueville",
      "minutes": 36.066667,
      "km": 28.184
    },
    {
      "insee": "60293",
      "commune": "Hadancourt-le-Haut-Clocher",
      "minutes": 40.566667,
      "km": 36.228
    },
    {
      "insee": "60295",
      "commune": "Halloy",
      "minutes": 33.783333,
      "km": 30.96
    },
    {
      "insee": "60296",
      "commune": "Hannaches",
      "minutes": 9.3,
      "km": 7.932
    },
    {
      "insee": "60298",
      "commune": "Hanvoile",
      "minutes": 19.45,
      "km": 15.12
    },
    {
      "insee": "27315",
      "commune": "Harquency",
      "minutes": 44.766667,
      "km": 35.97
    },
    {
      "insee": "60301",
      "commune": "Haucourt",
      "minutes": 25.0,
      "km": 22.8
    },
    {
      "insee": "76343",
      "commune": "Haucourt",
      "minutes": 25.0,
      "km": 24.6
    },
    {
      "insee": "76344",
      "commune": "Haudricourt",
      "minutes": 43.466667,
      "km": 36.036
    },
    {
      "insee": "76345",
      "commune": "Haussez",
      "minutes": 22.966667,
      "km": 15.988
    },
    {
      "insee": "60303",
      "commune": "Hautbos",
      "minutes": 31.883333,
      "km": 24.89
    },
    {
      "insee": "60304",
      "commune": "Haute-Épine",
      "minutes": 28.916667,
      "km": 28.474
    },
    {
      "insee": "27324",
      "commune": "Hébécourt",
      "minutes": 17.233333,
      "km": 14.328
    },
    {
      "insee": "60306",
      "commune": "Hécourt",
      "minutes": 11.15,
      "km": 8.126
    },
    {
      "insee": "27329",
      "commune": "Hennezis",
      "minutes": 54.983333,
      "km": 42.072
    },
    {
      "insee": "60310",
      "commune": "Herchies",
      "minutes": 33.166667,
      "km": 24.474
    },
    {
      "insee": "60312",
      "commune": "Héricourt-sur-Thérain",
      "minutes": 25.65,
      "km": 17.34
    },
    {
      "insee": "76359",
      "commune": "Héronchelles",
      "minutes": 39.783333,
      "km": 31.47
    },
    {
      "insee": "80436",
      "commune": "Hescamps",
      "minutes": 50.083333,
      "km": 40.01
    },
    {
      "insee": "60314",
      "commune": "Hétomesnil",
      "minutes": 37.783333,
      "km": 34.602
    },
    {
      "insee": "27333",
      "commune": "Heudicourt",
      "minutes": 21.25,
      "km": 17.798
    },
    {
      "insee": "27337",
      "commune": "Heuqueville",
      "minutes": 50.816667,
      "km": 41.4
    },
    {
      "insee": "60315",
      "commune": "Hodenc-en-Bray",
      "minutes": 25.5,
      "km": 18.826
    },
    {
      "insee": "60316",
      "commune": "Hodenc-l'Évêque",
      "minutes": 45.3,
      "km": 39.484
    },
    {
      "insee": "76364",
      "commune": "Hodeng-Hodenger",
      "minutes": 19.05,
      "km": 14.0
    },
    {
      "insee": "95309",
      "commune": "Hodent",
      "minutes": 51.433333,
      "km": 40.334
    },
    {
      "insee": "27346",
      "commune": "Houville-en-Vexin",
      "minutes": 46.466667,
      "km": 37.406
    },
    {
      "insee": "76372",
      "commune": "Illois",
      "minutes": 43.9,
      "km": 37.078
    },
    {
      "insee": "60322",
      "commune": "Jaméricourt",
      "minutes": 30.9,
      "km": 26.646
    },
    {
      "insee": "60327",
      "commune": "Jouy-sous-Thelle",
      "minutes": 40.566667,
      "km": 30.16
    },
    {
      "insee": "60328",
      "commune": "Juvignies",
      "minutes": 40.983333,
      "km": 34.706
    },
    {
      "insee": "76074",
      "commune": "La Bellière",
      "minutes": 21.783333,
      "km": 20.628
    },
    {
      "insee": "95139",
      "commune": "La Chapelle-en-Vexin",
      "minutes": 44.466667,
      "km": 36.71
    },
    {
      "insee": "76171",
      "commune": "La Chapelle-Saint-Ouen",
      "minutes": 33.7,
      "km": 27.028
    },
    {
      "insee": "60209",
      "commune": "La Corne-en-Vexin",
      "minutes": 45.716667,
      "km": 32.994
    },
    {
      "insee": "60196",
      "commune": "La Drenne",
      "minutes": 46.65,
      "km": 40.534
    },
    {
      "insee": "76261",
      "commune": "La Ferté-Saint-Samson",
      "minutes": 24.116667,
      "km": 20.478
    },
    {
      "insee": "76263",
      "commune": "La Feuillie",
      "minutes": 20.35,
      "km": 18.79
    },
    {
      "insee": "76338",
      "commune": "La Hallotière",
      "minutes": 28.416667,
      "km": 21.91
    },
    {
      "insee": "76352",
      "commune": "La Haye",
      "minutes": 22.533333,
      "km": 23.144
    },
    {
      "insee": "60319",
      "commune": "La Houssoye",
      "minutes": 35.483333,
      "km": 25.894
    },
    {
      "insee": "27430",
      "commune": "La Neuve-Grange",
      "minutes": 23.933333,
      "km": 19.886
    },
    {
      "insee": "60458",
      "commune": "La Neuville-sur-Oudeuil",
      "minutes": 30.85,
      "km": 28.796
    },
    {
      "insee": "60460",
      "commune": "La Neuville-Vault",
      "minutes": 29.333333,
      "km": 21.06
    },
    {
      "insee": "76740",
      "commune": "La Vieux-Rue",
      "minutes": 40.35,
      "km": 40.956
    },
    {
      "insee": "60331",
      "commune": "Labosse",
      "minutes": 31.033333,
      "km": 24.198
    },
    {
      "insee": "60333",
      "commune": "Lachapelle-aux-Pots",
      "minutes": 22.6,
      "km": 18.946
    },
    {
      "insee": "60335",
      "commune": "Lachapelle-sous-Gerberoy",
      "minutes": 14.716667,
      "km": 14.212
    },
    {
      "insee": "60343",
      "commune": "Lalande-en-Son",
      "minutes": 18.183333,
      "km": 14.454
    },
    {
      "insee": "60344",
      "commune": "Lalandelle",
      "minutes": 25.616667,
      "km": 18.936
    },
    {
      "insee": "76381",
      "commune": "Landes-Vieilles-et-Neuves",
      "minutes": 51.35,
      "km": 42.21
    },
    {
      "insee": "60347",
      "commune": "Lannoy-Cuillère",
      "minutes": 46.05,
      "km": 32.446
    },
    {
      "insee": "60352",
      "commune": "Lattainville",
      "minutes": 32.583333,
      "km": 28.412
    },
    {
      "insee": "60354",
      "commune": "Laverrière",
      "minutes": 44.966667,
      "km": 36.638
    },
    {
      "insee": "60355",
      "commune": "Laversines",
      "minutes": 47.833333,
      "km": 41.928
    },
    {
      "insee": "60356",
      "commune": "Lavilletertre",
      "minutes": 48.3,
      "km": 41.448
    },
    {
      "insee": "95054",
      "commune": "Le Bellay-en-Vexin",
      "minutes": 44.366667,
      "km": 41.3
    },
    {
      "insee": "76166",
      "commune": "Le Caule-Sainte-Beuve",
      "minutes": 45.9,
      "km": 39.006
    },
    {
      "insee": "60164",
      "commune": "Le Coudray-Saint-Germer",
      "minutes": 20.283333,
      "km": 15.806
    },
    {
      "insee": "60165",
      "commune": "Le Coudray-sur-Thelle",
      "minutes": 49.966667,
      "km": 42.36
    },
    {
      "insee": "60267",
      "commune": "Le Gallet",
      "minutes": 40.433333,
      "km": 38.1
    },
    {
      "insee": "60297",
      "commune": "Le Hamel",
      "minutes": 40.016667,
      "km": 34.026
    },
    {
      "insee": "60397",
      "commune": "Le Mesnil-Conteville",
      "minutes": 44.3,
      "km": 39.222
    },
    {
      "insee": "76431",
      "commune": "Le Mesnil-Lieubray",
      "minutes": 26.45,
      "km": 20.31
    },
    {
      "insee": "60401",
      "commune": "Le Mesnil-Théribus",
      "minutes": 44.616667,
      "km": 32.972
    },
    {
      "insee": "60428",
      "commune": "Le Mont-Saint-Adrien",
      "minutes": 36.733333,
      "km": 26.876
    },
    {
      "insee": "60608",
      "commune": "Le Saulchoy",
      "minutes": 40.733333,
      "km": 40.092
    },
    {
      "insee": "27632",
      "commune": "Le Thil",
      "minutes": 33.466667,
      "km": 25.108
    },
    {
      "insee": "76691",
      "commune": "Le Thil-Riberpré",
      "minutes": 27.516667,
      "km": 25.298
    },
    {
      "insee": "27635",
      "commune": "Le Thuit",
      "minutes": 50.3,
      "km": 42.216
    },
    {
      "insee": "27664",
      "commune": "Le Tronquay",
      "minutes": 24.883333,
      "km": 23.474
    },
    {
      "insee": "60660",
      "commune": "Le Vaumain",
      "minutes": 27.833333,
      "km": 23.828
    },
    {
      "insee": "60662",
      "commune": "Le Vauroux",
      "minutes": 27.583333,
      "km": 21.524
    },
    {
      "insee": "27016",
      "commune": "Les Andelys",
      "minutes": 45.783333,
      "km": 36.414
    },
    {
      "insee": "60694",
      "commune": "Les Hauts-Talican",
      "minutes": 38.0,
      "km": 31.4
    },
    {
      "insee": "27338",
      "commune": "Les Hogues",
      "minutes": 30.533333,
      "km": 28.102
    },
    {
      "insee": "27633",
      "commune": "Les Thilliers-en-Vexin",
      "minutes": 40.483333,
      "km": 31.708
    },
    {
      "insee": "27366",
      "commune": "Letteguives",
      "minutes": 35.783333,
      "km": 34.266
    },
    {
      "insee": "60359",
      "commune": "Lhéraule",
      "minutes": 24.8,
      "km": 18.556
    },
    {
      "insee": "60361",
      "commune": "Liancourt-Saint-Pierre",
      "minutes": 42.066667,
      "km": 34.476
    },
    {
      "insee": "60363",
      "commune": "Lierville",
      "minutes": 40.15,
      "km": 37.304
    },
    {
      "insee": "60365",
      "commune": "Lihus",
      "minutes": 33.0,
      "km": 32.342
    },
    {
      "insee": "27369",
      "commune": "Lilly",
      "minutes": 23.95,
      "km": 17.58
    },
    {
      "insee": "27370",
      "commune": "Lisors",
      "minutes": 35.216667,
      "km": 28.434
    },
    {
      "insee": "60367",
      "commune": "Loconville",
      "minutes": 43.85,
      "km": 33.608
    },
    {
      "insee": "27372",
      "commune": "Longchamps",
      "minutes": 21.233333,
      "km": 16.562
    },
    {
      "insee": "76393",
      "commune": "Longmesnil",
      "minutes": 24.333333,
      "km": 22.412
    },
    {
      "insee": "76396",
      "commune": "Longuerue",
      "minutes": 48.15,
      "km": 40.76
    },
    {
      "insee": "27373",
      "commune": "Lorleau",
      "minutes": 24.95,
      "km": 22.144
    },
    {
      "insee": "60371",
      "commune": "Loueuse",
      "minutes": 28.1,
      "km": 19.734
    },
    {
      "insee": "60372",
      "commune": "Luchy",
      "minutes": 42.4,
      "km": 37.494
    },
    {
      "insee": "27377",
      "commune": "Lyons-la-Forêt",
      "minutes": 31.65,
      "km": 24.832
    },
    {
      "insee": "95355",
      "commune": "Magny-en-Vexin",
      "minutes": 44.383333,
      "km": 39.112
    },
    {
      "insee": "27379",
      "commune": "Mainneville",
      "minutes": 11.933333,
      "km": 11.37
    },
    {
      "insee": "60376",
      "commune": "Maisoncelle-Saint-Pierre",
      "minutes": 43.7,
      "km": 37.008
    },
    {
      "insee": "80515",
      "commune": "Marlers",
      "minutes": 52.4,
      "km": 42.356
    },
    {
      "insee": "76411",
      "commune": "Marques",
      "minutes": 52.016667,
      "km": 42.334
    },
    {
      "insee": "60387",
      "commune": "Marseille-en-Beauvaisis",
      "minutes": 25.05,
      "km": 23.91
    },
    {
      "insee": "27392",
      "commune": "Martagny",
      "minutes": 15.333333,
      "km": 11.322
    },
    {
      "insee": "76412",
      "commune": "Martainville-Épreville",
      "minutes": 33.85,
      "km": 35.53
    },
    {
      "insee": "60388",
      "commune": "Martincourt",
      "minutes": 18.5,
      "km": 16.72
    },
    {
      "insee": "76415",
      "commune": "Massy",
      "minutes": 37.55,
      "km": 38.758
    },
    {
      "insee": "76416",
      "commune": "Mathonville",
      "minutes": 38.233333,
      "km": 34.78
    },
    {
      "insee": "76417",
      "commune": "Maucomble",
      "minutes": 40.033333,
      "km": 41.548
    },
    {
      "insee": "60390",
      "commune": "Maulers",
      "minutes": 45.583333,
      "km": 42.366
    },
    {
      "insee": "76420",
      "commune": "Mauquenchy",
      "minutes": 27.3,
      "km": 26.718
    },
    {
      "insee": "76423",
      "commune": "Ménerval",
      "minutes": 16.866667,
      "km": 13.088
    },
    {
      "insee": "27396",
      "commune": "Ménesqueville",
      "minutes": 37.316667,
      "km": 31.256
    },
    {
      "insee": "80528",
      "commune": "Méréaucourt",
      "minutes": 46.7,
      "km": 41.084
    },
    {
      "insee": "76426",
      "commune": "Mésangueville",
      "minutes": 22.633333,
      "km": 16.782
    },
    {
      "insee": "76432",
      "commune": "Mesnil-Mauger",
      "minutes": 35.566667,
      "km": 30.1
    },
    {
      "insee": "76434",
      "commune": "Mesnil-Raoul",
      "minutes": 44.65,
      "km": 40.746
    },
    {
      "insee": "27405",
      "commune": "Mesnil-sous-Vienne",
      "minutes": 13.866667,
      "km": 11.44
    },
    {
      "insee": "27407",
      "commune": "Mesnil-Verclives",
      "minutes": 34.766667,
      "km": 28.93
    },
    {
      "insee": "27408",
      "commune": "Mézières-en-Vexin",
      "minutes": 53.5,
      "km": 41.144
    },
    {
      "insee": "60403",
      "commune": "Milly-sur-Thérain",
      "minutes": 30.883333,
      "km": 26.024
    },
    {
      "insee": "76440",
      "commune": "Molagnies",
      "minutes": 13.666667,
      "km": 8.202
    },
    {
      "insee": "60405",
      "commune": "Moliens",
      "minutes": 40.116667,
      "km": 28.842
    },
    {
      "insee": "60407",
      "commune": "Monceaux-l'Abbaye",
      "minutes": 37.116667,
      "km": 26.806
    },
    {
      "insee": "60412",
      "commune": "Montagny-en-Vexin",
      "minutes": 39.383333,
      "km": 34.076
    },
    {
      "insee": "60256",
      "commune": "Montchevreuil",
      "minutes": 49.666667,
      "km": 36.1
    },
    {
      "insee": "76445",
      "commune": "Montérolier",
      "minutes": 42.883333,
      "km": 37.736
    },
    {
      "insee": "60420",
      "commune": "Montjavoult",
      "minutes": 35.866667,
      "km": 31.25
    },
    {
      "insee": "76448",
      "commune": "Montmain",
      "minutes": 44.816667,
      "km": 41.216
    },
    {
      "insee": "95429",
      "commune": "Montreuil-sur-Epte",
      "minutes": 48.266667,
      "km": 40.384
    },
    {
      "insee": "76450",
      "commune": "Montroty",
      "minutes": 10.45,
      "km": 8.462
    },
    {
      "insee": "27417",
      "commune": "Morgny",
      "minutes": 21.9,
      "km": 17.734
    },
    {
      "insee": "76453",
      "commune": "Morgny-la-Pommeraye",
      "minutes": 44.383333,
      "km": 42.23
    },
    {
      "insee": "76606",
      "commune": "Morienne",
      "minutes": 54.483333,
      "km": 42.252
    },
    {
      "insee": "76454",
      "commune": "Mortemer",
      "minutes": 46.683333,
      "km": 39.134
    },
    {
      "insee": "76455",
      "commune": "Morville-le-Héron",
      "minutes": 27.883333,
      "km": 26.274
    },
    {
      "insee": "60435",
      "commune": "Morvillers",
      "minutes": 22.7,
      "km": 18.88
    },
    {
      "insee": "27420",
      "commune": "Mouflaines",
      "minutes": 40.25,
      "km": 31.07
    },
    {
      "insee": "60442",
      "commune": "Muidorge",
      "minutes": 45.25,
      "km": 40.126
    },
    {
      "insee": "60444",
      "commune": "Mureaumont",
      "minutes": 31.533333,
      "km": 21.898
    },
    {
      "insee": "27426",
      "commune": "Neaufles-Saint-Martin",
      "minutes": 29.6,
      "km": 24.836
    },
    {
      "insee": "76459",
      "commune": "Nesle-Hodeng",
      "minutes": 38.8,
      "km": 33.628
    },
    {
      "insee": "76461",
      "commune": "Neufbosc",
      "minutes": 38.75,
      "km": 38.474
    },
    {
      "insee": "76462",
      "commune": "Neufchâtel-en-Bray",
      "minutes": 45.9,
      "km": 39.988
    },
    {
      "insee": "76463",
      "commune": "Neuf-Marché",
      "minutes": 7.2,
      "km": 6.746
    },
    {
      "insee": "76465",
      "commune": "Neuville-Ferrières",
      "minutes": 41.216667,
      "km": 36.448
    },
    {
      "insee": "60461",
      "commune": "Nivillers",
      "minutes": 45.766667,
      "km": 37.926
    },
    {
      "insee": "27437",
      "commune": "Nojeon-en-Vexin",
      "minutes": 29.166667,
      "km": 22.41
    },
    {
      "insee": "76469",
      "commune": "Nolléval",
      "minutes": 24.316667,
      "km": 21.968
    },
    {
      "insee": "27445",
      "commune": "Noyers",
      "minutes": 36.333333,
      "km": 29.866
    },
    {
      "insee": "95459",
      "commune": "Nucourt",
      "minutes": 45.766667,
      "km": 39.662
    },
    {
      "insee": "76479",
      "commune": "Nullemont",
      "minutes": 50.2,
      "km": 40.406
    },
    {
      "insee": "60472",
      "commune": "Offoy",
      "minutes": 47.133333,
      "km": 39.776
    },
    {
      "insee": "60476",
      "commune": "Omécourt",
      "minutes": 31.416667,
      "km": 22.548
    },
    {
      "insee": "95462",
      "commune": "Omerville",
      "minutes": 53.95,
      "km": 42.106
    },
    {
      "insee": "60477",
      "commune": "Ons-en-Bray",
      "minutes": 25.283333,
      "km": 19.702
    },
    {
      "insee": "60484",
      "commune": "Oudeuil",
      "minutes": 33.466667,
      "km": 28.844
    },
    {
      "insee": "60485",
      "commune": "Oursel-Maison",
      "minutes": 44.266667,
      "km": 41.51
    },
    {
      "insee": "60487",
      "commune": "Parnes",
      "minutes": 39.866667,
      "km": 34.214
    },
    {
      "insee": "27453",
      "commune": "Perriers-sur-Andelle",
      "minutes": 35.583333,
      "km": 32.64
    },
    {
      "insee": "27454",
      "commune": "Perruel",
      "minutes": 32.516667,
      "km": 31.186
    },
    {
      "insee": "60490",
      "commune": "Pierrefitte-en-Beauvaisis",
      "minutes": 31.55,
      "km": 22.846
    },
    {
      "insee": "60493",
      "commune": "Pisseleu",
      "minutes": 35.516667,
      "km": 31.218
    },
    {
      "insee": "76505",
      "commune": "Pommereux",
      "minutes": 21.85,
      "km": 18.832
    },
    {
      "insee": "27470",
      "commune": "Pont-Saint-Pierre",
      "minutes": 50.516667,
      "km": 41.38
    },
    {
      "insee": "60510",
      "commune": "Porcheux",
      "minutes": 37.0,
      "km": 27.068
    },
    {
      "insee": "60512",
      "commune": "Pouilly",
      "minutes": 52.65,
      "km": 38.516
    },
    {
      "insee": "76509",
      "commune": "Préaux",
      "minutes": 42.166667,
      "km": 42.398
    },
    {
      "insee": "60514",
      "commune": "Prévillers",
      "minutes": 32.266667,
      "km": 30.372
    },
    {
      "insee": "27480",
      "commune": "Puchay",
      "minutes": 27.9,
      "km": 23.0
    },
    {
      "insee": "60516",
      "commune": "Puiseux-en-Bray",
      "minutes": 14.016667,
      "km": 11.286
    },
    {
      "insee": "76516",
      "commune": "Quièvrecourt",
      "minutes": 42.45,
      "km": 41.008
    },
    {
      "insee": "60521",
      "commune": "Quincampoix-Fleuzy",
      "minutes": 49.9,
      "km": 35.846
    },
    {
      "insee": "27487",
      "commune": "Radepont",
      "minutes": 47.95,
      "km": 38.276
    },
    {
      "insee": "60523",
      "commune": "Rainvillers",
      "minutes": 30.6,
      "km": 26.12
    },
    {
      "insee": "76521",
      "commune": "Rebets",
      "minutes": 36.616667,
      "km": 30.658
    },
    {
      "insee": "60528",
      "commune": "Reilly",
      "minutes": 38.416667,
      "km": 31.294
    },
    {
      "insee": "27488",
      "commune": "Renneville",
      "minutes": 40.533333,
      "km": 36.872
    },
    {
      "insee": "27490",
      "commune": "Richeville",
      "minutes": 40.35,
      "km": 31.49
    },
    {
      "insee": "60542",
      "commune": "Rochy-Condé",
      "minutes": 44.916667,
      "km": 40.926
    },
    {
      "insee": "76532",
      "commune": "Rocquemont",
      "minutes": 43.933333,
      "km": 40.324
    },
    {
      "insee": "60545",
      "commune": "Romescamps",
      "minutes": 48.916667,
      "km": 33.526
    },
    {
      "insee": "76535",
      "commune": "Roncherolles-en-Bray",
      "minutes": 25.966667,
      "km": 26.0
    },
    {
      "insee": "76537",
      "commune": "Ronchois",
      "minutes": 39.733333,
      "km": 33.956
    },
    {
      "insee": "27496",
      "commune": "Rosay-sur-Lieure",
      "minutes": 33.116667,
      "km": 28.748
    },
    {
      "insee": "60549",
      "commune": "Rotangy",
      "minutes": 37.716667,
      "km": 35.306
    },
    {
      "insee": "60550",
      "commune": "Rothois",
      "minutes": 30.716667,
      "km": 28.402
    },
    {
      "insee": "76544",
      "commune": "Rouvray-Catillon",
      "minutes": 31.7,
      "km": 25.122
    },
    {
      "insee": "60557",
      "commune": "Roy-Boissy",
      "minutes": 23.866667,
      "km": 21.584
    },
    {
      "insee": "76548",
      "commune": "Ry",
      "minutes": 32.966667,
      "km": 32.014
    },
    {
      "insee": "76554",
      "commune": "Saint-Aignan-sur-Ry",
      "minutes": 37.666667,
      "km": 33.758
    },
    {
      "insee": "60566",
      "commune": "Saint-Arnoult",
      "minutes": 33.683333,
      "km": 24.394
    },
    {
      "insee": "60567",
      "commune": "Saint-Aubin-en-Bray",
      "minutes": 22.7,
      "km": 17.638
    },
    {
      "insee": "95541",
      "commune": "Saint-Clair-sur-Epte",
      "minutes": 41.233333,
      "km": 35.762
    },
    {
      "insee": "60570",
      "commune": "Saint-Crépin-Ibouvillers",
      "minutes": 52.7,
      "km": 40.762
    },
    {
      "insee": "60571",
      "commune": "Saint-Deniscourt",
      "minutes": 29.35,
      "km": 22.632
    },
    {
      "insee": "27533",
      "commune": "Saint-Denis-le-Ferment",
      "minutes": 23.633333,
      "km": 19.008
    },
    {
      "insee": "76573",
      "commune": "Saint-Denis-le-Thiboult",
      "minutes": 30.383333,
      "km": 30.79
    },
    {
      "insee": "76567",
      "commune": "Sainte-Beuve-en-Rivière",
      "minutes": 51.166667,
      "km": 41.77
    },
    {
      "insee": "76571",
      "commune": "Sainte-Croix-sur-Buchy",
      "minutes": 40.95,
      "km": 35.534
    },
    {
      "insee": "76578",
      "commune": "Sainte-Geneviève",
      "minutes": 32.216667,
      "km": 34.138
    },
    {
      "insee": "27567",
      "commune": "Sainte-Marie-de-Vatimesnil",
      "minutes": 34.116667,
      "km": 26.732
    },
    {
      "insee": "76581",
      "commune": "Saint-Germain-des-Essourts",
      "minutes": 43.666667,
      "km": 38.026
    },
    {
      "insee": "60576",
      "commune": "Saint-Germain-la-Poterie",
      "minutes": 31.783333,
      "km": 25.122
    },
    {
      "insee": "76584",
      "commune": "Saint-Germain-sur-Eaulne",
      "minutes": 47.833333,
      "km": 42.108
    },
    {
      "insee": "60577",
      "commune": "Saint-Germer-de-Fly",
      "minutes": 14.183333,
      "km": 9.596
    },
    {
      "insee": "95554",
      "commune": "Saint-Gervais",
      "minutes": 46.466667,
      "km": 37.698
    },
    {
      "insee": "76591",
      "commune": "Saint-Jacques-sur-Darnétal",
      "minutes": 40.55,
      "km": 42.136
    },
    {
      "insee": "60583",
      "commune": "Saint-Léger-en-Bray",
      "minutes": 31.916667,
      "km": 28.69
    },
    {
      "insee": "76601",
      "commune": "Saint-Lucien",
      "minutes": 29.783333,
      "km": 25.754
    },
    {
      "insee": "60586",
      "commune": "Saint-Martin-le-N?ud",
      "minutes": 35.683333,
      "km": 31.288
    },
    {
      "insee": "76621",
      "commune": "Saint-Martin-Osmonville",
      "minutes": 43.633333,
      "km": 40.74
    },
    {
      "insee": "60588",
      "commune": "Saint-Maur",
      "minutes": 30.466667,
      "km": 25.678
    },
    {
      "insee": "76623",
      "commune": "Saint-Michel-d'Halescourt",
      "minutes": 26.483333,
      "km": 18.778
    },
    {
      "insee": "60590",
      "commune": "Saint-Omer-en-Chaussée",
      "minutes": 29.45,
      "km": 26.58
    },
    {
      "insee": "60591",
      "commune": "Saint-Paul",
      "minutes": 26.633333,
      "km": 23.232
    },
    {
      "insee": "60592",
      "commune": "Saint-Pierre-es-Champs",
      "minutes": 9.05,
      "km": 7.826
    },
    {
      "insee": "60594",
      "commune": "Saint-Quentin-des-Prés",
      "minutes": 11.35,
      "km": 7.014
    },
    {
      "insee": "76649",
      "commune": "Saint-Saire",
      "minutes": 38.05,
      "km": 32.92
    },
    {
      "insee": "60596",
      "commune": "Saint-Samson-la-Poterie",
      "minutes": 25.266667,
      "km": 17.068
    },
    {
      "insee": "60598",
      "commune": "Saint-Sulpice",
      "minutes": 39.316667,
      "km": 37.95
    },
    {
      "insee": "60599",
      "commune": "Saint-Thibault",
      "minutes": 44.1,
      "km": 32.816
    },
    {
      "insee": "60602",
      "commune": "Saint-Valery",
      "minutes": 48.933333,
      "km": 33.792
    },
    {
      "insee": "27614",
      "commune": "Sancourt",
      "minutes": 18.983333,
      "km": 15.39
    },
    {
      "insee": "60604",
      "commune": "Sarcus",
      "minutes": 39.6,
      "km": 30.15
    },
    {
      "insee": "60605",
      "commune": "Sarnois",
      "minutes": 38.966667,
      "km": 32.538
    },
    {
      "insee": "76666",
      "commune": "Saumont-la-Poterie",
      "minutes": 18.35,
      "km": 16.406
    },
    {
      "insee": "27617",
      "commune": "Saussay-la-Campagne",
      "minutes": 31.666667,
      "km": 26.392
    },
    {
      "insee": "60609",
      "commune": "Savignies",
      "minutes": 30.566667,
      "km": 22.862
    },
    {
      "insee": "60611",
      "commune": "Senantes",
      "minutes": 16.7,
      "km": 11.032
    },
    {
      "insee": "60613",
      "commune": "Senots",
      "minutes": 53.916667,
      "km": 38.64
    },
    {
      "insee": "80734",
      "commune": "Sentelie",
      "minutes": 45.783333,
      "km": 39.338
    },
    {
      "insee": "60614",
      "commune": "Serans",
      "minutes": 40.166667,
      "km": 35.788
    },
    {
      "insee": "60616",
      "commune": "Sérifontaine",
      "minutes": 17.466667,
      "km": 15.826
    },
    {
      "insee": "76672",
      "commune": "Serqueux",
      "minutes": 29.533333,
      "km": 24.702
    },
    {
      "insee": "76673",
      "commune": "Servaville-Salmonville",
      "minutes": 37.633333,
      "km": 37.734
    },
    {
      "insee": "76676",
      "commune": "Sigy-en-Bray",
      "minutes": 29.083333,
      "km": 22.618
    },
    {
      "insee": "60620",
      "commune": "Silly-Tillard",
      "minutes": 47.483333,
      "km": 40.82
    },
    {
      "insee": "60622",
      "commune": "Sommereux",
      "minutes": 42.783333,
      "km": 35.686
    },
    {
      "insee": "76678",
      "commune": "Sommery",
      "minutes": 29.233333,
      "km": 31.168
    },
    {
      "insee": "60623",
      "commune": "Songeons",
      "minutes": 21.416667,
      "km": 16.778
    },
    {
      "insee": "60624",
      "commune": "Sully",
      "minutes": 19.783333,
      "km": 12.66
    },
    {
      "insee": "27625",
      "commune": "Suzay",
      "minutes": 39.933333,
      "km": 31.6
    },
    {
      "insee": "60626",
      "commune": "Talmontiers",
      "minutes": 12.55,
      "km": 11.272
    },
    {
      "insee": "60628",
      "commune": "Therdonne",
      "minutes": 43.166667,
      "km": 37.088
    },
    {
      "insee": "60629",
      "commune": "Thérines",
      "minutes": 27.383333,
      "km": 22.412
    },
    {
      "insee": "60630",
      "commune": "Thibivillers",
      "minutes": 37.566667,
      "km": 28.658
    },
    {
      "insee": "80755",
      "commune": "Thieulloy-la-Ville",
      "minutes": 46.45,
      "km": 41.676
    },
    {
      "insee": "60633",
      "commune": "Thieuloy-Saint-Antoine",
      "minutes": 31.683333,
      "km": 28.834
    },
    {
      "insee": "80757",
      "commune": "Thoix",
      "minutes": 50.516667,
      "km": 42.102
    },
    {
      "insee": "60639",
      "commune": "Tillé",
      "minutes": 42.583333,
      "km": 36.022
    },
    {
      "insee": "27649",
      "commune": "Touffreville",
      "minutes": 38.033333,
      "km": 30.152
    },
    {
      "insee": "60640",
      "commune": "Tourly",
      "minutes": 44.783333,
      "km": 39.408
    },
    {
      "insee": "60644",
      "commune": "Trie-Château",
      "minutes": 30.733333,
      "km": 25.792
    },
    {
      "insee": "60645",
      "commune": "Trie-la-Ville",
      "minutes": 30.85,
      "km": 26.588
    },
    {
      "insee": "60646",
      "commune": "Troissereux",
      "minutes": 35.9,
      "km": 28.772
    },
    {
      "insee": "27294",
      "commune": "Val d'Orger",
      "minutes": 42.983333,
      "km": 34.496
    },
    {
      "insee": "60652",
      "commune": "Valdampierre",
      "minutes": 49.383333,
      "km": 38.508
    },
    {
      "insee": "27670",
      "commune": "Vandrimare",
      "minutes": 39.783333,
      "km": 35.668
    },
    {
      "insee": "27672",
      "commune": "Vasc?uil",
      "minutes": 28.083333,
      "km": 28.76
    },
    {
      "insee": "60659",
      "commune": "Vaudancourt",
      "minutes": 36.35,
      "km": 30.444
    },
    {
      "insee": "60663",
      "commune": "Velennes",
      "minutes": 49.866667,
      "km": 42.028
    },
    {
      "insee": "60668",
      "commune": "Verderel-lès-Sauqueuse",
      "minutes": 39.033333,
      "km": 31.558
    },
    {
      "insee": "27682",
      "commune": "Vesly",
      "minutes": 37.266667,
      "km": 31.06
    },
    {
      "insee": "27213",
      "commune": "Vexin-sur-Epte",
      "minutes": 47.883333,
      "km": 40.262
    },
    {
      "insee": "27683",
      "commune": "Vézillon",
      "minutes": 55.65,
      "km": 40.848
    },
    {
      "insee": "60673",
      "commune": "Viefvillers",
      "minutes": 38.316667,
      "km": 37.9
    },
    {
      "insee": "76738",
      "commune": "Vieux-Manoir",
      "minutes": 44.983333,
      "km": 40.012
    },
    {
      "insee": "60677",
      "commune": "Villembray",
      "minutes": 20.616667,
      "km": 14.404
    },
    {
      "insee": "27690",
      "commune": "Villers-en-Vexin",
      "minutes": 38.516667,
      "km": 30.376
    },
    {
      "insee": "60681",
      "commune": "Villers-Saint-Barthélemy",
      "minutes": 25.766667,
      "km": 21.852
    },
    {
      "insee": "60687",
      "commune": "Villers-sur-Auchy",
      "minutes": 12.016667,
      "km": 7.462
    },
    {
      "insee": "60688",
      "commune": "Villers-sur-Bonnières",
      "minutes": 25.366667,
      "km": 22.436
    },
    {
      "insee": "60691",
      "commune": "Villers-Vermont",
      "minutes": 22.583333,
      "km": 15.678
    },
    {
      "insee": "60697",
      "commune": "Vrocourt",
      "minutes": 18.066667,
      "km": 15.992
    },
    {
      "insee": "60699",
      "commune": "Wambez",
      "minutes": 14.75,
      "km": 12.91
    },
    {
      "insee": "60700",
      "commune": "Warluis",
      "minutes": 38.433333,
      "km": 38.862
    }
  ]
};

export const C3_DEPARTURE_LABELS: Record<C3Departure, string> = {
  LCP: "Lachapelle-aux-Pots (LCP)",
  GEB: "Gournay-en-Bray (GEB)",
};

export function normalizeC3Commune(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function findC3Commune(
  departure: C3Departure,
  commune: string,
): C3SectorEntry | null {
  const needle = normalizeC3Commune(commune);
  if (!needle) return null;
  const sector = C3_SECTORS[departure];
  return (
    sector.find((entry) => normalizeC3Commune(entry.commune) === needle) ??
    sector.find((entry) => normalizeC3Commune(entry.commune).startsWith(needle)) ??
    null
  );
}

export function getC3CommuneSuggestions(
  departure: C3Departure,
  commune: string,
  limit = 8,
): C3SectorEntry[] {
  const needle = normalizeC3Commune(commune);
  if (!needle) return [];
  return C3_SECTORS[departure]
    .filter((entry) => normalizeC3Commune(entry.commune).includes(needle))
    .slice(0, limit);
}

function positive(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateC3Quote(inputs: C3QuoteInputs): C3QuoteResult {
  const entry = findC3Commune(inputs.departure, inputs.commune);
  const rotations = positive(inputs.rotations);
  const vehicles = positive(inputs.vehicles);
  const loadingAgents = positive(inputs.loadingAgents);
  const loadingHours = positive(inputs.loadingHours);
  const wasteVolume = positive(inputs.wasteVolume);
  // La distance calculée depuis l'adresse de collecte prime sur le référentiel commune.
  const manual = inputs.manualDistance ?? null;
  const oneWayKm = manual ? positive(manual.km) : entry ? entry.km : 0;
  const oneWayMinutes = manual ? positive(manual.minutes) : entry ? entry.minutes : 0;
  const hasRoute = manual !== null || entry !== null;
  const totalKm = oneWayKm * 2 * rotations * vehicles;
  const totalTravelHours = (oneWayMinutes / 60) * 2 * vehicles * rotations;
  const travelCost = totalKm * C3_RATES.kilometer + totalTravelHours * C3_RATES.travelHourly;
  const loadingTotalHours = loadingAgents * loadingHours;
  const loadingCost = loadingTotalHours * C3_RATES.loadingHourly;
  const reusableValue =
    positive(inputs.storageFurnitureValue) +
    positive(inputs.tableChairsValue) +
    positive(inputs.cookerValue) +
    positive(inputs.dishwasherWasherValue) +
    positive(inputs.fridgeValue) +
    positive(inputs.otherValue);
  const wasteCost = wasteVolume * C3_RATES.wastePerCubicMeter;
  const subtotalHt = travelCost + loadingCost + wasteCost - reusableValue;
  const vat = subtotalHt * C3_RATES.vat;
  const totalTtc = subtotalHt + vat;

  return {
    entry,
    oneWayKm,
    oneWayMinutes,
    hasRoute,
    totalKm,
    totalTravelHours,
    travelCost,
    loadingTotalHours,
    loadingCost,
    reusableValue,
    wasteCost,
    subtotalHt,
    vat,
    totalTtc,
  };
}
