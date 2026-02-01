import { Elysia } from 'elysia'
import { openapi } from '@elysiajs/openapi'
import { z } from 'zod'

new Elysia()
  .use(openapi())
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
  })
  .listen(3333);

console.log(`🦊 Elysia is running on port 3333`);

