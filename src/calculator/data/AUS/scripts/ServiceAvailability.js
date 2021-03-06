const { writeFileSync } = require('fs');
const { join } = require('path');
const Fuse = require('fuse.js');
const countryData = require('../../country-iso-names.json');

const searchOptions = {
  shouldSort: true,
  threshold: 0.5,
  keys: ['name'],
};

const zones = {
  'Rest of World': [
    'Afghanistan',
    'Algeria',
    'Angola',
    'Anguillia',
    'Antigua and Barbuda',
    'Argentina',
    'Armenia',
    'Aruba',
    'Azerbaijan',
    'Bahamas',
    'Bahrain',
    'Barbados',
    'Belarus',
    'Belize',
    'Benin',
    'Bermuda',
    'Bhutan',
    'Bolivia',
    'Burkina Faso',
    'Burundi',
    'Cameroon',
    'Cape Verde',
    'Cayman Islands',
    'Central African Republic',
    'Chad',
    'Chile',
    'Colombia',
    'Comoros',
    'Congo (Democratic Republic)',
    'Congo (Republic)',
    'Costa Rica',
    "Cote d'Ivoire",
    'Croatia',
    'Cuba',
    'Curacao',
    'Dijboutl',
    'Dominica',
    'Dominican Republic',
    'Ecuador',
    'Egypt',
    'Eswatini',
    'Ethiopia',
    'Falkland Islands (Malvinas)',
    'Faroe Islands',
    'French Guiana',
    'Gabon',
    'Gambia',
    'Georgia',
    'Ghana',
    'Gibraltar',
    'Greenland',
    'Grenada',
    'Guadeloupe',
    'Guatemala',
    'Guinea',
    'Haiti',
    'Holy See',
    'Honduras',
    'Iran',
    'Israel ',
    'Jamaica ',
    'Jordan ',
    'Kazakhstan ',
    'Kenya',
    'Kuwait',
    'Kyrgyzstan',
    'Latvia',
    'Lebanon',
    'Lesotho',
    'Liberia',
    'Libya',
    'Liechtenstein ',
    'Lithuania ',
    'Luxembourg',
    'Madagascar',
    'Malawi ',
    'Malaysia ',
    'Mali',
    'Martinique ',
    'Mauritania ',
    'Mauritius ',
    'Mexico',
    'Moldova',
    'Mongolia',
    'Montserrat',
    'Morocco',
    'Mozambique',
    'Namibia',
    'Nicaragua',
    'Niger',
    'Nigeria',
    'Oman',
    'Panama',
    'Paraguay',
    'Peru',
    'Puerto Rico',
    'Qatar',
    'Reunion',
    'Rwanda',
    'Saint Helena, Ascension and Tristan da Cunha',
    'Saint Kitts and Nevis',
    'Saint Lucia',
    'Saint Martin (French part)',
    'Saint Pierre and Miquelon',
    'Saint Vincent and Grenadines',
    'Sao Tome and Principe',
    'Saudi Arab',
    'Senegal Seychelles',
    'Sierra Leone',
    'Somalia',
    'Sudan',
    'Suriname',
    'Syria',
    'Tajikistan',
    'Tanzania',
    'Togo',
    'Trinidad and Tobago',
    'Tunisia',
    'Turkmenistan',
    'Turks and Caicos Islands',
    'Uganda',
    'United Arab Emirates',
    'Uruguay Uzbekistan',
    'Venezuela',
    'Virgin Islands (British)',
    'Virgin Islands (US) ',
    'Yemen',
    'Zambia ',
    'Zimbabwe',
  ],
  'Asia Pacific': [
    'American Samoa',
    'India',
    'Nauru',
    'Papua New Guinea',
    'Thailand',
    'Bangladesh ',
    'Indonesia ',
    'New Caledonia',
    'Philippines',
    'Timor-Leste',
    'Cambodia',
    'Japan',
    'China',
    'Nepal',
    'Samoa',
    'Tonga',
    'Cook Islands',
    'Laos',
    'North Korea',
    'Singapore',
    'Tuvalu',
    'Fiji',
    'Macao',
    'Northern Mariana',
    'Solomon Islands',
    'Vanuatu',
    'French Polynesia',
    'Maldives Islands',
    'South Korea',
    'Vietnam',
    'Guam',
    'Marshall Islands',
    'Pakistan',
    'Sri Lanka',
    'Wallis and Futuna',
    'Hong Kong',
    'Micronesia',
    'Palau',
    'Taiwan',
  ],
  'UK & Europe': [
    'Albania',
    'Austria',
    'Belgium',
    'Bosnia and Herzegovina',
    'Brazil ',
    'Bulgaria ',
    'Cyprus',
    'Czech Republic',
    'Denmark',
    'Estonia',
    'Finland',
    'France',
    'Germany',
    'Greece',
    'Hungary',
    'Iceland',
    'Ireland',
    'Italy',
    'Kosovo',
    'Malta ',
    'Montenegro ',
    'Myanmar ',
    'Netherlands',
    'North Macedonia',
    'Norway',
    'Poland',
    'Portugal',
    'Romania',
    'Russia ',
    'Serbia',
    'Slovakia ',
    'South Africa',
    'Spain',
    'Sweden ',
    'Switzerland ',
    'Turkey',
    'Ukraine',
    'United Kingdom',
  ],
};

const fuse = new Fuse(countryData, searchOptions);

const isoEntries = Object.entries(zones).reduce(
  (isoEntries, [zone, countries]) => {
    isoEntries[zone] = countries.reduce((isoCountries, country) => {
      const matches = fuse.search(country);

      if (matches.length === 0) return isoCountries;

      isoCountries.push(matches[0].item['alpha-3']);

      return isoCountries;
    }, []);

    return isoEntries;
  },
  {},
);

writeFileSync(
  join(__dirname, './aus-service-availability.json'),
  JSON.stringify(isoEntries, null, 2),
  'utf8',
);
