// A tRPC router written correctly. Every procedure that touches data starts
// from the protected builder, declares an input schema, and scopes the query to
// the caller.

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './trpc';
import { db } from './db';

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true })),

  me: protectedProcedure.query(({ ctx }) => ctx.session.user),

  listProjects: protectedProcedure
    .input(z.object({ cursor: z.string().uuid().optional(), take: z.number().min(1).max(100) }))
    .query(({ ctx, input }) =>
      db.project.findMany({
        where: { orgId: ctx.session.orgId },
        cursor: input.cursor ? { id: input.cursor } : undefined,
        take: input.take,
      }),
    ),

  renameProject: protectedProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().min(1).max(120) }))
    .mutation(({ ctx, input }) =>
      db.project.update({
        where: { id: input.id, orgId: ctx.session.orgId },
        data: { name: input.name },
      }),
    ),

  deleteProject: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      db.project.delete({ where: { id: input.id, orgId: ctx.session.orgId } }),
    ),
});

export type AppRouter = typeof appRouter;
