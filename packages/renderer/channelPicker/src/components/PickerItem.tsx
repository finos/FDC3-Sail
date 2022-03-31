import React from 'react';
import {Paper} from '@mui/material';
import { styled } from '@mui/material/styles';
import {TOPICS} from '../../../../main/src/constants';


class PickerItem extends React.Component <{id: string, color: string, altColor: string}, { selected : boolean } >{
  
    constructor(props) {
        super(props);
        this.state = {selected: false};
      }

    componentDidMount() {
        (document as any).addEventListener(TOPICS.CHANNEL_SELECTED, (event : CustomEvent) => {
            //highlight the channelPicker button on selection (remove on deselection)
            if (event.detail.channel && event.detail.channel.id){
                this.setState({selected :(event.detail.channel.id === this.props.id)});
            }
             
          });
    }


  render() {  

    const pickChannel = () => {
        console.log("pickChannel", this.props.id, this.state.selected);
        if (!this.state.selected){
            document.dispatchEvent(new CustomEvent(TOPICS.JOIN_CHANNEL, {detail:{"channel":this.props.id}}));
            this.setState({selected :true});
            document.dispatchEvent(new CustomEvent(TOPICS.HIDE_WINDOW));
        }
        else {
            document.dispatchEvent(new CustomEvent(TOPICS.LEAVE_CHANNEL, {detail:{"channel":this.props.id}}));
            this.setState({selected :false});
        }
    };


    const Item = styled(Paper)(({ theme }) => ({
        backgroundColor: this.props.color,
        margin:3,
        height:35,
        width:35,
        borderRadius:3,
        square:true,
        textAlign: 'center',
        color: theme.palette.text.secondary,
        transition: "backgroundColor .3s",
        ":hover": {
            backgroundColor: this.props.altColor,
            cursor:'pointer',
          },
        }));
    return (
        <Item onClick={pickChannel}> 
        </Item>
    );
  }
};

export default PickerItem;