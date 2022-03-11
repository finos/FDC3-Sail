import { appData } from '../data/apps';
import { FastifyRequest } from 'fastify';

export const apps = async (fastify) => {
  fastify.get('/apps', async () => {
    console.log('get apps', apps);
    return appData;
  });
};

export const app = async (fastify) => {
  fastify.get('/apps/:name', async (request) => {
    const filtered = appData.filter((app) => {
      return app.name === request.params.name;
    });
    if (filtered.length > 0) {
      return filtered[0];
    } else {
      return {};
    }
  });
};

/**
 *
 * @param fastify
 * @param options
 *
 * Search Query Params:
 *    - name
 *    - context: type of context supported by the app
 *    - intentName: name of intent supported by the app
 *    - query: open ended text search
 *
 */
export const search = async (fastify) => {
  fastify.get('/apps/search', async (request: FastifyRequest) => {
    const name: string | null = request.query['name']
      ? (request.query['name'] as string).toUpperCase()
      : null;
    const intentName: string | null = request.query['intentName']
      ? (request.query['intentName'] as string).toUpperCase()
      : null;
    const context: string | null = request.query['context']
      ? (request.query['context'] as string).toUpperCase()
      : null;
    const query: string | null = request.query['text']
      ? (request.query['text'] as string).toUpperCase()
      : null;

    const filtered = appData.filter((app) => {
      let match = false;

      match = name && app.name.toUpperCase().indexOf(name) > -1;
      if (!match && (intentName || context || query)) {
        app.intents.forEach((intent) => {
          if (!match && intentName) {
            match = intent.name.toUpperCase().indexOf(intentName) > -1;
          }
          if (!match && query) {
            match = intent.name.toUpperCase().indexOf(query) > -1;
          }
          if (!match && intentName) {
            match = intent.display_name.toUpperCase().indexOf(intentName) > -1;
          }
          if (!match && query) {
            match = intent.display_name.toUpperCase().indexOf(query) > -1;
          }
          if (!match && (context || query)) {
            intent.contexts.forEach((contextType) => {
              if (!match && context) {
                match = contextType.toUpperCase().indexOf(context) > -1;
              }
              if (!match && query) {
                match = contextType.toUpperCase().indexOf(query) > -1;
              }
            });
          }
        });
      }

      if (!match && query) {
        match = app.description.toUpperCase().indexOf(query) > -1;
      }

      return match;
    });
    if (filtered.length > 0) {
      return filtered;
    } else {
      return [];
    }
  });
};
