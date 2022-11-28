import React, { useEffect } from 'react';

import './DirectoryView.css';

import {
  Card,
  CardContent,
  CardMedia,
  CardHeader,
  Typography,
  CardActions,
  Button,
  Grid,
} from '@mui/material';

import { DirectoryApp } from '../../../main/src/directory/directory';

function DirectoryView() {
  const [apps, setApps] = React.useState<Array<DirectoryApp>>([]);

  useEffect(() => {
    const getApps = async () => {
      //fetch apps from the directory, using system API (only available to system apps)
      const apps = await globalThis.sail.getApps();

      //Remove apps that are not supposed to be shown in the directory
      const searchableApps = apps.filter((app) => {
        return app.hostManifests.sail.searchable !== false;
      });

      searchableApps.forEach((app: DirectoryApp) => {
        //put in place holder images and icons if they aren't there...
        if (!app.screenshots) {
          app.screenshots = [];
        }
        if (!app.icons) {
          app.icons = [];
        }
      });

      setApps(searchableApps);
    };

    getApps();
  }, []);

  const openApp = (name: string) => {
    globalThis?.fdc3.open(name);
  };

  return (
    <div className="h-full overflow-y-scroll pb-10">
      <Grid
        container
        spacing={2}
        columns={{ xs: 4, sm: 8, md: 12 }}
        className="p-6"
      >
        {apps.map((app: DirectoryApp) => (
          <Grid item xs={4} key={app.appId}>
            <Card
              sx={{ maxWidth: 370, minHeight: 320 }}
              className="flex flex-col"
            >
              {app.screenshots!!.length > 0 ? (
                app.screenshots!!.map((image) => (
                  <CardMedia
                    component="img"
                    image={image.src}
                    className="h-40 p-4"
                    sx={{
                      backgroundColor: '#F7E9F2',
                    }}
                    key={app.appId}
                  ></CardMedia>
                ))
              ) : (
                <CardHeader
                  sx={{
                    backgroundColor: '#F7E9F2',
                  }}
                  className="h-40"
                ></CardHeader>
              )}
              <CardContent
                sx={{
                  backgroundColor: '#323232',
                }}
                className="h-full flex-grow"
              >
                <Typography
                  gutterBottom
                  component="div"
                  className="flex text-white"
                >
                  {app.icons && app.icons.length > 0 && (
                    <img
                      src={app.icons[0].src}
                      className="h-6 mr-3"
                      alt={`${app.name} - icon`}
                    ></img>
                  )}
                  {app.title}
                </Typography>
                <Typography variant="body2" className="text-gray-400">
                  {app.description}
                </Typography>
              </CardContent>
              <CardActions
                sx={{
                  backgroundColor: '#323232',
                }}
              >
                <Button
                  onClick={() => {
                    if (app.name) {
                      openApp(app.name);
                    }
                  }}
                  size="small"
                  sx={{ color: '#fff' }}
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

export default DirectoryView;
