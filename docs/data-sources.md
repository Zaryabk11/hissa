# Data sources for the dish catalog

`database/data/catalog.csv` is transcribed by hand from the sources below. `database/scripts/build-seed.mjs` turns it into `database/supabase/seed.sql`. All values are per 100 g of the cooked dish. Every number shown to a user is an estimate.

Precedence when sources disagree: lab (Khan 2019) over paper (Farooq 2026) over INDB.

## 1. Khan et al. 2019 (lab-measured): `source=khan2019`, `basis=lab`

I. Khan, F. Yasmeen, J. Ahmad, et al. "Developing a meal-planning exchange list for commonly consumed Pakistani dishes." _Progress in Nutrition_ 21(2): 421-429, 2019. 30 dishes cooked in Khyber Pakhtunkhwa and analysed in duplicate (AOAC proximate analysis). PDF: https://mattioli1885journals.com/index.php/progressinnutrition/article/download/6928/7720/31616

- Protein, carbohydrate and fat: Table 2 (g per 100 g wet basis), copied as printed.
- kcal: Table 3, "Total Energy" column, rounded to the nearest whole kcal (for example chicken karahi 240.51 becomes 241).
- Dish names map from Table 1 (local name) and Tables 2 and 3 (common name).

All 30 dishes are used: aloo gosht (Potato meat), beef korma, baingan (Bringels), bhindi (Okra), chana daal (Slit chick pea lentils), chapli kebab, chicken biryani, chicken karahi, vegetable rice, choley (Gram/Chick pea), daal kaddu (Slit chick pea lentil with bottle gourd), maash daal (Mash bean), machli (Fish: masala fish, not a curry), haleem, kachalo qeema (Colocassia with minced beef), kaleji (Liver), karela qeema (Minced beef with bitter gourd), kadhi pakora (Yogurt curry with pakoras), kofta curry (Meat balls curry), lobia (Kidney beans), macaroni qeema, mixed daal (Mix masoor and moong lentils), mixed sabzi (Mix vegetable), mutton karahi, nihari (Beef nihari), palak (Spinach), beef pulao, shimla mirch qeema (Minced beef with capsicum), chawal (Simple rice, cooked with oil, onion and tomato), tori (Ridge gourd).

The lab values replace the paper's for chicken biryani, chicken karahi, nihari, haleem, bhindi, mixed sabzi, maash daal, chana daal and mixed daal.

## 2. Farooq et al. 2026 (calculated): `source=farooq2026`, `basis=calculated`

Farooq et al., _Nutrients_ 18(19): 3173, 2026, supplementary file `nutrients-4519868-supplementary.pdf`, "Findings" table on pages 7 to 10 (59 dishes; values calculated from USDA FoodData Central). Values are copied as printed.

Dishes taken from it: white rice, beef biryani, mutton biryani, jeera rice, khichdi, matar rice, chicken pulao, egg fried rice, mutton pulao, beef karahi, chicken korma, fish curry, paye, keema, samosa, fries, gol gappay (printed "Gol Gappy"), pakode, chicken tikka, seekh kebab, malai boti, gulab jamun, kheer, zarda, falooda, kulfi, barfi, jalebi, suji halwa, gajar halwa, roti, naan, paratha, puri, anda paratha, chai, coffee, lassi, lemonade, milk soda, saag, aloo baingan, palak gosht, ghiya, karela, aloo methi, aloo palak.

Raita comes from the same file's Table 1 on page 5 (a 150 g portion: 82.5 kcal, 3.75 g protein, 8.25 g carbs, 3.75 g fat), divided by 1.5 to give per 100 g: 55 kcal, 2.5 g protein, 5.5 g carbs, 2.5 g fat.

Rows left out:

- Aloo gobi (110 kcal, 4.0 g protein, 12.0 g carbs, 10.0 g fat): the printed macros give 154 kcal, which fails the seed's macro check. The PDF was re-read and the row is printed this way, so it is a source inconsistency, not a transcription error.
- Sattu (350 kcal, 12 g protein, 60 g carbs, 2 g fat): listed as a beverage, but the values match dry sattu flour. Served as a glass it would overstate calories several times over.

## 3. Indian Nutrient Databank (INDB): portion weights only

