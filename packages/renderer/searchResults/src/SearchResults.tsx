import React from 'react';
import {Box, List, ListItem, ListItemText} from '@mui/material';
import {TOPICS} from '../../../main/src/constants';



export class SearchResults extends React.Component{

    constructor(props) {
        super(props);
        this.state = {results: []};
      }

    componentDidMount() {
        (document as any).addEventListener(TOPICS.RES_LOAD_RESULTS, (event : CustomEvent) => {
    
            this.setState({results:event.detail.results || []});
         });
    }
 

    resultSelected(result : any) {
        document.dispatchEvent(new CustomEvent(TOPICS.RESULT_SELECTED, {detail:{result:result}}));
    }

    render() {
        console.log("results", this.state.results);
    return (

        <Box sx={{
            minHeight:100,
            maxWidth:350,
            margin:0,
            padding:0
        }}>
        <List disablePadding>
            {this.state.results.map(result => 
                <ListItem key={result.name} disablePadding dense 
                sx={
                    {
                        paddingLeft:".6rem",
                        borderRadius:".3rem",
                        transition:"backgroundColor .5s",
                        ":hover":{background:"#ccc",cursor:"pointer"}
                    }}>
                        <ListItemText key={`${result.name}-text`} onClick={() => {this.resultSelected(result);}}
                primary={result.title}/></ListItem>
            )}
        </List>
        </Box>


    );
                }
};

