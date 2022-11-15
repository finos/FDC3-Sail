import React from 'react';
import { Paper } from '@mui/material';
import { SessionState } from '../../../main/src/types/SessionState';

export class SessionView extends React.Component<
  {},
  { session: SessionState }
> {
  constructor(props) {
    super(props);
    this.state = { session: props.session };
  }

  componentDidMount() {
    const onFDC3Ready = async () => {
      //fetch apps from the directory, using system API (only available to system apps)

      const session = await globalThis.sail.getSessionState();

      this.setState({ session: session });
    };
    if (window.fdc3) {
      onFDC3Ready();
    } else {
      document.addEventListener('fdc3Ready', onFDC3Ready);
    }
  }

  render() {
    return (
      <Paper
        sx={{
          padding: '1rem',
          margin: '1rem',
          backgroundColor: '#ccc',
        }}
      >
        {JSON.stringify(this.state.session)}
      </Paper>
    );
  }
}
