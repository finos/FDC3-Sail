import React from 'react';
import {
  Paper,
  Card,
  CardContent,
  CardMedia,
  CardHeader,
  Typography,
  CardActions,
  Button,
  Grid,
} from '@mui/material';
import { TOPICS } from '../../../main/src/constants';
import { DirectoryApp } from '../../../main/src/types/FDC3Data';

export class DirectoryView extends React.Component<
  {},
  { apps: Array<DirectoryApp> }
> {
  constructor(props) {
    super(props);
    this.state = { apps: [] };
  }

  componentDidMount() {
    document.addEventListener('fdc3Ready', (() => {
      //fetch apps from the directory, using system API (only available to system apps)
      if ((globalThis as any).home && (globalThis as any).home.getApps) {
        (globalThis as any).home.getApps().then((apps) => {
          //clean up / normalize some of the directory data
          apps.forEach((app: DirectoryApp) => {
            //put in place holder images and icons if they aren't there...
            if (!app.images) {
              app.images = [];
            }
            if (!app.icons) {
              app.icons = [];
            }
          });
          this.setState({ apps: apps });
        });
      }
    }) as EventListener);
  }

  resultSelected(result: any) {
    document.dispatchEvent(
      new CustomEvent(TOPICS.RES_RESOLVE_INTENT, {
        detail: { selected: result },
      }),
    );
  }

  render() {
    const openApp = (name: string) => {
      if ((globalThis as any).fdc3) {
        (globalThis as any).fdc3.open(name);
      }
    };

    return (
      <Paper
        sx={{
          padding: '1rem',
          margin: '1rem',
          backgroundColor: '#ccc',
        }}
      >
        <Grid container spacing={2} columns={{ xs: 4, sm: 8, md: 12 }}>
          {this.state.apps.map((app: DirectoryApp) => (
            <Grid item xs={4}>
              <Card sx={{ maxWidth: 345, minHeight: 350 }}>
                {app.images.length > 0 ? (
                  app.images.map((image) => (
                    <CardMedia
                      component="img"
                      image={image.url}
                      height="120"
                    ></CardMedia>
                  ))
                ) : (
                  <CardHeader
                    sx={{
                      backgroundColor: '#999',
                      height: 80,
                    }}
                  ></CardHeader>
                )}
                <CardContent>
                  <Typography gutterBottom variant="h5" component="div">
                    {app.icons && app.icons.length > 0 && (
                      <img
                        src={app.icons[0].icon}
                        className="appIcon"
                        alt={`${app.name} - icon`}
                      ></img>
                    )}
                    {app.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {app.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    onClick={() => {
                      openApp(app.name);
                    }}
                    size="small"
                  >
                    Open
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }
}
