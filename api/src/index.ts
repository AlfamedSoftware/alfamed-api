import { Elysia } from 'elysia'
import { z } from 'zod'
import { betterAuthPlugin } from './http/plugins/better-auth'
import { openapi } from '@elysiajs/openapi'
import { OpenAPI } from './http/plugins/better-auth'

new Elysia()
  .use(openapi({
    documentation: {
      components: await OpenAPI.components,
      paths: await OpenAPI.getPaths()
    }
  }))
  .use(betterAuthPlugin)
  .get("/", () => "Hello Elysia")
  .get("/users/:id", ({ params }) => {
    const userId = params.id;
    return { id: userId, name: "John Doe" }
  }, {
    detail: {
      summary: "Get a user by ID",
      description: "Get a user by ID",
      tags: ["users"],
    },
    params: z.object({
      id: z.string(),
    }),
    response: {
      200: z.object({
        id: z.string(),
        name: z.string(),
      }),
    },
    auth: true,
  })
  .listen(3333);

console.log(`🦊 Elysia is running on port 3333`);

