// Product catalogue, keyed by measure.
//
// Manufacturers and product lines here are real and publicly listed. Prices are
// INDICATIVE INSTALLED RANGES for the Bay Area, not quotes, and the UI says so
// wherever they appear. Sizing notes are generated against the household's own
// load so the list is a shortlist rather than a directory.

export const PRODUCTS = {
  heatPump: {
    title: 'Ducted and ducted-hybrid heat pumps',
    unit: 'installed',
    items: [
      {
        brand: 'Mitsubishi Electric',
        model: 'Intelli-HEAT / SUZ-KA',
        spec: 'Hybrid — keeps existing ductwork, cold-climate capable',
        from: 11000,
        to: 17000,
        note: 'Strongest low-temperature output of the group.',
      },
      {
        brand: 'Daikin',
        model: 'Daikin Fit',
        spec: 'Side-discharge, inverter, up to 18 SEER2',
        from: 9500,
        to: 15000,
        note: 'Small footprint — fits tight side yards common in Oakland flats.',
      },
      {
        brand: 'Carrier',
        model: 'Infinity 24 (25VNA4)',
        spec: 'Variable speed, up to 24 SEER2',
        from: 12000,
        to: 18500,
        note: 'Highest efficiency here; best where cooling hours are real.',
      },
      {
        brand: 'Trane',
        model: 'XV18 TruComfort',
        spec: 'Variable speed, up to 18 SEER2',
        from: 11000,
        to: 16500,
        note: 'Wide contractor network, easy to service locally.',
      },
      {
        brand: 'Johnson Controls / York',
        model: 'YZV Affinity',
        spec: 'Variable capacity, up to 20 SEER2',
        from: 10000,
        to: 16000,
        note: 'Often the value pick when two quotes come back close.',
      },
      {
        brand: 'Bosch',
        model: 'IDS Ultra 2.0',
        spec: 'Inverter-driven, up to 20.5 SEER2',
        from: 10500,
        to: 16000,
        note: 'Quiet at low speed, which matters on a narrow lot.',
      },
    ],
  },

  heatPumpReplace: { alias: 'heatPump' },

  ac5star: {
    title: 'Inverter air conditioners and ductless heat pumps',
    unit: 'installed',
    items: [
      {
        brand: 'Mitsubishi Electric',
        model: 'MSZ-FS Hyper-Heating',
        spec: 'Ductless, single or multi-zone inverter',
        from: 5200,
        to: 9500,
        note: 'Also heats, so it can replace the furnace later.',
      },
      {
        brand: 'Daikin',
        model: 'Emura / Aurora',
        spec: 'Wall-mounted inverter, up to 20 SEER2',
        from: 4800,
        to: 8800,
        note: 'Aurora variant holds capacity in cold snaps.',
      },
      {
        brand: 'Fujitsu',
        model: 'Halcyon HFI',
        spec: 'Ductless inverter, multi-zone capable',
        from: 4500,
        to: 8500,
        note: 'Usually the lowest installed cost of the group.',
      },
      {
        brand: 'LG',
        model: 'Art Cool / Dual Inverter',
        spec: 'Wall or ceiling cassette, up to 22 SEER2',
        from: 4600,
        to: 8600,
        note: 'Cassette version avoids losing wall space.',
      },
      {
        brand: 'Carrier',
        model: 'Infinity Ductless',
        spec: 'Inverter, up to 24 SEER2 single zone',
        from: 5500,
        to: 9500,
        note: 'Pairs with Infinity controls if ducted kit follows.',
      },
    ],
  },

  hpwh: {
    title: 'Heat pump water heaters',
    unit: 'installed',
    items: [
      {
        brand: 'Rheem',
        model: 'ProTerra Plug-in',
        spec: '40 / 50 / 65 / 80 gal · 120 V plug-in option',
        from: 3200,
        to: 5200,
        note: 'The 120 V model avoids a new circuit — big deal on a small panel.',
      },
      {
        brand: 'A. O. Smith',
        model: 'Voltex AL / HPTS',
        spec: '50 / 66 / 80 gal · CTA-2045 ready',
        from: 3400,
        to: 5600,
        note: 'CTA-2045 port is what lets the utility shift the tank.',
      },
      {
        brand: 'Bradford White',
        model: 'AeroTherm RE2H',
        spec: '50 / 65 / 80 gal',
        from: 3300,
        to: 5400,
        note: 'Trade-only brand; plumbers often stock it same-week.',
      },
      {
        brand: 'Sanden',
        model: 'SanCO2 split system',
        spec: 'CO2 refrigerant, outdoor compressor',
        from: 6000,
        to: 9500,
        note: 'Most efficient and quietest indoors, but the priciest.',
      },
      {
        brand: 'State Water Heaters',
        model: 'Premier Heat Pump',
        spec: '50 / 80 gal',
        from: 3200,
        to: 5200,
        note: 'Same platform as A. O. Smith, sometimes cheaper.',
      },
    ],
  },

  battery: {
    title: 'Home batteries',
    unit: 'installed, before SGIP',
    items: [
      {
        brand: 'Tesla',
        model: 'Powerwall 3',
        spec: '13.5 kWh · 11.5 kW continuous · integrated inverter',
        from: 13000,
        to: 17500,
        note: 'Highest continuous output — runs a whole house, not a subpanel.',
      },
      {
        brand: 'FranklinWH',
        model: 'aPower 2 + aGate',
        spec: '15 kWh · 10 kW · whole-home transfer built in',
        from: 13500,
        to: 18000,
        note: 'aGate handles generator and EV integration in one box.',
      },
      {
        brand: 'Enphase',
        model: 'IQ Battery 5P',
        spec: '5 kWh modular · 3.84 kW per unit',
        from: 8000,
        to: 16000,
        note: 'Modular — start at 5 kWh and add later.',
      },
      {
        brand: 'SolarEdge',
        model: 'Home Battery 10 kWh',
        spec: '10 kWh · DC-coupled',
        from: 11000,
        to: 15500,
        note: 'Most efficient if the array is already SolarEdge.',
      },
      {
        brand: 'Panasonic',
        model: 'EverVolt 2.0',
        spec: '9 / 13.5 / 18 kWh · AC or DC coupled',
        from: 12000,
        to: 18000,
        note: 'Flexible coupling, useful on a retrofit array.',
      },
    ],
  },

  solar: {
    title: 'Rooftop solar',
    unit: 'installed, before the 30% federal credit',
    items: [
      {
        brand: 'REC',
        model: 'Alpha Pure-R',
        spec: '430 W · 22.3% efficiency · 25 yr warranty',
        from: 2.7,
        to: 3.4,
        perWatt: true,
        note: 'Best output per square foot for a small roof.',
      },
      {
        brand: 'Qcells',
        model: 'Q.TRON BLK M-G2+',
        spec: '430 W · 22.5% · made in Georgia',
        from: 2.5,
        to: 3.2,
        perWatt: true,
        note: 'Domestic content can add a 10% credit adder.',
      },
      {
        brand: 'Maxeon',
        model: 'Maxeon 6',
        spec: '440 W · 22.8% · 40 yr warranty',
        from: 3.0,
        to: 3.8,
        perWatt: true,
        note: 'Longest warranty on the market; premium price.',
      },
      {
        brand: 'Silfab',
        model: 'Silfab Elite',
        spec: '410 W · 21.4% · made in Washington',
        from: 2.5,
        to: 3.1,
        perWatt: true,
        note: 'Good value with domestic content.',
      },
      {
        brand: 'Canadian Solar',
        model: 'TOPHiKu6',
        spec: '440 W · 22.5%',
        from: 2.3,
        to: 3.0,
        perWatt: true,
        note: 'Usually the lowest cost per watt quoted.',
      },
    ],
  },

  ev: {
    title: 'Electric vehicles and home charging',
    unit: 'vehicle MSRP, before incentives',
    items: [
      {
        brand: 'Chevrolet',
        model: 'Equinox EV',
        spec: '~319 mi range · 11.5 kW onboard charger',
        from: 34000,
        to: 45000,
        note: 'Best range per dollar in the segment right now.',
      },
      {
        brand: 'Tesla',
        model: 'Model 3 / Model Y',
        spec: '~272-341 mi · native load scheduling',
        from: 38000,
        to: 52000,
        note: 'Schedules charging natively, which the programme can use.',
      },
      {
        brand: 'Hyundai',
        model: 'IONIQ 5',
        spec: '~245-318 mi · 800 V architecture · V2L',
        from: 42000,
        to: 55000,
        note: 'Vehicle-to-load can back up a fridge in an outage.',
      },
      {
        brand: 'Kia',
        model: 'EV6 / Niro EV',
        spec: '~232-310 mi · V2L on EV6',
        from: 39000,
        to: 53000,
        note: 'Niro is the cheaper way in if range needs are modest.',
      },
      {
        brand: 'Ford',
        model: 'F-150 Lightning',
        spec: '~240-320 mi · 9.6 kW home backup',
        from: 50000,
        to: 78000,
        note: 'Doubles as whole-home backup with the Charge Station Pro.',
      },
    ],
    accessories: {
      title: 'Level 2 chargers',
      items: [
        {
          brand: 'Wallbox',
          model: 'Pulsar Plus',
          spec: '40-48 A · compact · power sharing',
          from: 900,
          to: 1600,
        },
        {
          brand: 'Emporia',
          model: 'Smart Level 2',
          spec: '48 A · load management built in',
          from: 600,
          to: 1200,
        },
        {
          brand: 'ChargePoint',
          model: 'Home Flex',
          spec: '16-50 A · utility programme ready',
          from: 800,
          to: 1500,
        },
        {
          brand: 'Tesla',
          model: 'Wall Connector',
          spec: '48 A · power sharing across units',
          from: 700,
          to: 1400,
        },
        {
          brand: 'Enphase',
          model: 'IQ EV Charger',
          spec: '40-80 A · integrates with IQ storage',
          from: 900,
          to: 1700,
        },
      ],
    },
  },

  panel: {
    title: 'Service upgrades and smart panels',
    unit: 'installed',
    items: [
      {
        brand: 'SPAN',
        model: 'SPAN Smart Panel',
        spec: 'Circuit-level control · avoids a service upgrade in many homes',
        from: 4500,
        to: 8000,
        note: 'Often cheaper than a full 200 A upgrade once trenching is priced.',
      },
      {
        brand: 'Lumin',
        model: 'Lumin Smart Panel',
        spec: 'Retrofits alongside the existing panel · 8-12 controlled circuits',
        from: 3000,
        to: 5500,
        note: 'Keeps the existing panel, so no utility coordination.',
      },
      {
        brand: 'Square D',
        model: 'QO 200 A / Energy Center',
        spec: 'Conventional 200 A service upgrade',
        from: 3500,
        to: 6500,
        note: 'The default quote most electricians will lead with.',
      },
      {
        brand: 'Eaton',
        model: 'BR Smart Breaker Panel',
        spec: '200 A with per-circuit metering',
        from: 4000,
        to: 7000,
        note: 'Metering per circuit makes flexibility settlement easier.',
      },
      {
        brand: 'Siemens',
        model: 'PL Series Meter Main',
        spec: '200 A combination meter-main',
        from: 3500,
        to: 6500,
        note: 'Common where the meter is being relocated anyway.',
      },
    ],
  },
};

