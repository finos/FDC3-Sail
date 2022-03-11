export const contextData = [
  {
    directory: 'fdc3',
    type: 'position',
    description:
      'A financial position made up of an instrument and a holding in that instrument. This type is a good example of how new context types can be composed from existing types.',
    schemaUrl: 'https://fdc3.finos.org/schemas/1.2/position.schema.json',
  },
  {
    directory: 'fdc3',
    type: 'instrument',
    description: 'A financial instrument from any asset class.',
    schemaUrl: 'https://fdc3.finos.org/schemas/1.2/instrument.schema.json',
  },
  {
    directory: 'fdc3',
    type: 'contactList',
    description:
      'A collection of contacts, e.g. for chatting to or calling multiple contacts.',
    schemaUrl: 'https://fdc3.finos.org/schemas/1.2/contactList.schema.json',
  },
  {
    directory: 'fdc3',
    type: 'organization',
    description:
      'An entity that can be used when referencing private companies and other organizations where a specific instrument is not available or desired e.g. CRM and News workflows.',
    schemaUrl: 'https://fdc3.finos.org/schemas/1.2/organization.schema.json',
  },
  {
    directory: 'fdc3',
    type: 'portfolio',
    description:
      'A financial portfolio made up of multiple positions (holdings) in several instruments. Contrast this with e.g. the InstrumentList type, which is just a list of instruments.',
    schemaUrl: 'https://fdc3.finos.org/schemas/1.2/portfolio.schema.json',
  },
  {
    directory: 'fdc3',
    type: 'instrumentList',
    description:
      'A collection of instruments. Use this type for use cases that require not just a single instrument, but multiple (e.g. to populate a watchlist).',
    schemaUrl: 'https://fdc3.finos.org/schemas/1.2/instrumentList.schema.json',
  },
  {
    directory: 'fdc3',
    type: 'contact',
    description:
      'A person contact that can be engaged with through email, calling, messaging, CMS, etc.',
    schemaUrl: 'https://fdc3.finos.org/schemas/1.2/contact.schema.json',
  },
  {
    directory: 'fdc3',
    type: 'country',
    description: 'A country entity.',
    schemaUrl: 'https://fdc3.finos.org/schemas/1.2/country.schema.json',
  },
];