Anuvaad INDB, https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB- (`INDB.xlsx` and `recipes_servingsize.xlsx`). Every dish INDB could supply is already covered by the lab or the paper, so **no catalog row takes its nutrition from INDB** (`source=indb` is unused). The fried, kofta and kebab rows are never used: they count all the frying oil as eaten.

INDB is used for portion weights. It gives a serving unit and the kcal per unit, so `grams_per_unit = unit_serving_energy_kcal / (energy_kcal / 100)`, using INDB's own values for both.

INDB recipes are often much thinner than the lab and paper dishes, so a weight from a thin recipe multiplied by a dense catalog value overstates the calories. The rule:

- If INDB's kcal per 100 g is within 25% of the catalog row's `kcal_per_100g`, use INDB's own ratio.
- If it differs by more than 25%, either re-derive `grams_per_unit = unit_serving_energy_kcal / (catalog kcal_per_100g / 100)`, so the portion keeps INDB's energy per serving, or use an assumed size.

These rows have `unit_basis=derived`:

| Catalog slug   | INDB row                         | INDB unit | kcal per unit | INDB kcal per 100 g | catalog kcal per 100 g | grams per unit            |
| -------------- | -------------------------------- | --------- | ------------- | ------------------- | ---------------------- | ------------------------- |
| roti           | ASC096 Chapati/Roti              | chapati   | 72.83         | 202.31              | 265                    | 36                        |
| naan           | ASC142 Naan                      | naan      | 152.30        | 286.45              | 280                    | 53.2                      |
| paratha        | ASC097 Plain parantha/paratha    | parantha  | 166.31        | 298.30              | 290                    | 55.8                      |
| fish-curry     | ASC246 Fish curry (Machli curry) | bowl      | 282.23        | 111.13              | 145                    | 254                       |
| saag           | ASC217 Sarson ka saag            | bowl      | 124.26        | 87.84               | 95                     | 141.5                     |
| suji-halwa     | ASC293 Semolina halwa            | bowl      | 360.18        | 225.65              | 315                    | 114.3 (catalog kcal used) |
| gajar-halwa    | ASC295 Carrot halwa              | bowl      | 289.71        | 172.64              | 276                    | 105 (catalog kcal used)   |
| raita          | ASC273 Cucumber raita            | bowl      | 90.27         | 59.13               | 55                     | 152.7                     |
| white-rice     | ASC113 Boiled rice               | plate     | 351.57        | 117.19              | 130                    | 300                       |
| jeera-rice     | BFP134 Cumin pulao               | plate     | 365.83        | 135.24              | 155                    | 270.5                     |
| mutton-biryani | ASC122 Mutton biryani            | plate     | 396.43        | 190.76              | 200                    | 207.8                     |

Roti (24% below the catalog value) and fish curry (23% below) are just inside the 25% rule, so they keep INDB's own ratio.

INDB weights rejected, with an assumed size used instead:

- Too large for one serving: kheer bowl 401 g (ASC282), khichdi small bowl 574 g (BFP144), kulfi 270 g (ASC321).
- Recipe too thin by the 25% rule:
  - Daals: mixed dal ASC155 at 62 kcal per 100 g, chana dal OSR142 at 100 and urad dal ASC152 at 61, against lab values of 183 to 272.
  - Sweet lassi ASC021: 36 vs 92.
  - Hot tea ASC001: 16 vs 45. Re-deriving would give a 75 g cup.

## Assumed portions: `unit_basis=assumed`

No source gives household portions for the other dishes, so I chose these defaults:

- Curries, sabzi, karahi, nihari, haleem, all daals, khichdi, kheer, zarda: 1 katori = 150 g.
- Rice dishes and macaroni: 1 plate = 250 g (the paper's Table 1 example also uses 250 g of biryani). Masala fish and malai boti: 1 plate = 150 g. Fries, pakode, gol gappay: 1 plate = 100 g.
- Pieces: chapli kebab 100 g, chicken tikka 120 g, seekh kebab 50 g, samosa 60 g, puri 30 g, anda paratha 110 g, gulab jamun 40 g, kulfi 70 g, barfi 30 g, jalebi 30 g.
- Glasses: lassi, falooda, lemonade and milk soda 250 g; coffee 200 g; chai 150 g (the schema has no cup unit, so chai uses `glass`).

## Licensing

Nutrition values are facts and are copied with attribution. The INDB paper is CC BY. The INDB GitHub repo has no LICENSE file. Credit all three sources in the app's About screen.
