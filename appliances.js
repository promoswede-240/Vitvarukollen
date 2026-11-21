/* Vitvarukollen – apparatkatalog (Bosch). Redigera kWh/tider här eller under Inställningar.
   quarterWeights: andel av programmets energi per 15-minutersblock (summa 1,0).
   Bomull 40/60/90 och Trumrengöring justerade i v3.1 så att ingen kvart överskrider maskinens maxeffekt. */
window.VK_APPLIANCES = [
 {
  "id": "dishwasher_bosch",
  "name": "Diskmaskin",
  "model": "Bosch Serie 4 SMU46FW01S/74",
  "peakKw": 2.4,
  "supportsHalfLoad": false,
  "defaultProgramId": "dw_70",
  "delayMode": "start",
  "asleepOK": true,
  "programs": [
   {
    "id": "dw_70",
    "name": "Intensiv 70 °C",
    "isFavorite": true,
    "durationMinutes": 140,
    "totalKwh": 1.45,
    "cmp": true,
    "quarterWeights": [
     0.24,
     0.38,
     0.02,
     0.02,
     0.02,
     0.06,
     0.22,
     0.02,
     0.01,
     0.01
    ]
   },
   {
    "id": "dw_eco",
    "name": "Eco 50 °C",
    "isFavorite": false,
    "durationMinutes": 210,
    "totalKwh": 0.85,
    "cmp": true,
    "quarterWeights": [
     0.2,
     0.3,
     0.03,
     0.03,
     0.03,
     0.03,
     0.03,
     0.03,
     0.05,
     0.18,
     0.03,
     0.02,
     0.02,
     0.02
    ]
   },
   {
    "id": "dw_auto",
    "name": "Auto 45–65 °C",
    "isFavorite": false,
    "durationMinutes": 150,
    "totalKwh": 1.15,
    "cmp": true,
    "quarterWeights": [
     0.22,
     0.35,
     0.03,
     0.03,
     0.03,
     0.08,
     0.2,
     0.03,
     0.02,
     0.01
    ]
   },
   {
    "id": "dw_60_fast",
    "name": "Snabb 60 °C",
    "isFavorite": false,
    "durationMinutes": 60,
    "totalKwh": 1.05,
    "cmp": true,
    "quarterWeights": [
     0.45,
     0.2,
     0.25,
     0.1
    ]
   },
   {
    "id": "dw_glass_40",
    "name": "Glas 40 °C",
    "isFavorite": false,
    "durationMinutes": 85,
    "totalKwh": 0.8,
    "cmp": false,
    "quarterWeights": [
     0.42,
     0.33,
     0.08,
     0.07,
     0.05,
     0.05
    ]
   },
   {
    "id": "dw_45_fast",
    "name": "Snabb 45 °C",
    "isFavorite": false,
    "durationMinutes": 30,
    "totalKwh": 0.78,
    "cmp": false,
    "quarterWeights": [
     0.65,
     0.35
    ]
   },
   {
    "id": "dw_machine_care",
    "name": "Machine Care (rengöring)",
    "isFavorite": false,
    "durationMinutes": 90,
    "totalKwh": 1.25,
    "cmp": false,
    "quarterWeights": [
     0.4,
     0.35,
     0.08,
     0.07,
     0.05,
     0.05
    ]
   }
  ]
 },
 {
  "id": "washer_bosch",
  "name": "Tvättmaskin",
  "model": "Bosch Serie 6 WGG244ZMSN/A2 (9 kg)",
  "peakKw": 2.3,
  "supportsHalfLoad": true,
  "halfLoadMultiplier": 0.6,
  "defaultProgramId": "wm_cotton_60",
  "delayMode": "finish",
  "asleepOK": true,
  "programs": [
   {
    "id": "wm_cotton_40",
    "name": "Bomull 40 °C",
    "isFavorite": true,
    "durationMinutes": 195,
    "totalKwh": 1.29,
    "cmp": true,
    "quarterWeights": [
     0.157,
     0.426,
     0.157,
     0.022,
     0.022,
     0.022,
     0.022,
     0.022,
     0.022,
     0.022,
     0.022,
     0.022,
     0.062
    ]
   },
   {
    "id": "wm_cotton_60",
    "name": "Bomull 60 °C",
    "isFavorite": true,
    "durationMinutes": 195,
    "totalKwh": 1.75,
    "cmp": true,
    "quarterWeights": [
     0.116,
     0.314,
     0.314,
     0.022,
     0.022,
     0.022,
     0.022,
     0.022,
     0.022,
     0.022,
     0.022,
     0.022,
     0.058
    ]
   },
   {
    "id": "wm_cotton_90",
    "name": "Bomull 90 °C",
    "isFavorite": true,
    "durationMinutes": 195,
    "totalKwh": 2.3,
    "cmp": true,
    "quarterWeights": [
     0.088,
     0.239,
     0.239,
     0.168,
     0.026,
     0.026,
     0.026,
     0.026,
     0.026,
     0.026,
     0.026,
     0.026,
     0.058
    ]
   },
   {
    "id": "wm_mix_40",
    "name": "Mix 40 °C",
    "isFavorite": true,
    "durationMinutes": 75,
    "totalKwh": 0.64,
    "cmp": true,
    "quarterWeights": [
     0.45,
     0.3,
     0.1,
     0.07,
     0.08
    ]
   },
   {
    "id": "wm_eco",
    "name": "Eco 40–60",
    "isFavorite": false,
    "durationMinutes": 220,
    "totalKwh": 0.95,
    "cmp": true,
    "quarterWeights": [
     0.3,
     0.25,
     0.08,
     0.05,
     0.04,
     0.04,
     0.04,
     0.04,
     0.03,
     0.03,
     0.03,
     0.03,
     0.02,
     0.01,
     0.01
    ]
   },
   {
    "id": "wm_cotton_20_30",
    "name": "Bomull 20–30 °C",
    "isFavorite": false,
    "durationMinutes": 160,
    "totalKwh": 0.45,
    "cmp": true,
    "quarterWeights": [
     0.24,
     0.2,
     0.07,
     0.06,
     0.06,
     0.06,
     0.06,
     0.06,
     0.06,
     0.06,
     0.07
    ]
   },
   {
    "id": "wm_synthetics_40",
    "name": "Syntet 40 °C",
    "isFavorite": false,
    "durationMinutes": 140,
    "totalKwh": 0.78,
    "cmp": true,
    "quarterWeights": [
     0.4,
     0.32,
     0.05,
     0.04,
     0.04,
     0.03,
     0.03,
     0.03,
     0.03,
     0.03
    ]
   },
   {
    "id": "wm_delicates_30",
    "name": "Fintvätt/Silke 30 °C",
    "isFavorite": false,
    "durationMinutes": 45,
    "totalKwh": 0.21,
    "cmp": false,
    "quarterWeights": [
     0.55,
     0.3,
     0.15
    ]
   },
   {
    "id": "wm_wool_30",
    "name": "Ylle/Handtvätt 30 °C",
    "isFavorite": false,
    "durationMinutes": 40,
    "totalKwh": 0.2,
    "cmp": false,
    "quarterWeights": [
     0.55,
     0.3,
     0.15
    ]
   },
   {
    "id": "wm_rinse",
    "name": "Sköljning",
    "isFavorite": false,
    "durationMinutes": 20,
    "totalKwh": 0.1,
    "cmp": false,
    "quarterWeights": [
     0.35,
     0.65
    ]
   },
   {
    "id": "wm_quick_30",
    "name": "Snabb 30' (30 °C)",
    "isFavorite": false,
    "durationMinutes": 30,
    "totalKwh": 0.3,
    "cmp": false,
    "quarterWeights": [
     0.6,
     0.4
    ]
   },
   {
    "id": "wm_spin",
    "name": "Centrifugering / Urpumpning",
    "isFavorite": false,
    "durationMinutes": 12,
    "totalKwh": 0.05,
    "cmp": false,
    "quarterWeights": [
     1.0
    ]
   },
   {
    "id": "wm_drum_clean",
    "name": "Trumrengöring (90 °C)",
    "isFavorite": false,
    "durationMinutes": 90,
    "totalKwh": 1.6,
    "cmp": false,
    "quarterWeights": [
     0.125,
     0.344,
     0.344,
     0.06,
     0.06,
     0.067
    ]
   }
  ]
 },
 {
  "id": "dryer_bosch",
  "name": "Torktumlare",
  "model": "Bosch Avantixx WTW84360SN/02 (7 kg)",
  "peakKw": 1.0,
  "supportsHalfLoad": true,
  "halfLoadMultiplier": 0.68,
  "defaultProgramId": "td_cotton_cupboard_plus",
  "delayMode": "finish",
  "asleepOK": false,
  "programs": [
   {
    "id": "td_cotton_cupboard_plus",
    "name": "Vit-/kulörtvätt Skåptorrt+",
    "isFavorite": true,
    "durationMinutes": 159,
    "totalKwh": 2.25,
    "cmp": true,
    "quarterWeights": [
     0.09,
     0.09,
     0.09,
     0.09,
     0.09,
     0.09,
     0.09,
     0.09,
     0.09,
     0.1,
     0.09
    ]
   },
   {
    "id": "td_cotton_cupboard",
    "name": "Vit-/kulörtvätt Skåptorrt",
    "isFavorite": false,
    "durationMinutes": 135,
    "totalKwh": 1.9,
    "cmp": true,
    "quarterWeights": [
     0.11,
     0.11,
     0.11,
     0.11,
     0.11,
     0.11,
     0.11,
     0.11,
     0.12
    ]
   },
   {
    "id": "td_cotton_iron",
    "name": "Vit-/kulörtvätt Stryktorrt",
    "isFavorite": false,
    "durationMinutes": 112,
    "totalKwh": 1.45,
    "cmp": true,
    "quarterWeights": [
     0.12,
     0.12,
     0.12,
     0.12,
     0.13,
     0.13,
     0.13,
     0.13
    ]
   },
   {
    "id": "td_wool_finish",
    "name": "Yllefinish 6'",
    "isFavorite": false,
    "durationMinutes": 6,
    "totalKwh": 0.09,
    "cmp": false,
    "quarterWeights": [
     1.0
    ]
   },
   {
    "id": "td_timed_warm_30",
    "name": "Tidsprogram varmt 30'",
    "isFavorite": false,
    "durationMinutes": 30,
    "totalKwh": 0.42,
    "cmp": false,
    "quarterWeights": [
     0.5,
     0.5
    ]
   },
   {
    "id": "td_synthetics_plus",
    "name": "Syntet Skåptorrt+",
    "isFavorite": false,
    "durationMinutes": 95,
    "totalKwh": 1.25,
    "cmp": false,
    "quarterWeights": [
     0.14,
     0.14,
     0.14,
     0.14,
     0.15,
     0.15,
     0.14
    ]
   },
   {
    "id": "td_synthetics_cupboard",
    "name": "Syntet Skåptorrt",
    "isFavorite": false,
    "durationMinutes": 72,
    "totalKwh": 0.9,
    "cmp": false,
    "quarterWeights": [
     0.2,
     0.2,
     0.2,
     0.2,
     0.2
    ]
   },
   {
    "id": "td_synthetics_iron",
    "name": "Syntet Stryktorrt",
    "isFavorite": false,
    "durationMinutes": 58,
    "totalKwh": 0.7,
    "cmp": false,
    "quarterWeights": [
     0.25,
     0.25,
     0.25,
     0.25
    ]
   },
   {
    "id": "td_super_quick_40",
    "name": "Supersnabb 40'",
    "isFavorite": false,
    "durationMinutes": 40,
    "totalKwh": 0.58,
    "cmp": false,
    "quarterWeights": [
     0.35,
     0.35,
     0.3
    ]
   },
   {
    "id": "td_sport",
    "name": "Sport",
    "isFavorite": false,
    "durationMinutes": 55,
    "totalKwh": 0.7,
    "cmp": false,
    "quarterWeights": [
     0.25,
     0.25,
     0.25,
     0.25
    ]
   },
   {
    "id": "td_down",
    "name": "Dunprogram",
    "isFavorite": false,
    "durationMinutes": 100,
    "totalKwh": 1.3,
    "cmp": false,
    "quarterWeights": [
     0.14,
     0.14,
     0.14,
     0.14,
     0.15,
     0.15,
     0.14
    ]
   }
  ]
 }
];
