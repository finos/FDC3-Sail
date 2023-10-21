import React from 'react';
import { EventListener } from 'jsdom';
import { Box, List, ListItem, ListItemText } from '@mui/material';
import { RUNTIME_TOPICS } from '../../../main/src/handlers/runtime/topics';

export class SearchResults extends React.Component<
  {},
  { results: Array<any> }
> {
  constructor(props) {
    super(props);
    this.state = { results: [] };
  }

  componentDidMount() {
    document.addEventListener(RUNTIME_TOPICS.SEARCH_LOAD_RESULTS, ((
      event: CustomEvent,
    ) => {
      this.setState({ results: event.detail.results || [] });
    }) as EventListener);
  }

  resultSelected(result: any) {
    globalThis.sail.search.selectResult(result.name);
  }

  render() {
    console.log('results', this.state.results);
    return (
      <Box
        sx={{
          minHeight: 100,
          maxWidth: 350,
          margin: 0,
          padding: 0,
        }}
      >
        <List disablePadding>
          {this.state.results.map((result) => (
            <ListItem
              key={result.name}
              disablePadding
              dense
              sx={{
                paddingLeft: '.6rem',
                borderRadius: '.3rem',
                transition: 'backgroundColor .5s',
                ':hover': { background: '#ccc', cursor: 'pointer' },
              }}
            >
              <ListItemText
                key={`${result.name}-text`}
                onClick={() => {
                  this.resultSelected(result);
                }}
                primary={result.title}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }
}
