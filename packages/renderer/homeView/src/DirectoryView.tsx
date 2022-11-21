import React from 'react';

import './DirectoryView.css';

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
import { DirectoryApp } from '../../../main/src/directory/directory';

export class DirectoryView extends React.Component<
  {},
  { apps: Array<DirectoryApp> }
> {
  constructor(props) {
    super(props);
    this.state = { apps: [] };
  }

  componentDidMount() {
    const onFDC3Ready = async () => {
      //fetch apps from the directory, using system API (only available to system apps)

      const apps = await globalThis.sail.getApps();
      //clean up / normalize some of the directory data
      apps.forEach((app: DirectoryApp) => {
        //put in place holder images and icons if they aren't there...
        if (!app.screenshots) {
          app.screenshots = [];
        }
        if (!app.icons) {
          app.icons = [];
        }
      });
      this.setState({ apps: apps });
    };

    if (window.fdc3) {
      onFDC3Ready();
    } else {
      document.addEventListener('fdc3Ready', onFDC3Ready);
    }
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
      globalThis?.fdc3.open(name);
    };

    return (
      <div className="directoryContainer">
        <Grid
          container
          spacing={2}
          columns={{ xs: 4, sm: 8, md: 12 }}
          padding={2}
        >
          {this.state.apps.map((app: DirectoryApp) => (
            <Grid item xs={4} key={app.appId}>
              <Card sx={{ maxWidth: 345, minHeight: 350 }}>
                {app.screenshots!!.length > 0 ? (
                  app.screenshots!!.map((image) => (
                    <CardMedia
                      component="img"
                      image={image.src}
                      height="100"
                    ></CardMedia>
                  ))
                ) : (
                  <CardHeader
                    sx={{
                      backgroundColor: '#999',
                      height: 60,
                    }}
                  ></CardHeader>
                )}
                <CardContent>
                  <Typography gutterBottom variant="h5" component="div">
                    {app.icons && app.icons.length > 0 && (
                      <img
                        src={app.icons[0].src}
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
                      if (app.name) {
                        openApp(app.name);
                      }
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
      </div>
    );
  }
}
