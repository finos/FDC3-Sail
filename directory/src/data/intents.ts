export const intentData = [
  {
    directory: 'fdc3',
    name: 'StartCall',
    display_name: 'Start a Call',
    description: 'Initiate a call with a contact or list of contacts.',
    contexts: [
      { type: 'contact', directory: 'fdc3' },
      { type: 'contactList', directory: 'fdc3' },
    ],
  },
  {
    directory: 'fdc3',
    name: 'ViewChart',
    display_name: 'View Chart',
    description: 'Display a chart for the provided instrument(s).',
    contexts: [
      { type: 'instrument', directory: 'fdc3' },
      { type: 'instrumentList', directory: 'fdc3' },
      { type: 'portfolio', directory: 'fdc3' },
      { type: 'position', directory: 'fdc3' },
    ],
  },
  {
    directory: 'fdc3',
    name: 'ViewQuote',
    display_name: 'View Quote',
    description: 'Display pricing for an instrument.',
    contexts: [{ type: 'instrument', directory: 'fdc3' }],
  },
  {
    directory: 'fdc3',
    name: 'ViewAnalysis',
    display_name: 'View Analysis',
    description: 'Display analysis on the provided context.',
    contexts: [
      { type: 'instrument', directory: 'fdc3' },
      { type: 'portfolio', directory: 'fdc3' },
      { type: 'organization', directory: 'fdc3' },
    ],
  },
  {
    directory: 'fdc3',
    name: 'ViewContact',
    display_name: 'View Contact Details',
    description: 'View details for a contact.',
    contexts: [{ type: 'contact', directory: 'fdc3' }],
  },
  {
    directory: 'fdc3',
    name: 'StartChat',
    display_name: 'Start a Chat',
    description: 'Initiate a chat with a contact or list of contacts.',
    contexts: [
      { type: 'contact', directory: 'fdc3' },
      { type: 'contactList', directory: 'fdc3' },
    ],
  },
  {
    directory: 'fdc3',
    name: 'ViewInstrument',
    display_name: 'View Instrument',
    description: 'Display details for the provided instrument.',
    contexts: [{ type: 'instrument', directory: 'fdc3' }],
  },
  {
    directory: 'fdc3',
    name: 'ViewNews',
    display_name: 'View News Stories',
    description: 'Display news stories for the provided context.',
    contexts: [
      { type: 'country', directory: 'fdc3' },
      { type: 'instrument', directory: 'fdc3' },
      { type: 'instrumentList', directory: 'fdc3' },
      { type: 'portfolio', directory: 'fdc3' },
      { type: 'organization', directory: 'fdc3' },
    ],
  },
];
