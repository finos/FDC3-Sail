import React from 'react';
import { Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { RUNTIME_TOPICS } from '/@main/handlers/runtime/topics';

class PickerItem extends React.Component<
  { id: string; color: string; altColor: string },
  { selected: boolean }
> {
  constructor(props) {
    super(props);
    this.state = { selected: false };
  }

  componentDidMount() {
    (document as any).addEventListener(
      RUNTIME_TOPICS.CHANNEL_SELECTED,
      (event: CustomEvent) => {
        //highlight the channelPicker button on selection (remove on deselection)
        if (event.detail.channel) {
          this.setState({ selected: event.detail.channel === this.props.id });
        }
      },
    );
  }

  render() {
    const pickChannel = () => {
      console.log('pickChannel', this.props.id, this.state.selected);
      if (!this.state.selected) {
        globalThis.sail.joinChannel(this.props.id);
        this.setState({ selected: true });
        globalThis.sail.hideWindow();
      } else {
        globalThis.sail.leaveChannel(this.props.id);
      }
    };

    const Item = styled(Paper)(({ theme }) => ({
      backgroundColor: this.state.selected
        ? this.props.altColor
        : this.props.color,
      margin: 3,
      height: 35,
      width: 35,
      borderRadius: 3,
      square: true,
      textAlign: 'center',
      color: theme.palette.text.secondary,
      transition: 'backgroundColor .3s',
      ':hover': {
        backgroundColor: this.props.altColor,
        cursor: 'pointer',
      },
    }));
    return <Item onClick={pickChannel}> {this.state.selected}</Item>;
  }
}

export default PickerItem;
