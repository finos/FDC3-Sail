import React from 'react';
import {Paper, Card, CardContent, CardMedia, Typography, CardActions, Button, Grid} from '@mui/material';
import {TOPICS} from '../../../main/src/constants';
import {DirectoryApp} from "../../../main/src/types/FDC3Data";


export class DirectoryView extends React.Component {

    constructor(props) {
        super(props);
        this.state = {apps: []}
      }

    componentDidMount() {
       (document as any).addEventListener("fdc3Ready",() => {
            //fetch apps from the directory, using system API (only available to system apps)
            if ((globalThis as any).home && (globalThis as any).home.getApps){
                (globalThis as any).home.getApps().then(apps => {
                    console.log("got apps", apps);
                    this.setState({apps:apps});
                });
            }
        });
    }
 

    resultSelected(result : any) {
        document.dispatchEvent(new CustomEvent(TOPICS.RES_RESOLVE_INTENT, {detail:{selected:result}}));
    }

    render() {
    
        const openApp = (name : string) => {
            if ((globalThis as any).fdc3){
                (globalThis as any).fdc3.open(name);
            }
        };
        
    return (
       
        <Paper sx={{
            padding:"1rem",
            margin:"1rem",
            backgroundColor:"#ccc"
        }}>
      
            <Grid container spacing={3}>
            {this.state.apps.map((app : DirectoryApp) => 
                <Grid item xs={6}>
                    <Card sx={{ maxWidth: 345 }}>
                        {app.icons.map((icon) => 
                        <CardMedia component="img" image={icon.icon} height="80">
                            
                        </CardMedia>
                        )}
                     <CardContent>
                            <Typography gutterBottom variant="h5" component="div">
                                {app.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {app.description}
                            </Typography>
                            
                        </CardContent>
                        <CardActions>
                            <Button onClick={() => {openApp(app.name);}} size="small">Open</Button>
                        </CardActions>
                    </Card>
                </Grid>
                
            )}
    </Grid>
    
    </Paper>

    );
                }
};

