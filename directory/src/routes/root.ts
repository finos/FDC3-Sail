import { FastifyInstance } from 'fastify';

export const root = (fastify : FastifyInstance, options, done) => {
    fastify.get('/', async (request, reply) => {
        console.log("root request", request);
        reply
            .code(200)
            .header('Content-Type', 'application/json; charset=utf-8')
            .send({"description":"FDC3 App Directory API","version":"1.2"});
        
      });

      done();

};