/** Resolves aliases, so a heat pump swap shows the heat pump catalogue. */
export function productsFor(key) {
  const entry = PRODUCTS[key];
  if (!entry) return null;
  return entry.alias ? PRODUCTS[entry.alias] : entry;
}

/** What size this particular household should be shopping for. */
export function sizingNote(key, home) {
  const tons = Math.max(1.5, Math.min(5, Math.round((home.sqft / 600) * 2) / 2));
  switch (key) {
    case 'heatPump':
    case 'heatPumpReplace':
      return `Size for roughly ${tons.toFixed(1)} tons (${num0(
        tons * 12000
      )} BTU) at ${num0(home.sqft)} sq ft. Ask for a Manual J, not a rule of thumb.`;
    case 'ac5star':
      return `A single ${tons >= 3 ? 'multi-zone' : 'single-zone'} unit covers ${num0(
        home.sqft
      )} sq ft. Cooling load here is about ${num0(home.coolingKwh)} kWh a year.`;
    case 'hpwh':
      return `A ${home.sqft > 1500 ? '65-80' : '50-65'} gallon tank suits this house. If the panel is tight, start with the 120 V plug-in model.`;
    case 'battery':
      return `About ${home.flexKw} kW of this home's load is controllable, so a single ${
        home.flexKw > 4 ? '13-15' : '5-10'
      } kWh unit is the right starting point.`;
    case 'solar':
      return `The roof supports roughly ${home.factors.roofKw} kW. At current pricing that is about ${usd0(
        home.factors.roofKw * 1000 * 2.9
      )} before the 30% credit.`;
    case 'ev':
      return `This household drives about ${num0(
        home.factors.miles * 11500
      )} miles a year, and the roof already covers a good share of that in generation.`;
    case 'panel':
      return `Existing service is ${home.panelAmps} A and would run at ${Math.round(
        home.utilProjected * 100
      )}% once electrified. A smart panel may avoid the upgrade entirely.`;
    default:
      return '';
  }
}

function num0(n) {
  return Math.round(n).toLocaleString('en-US');
}
function usd0(n) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}
