// Paired cases for the NestJS and tRPC pack.

export default [
  {
    rule: 'NEST-GUARD',
    file: 'src/users.controller.ts',
    fire: `@Controller('users')
    export class UsersController {
      @UseGuards(AuthGuard)
      @Get()
      findAll() { return this.service.findAll(); }

      @Delete(':id')
      remove(@Param('id') id: string) { return this.service.remove(id); }
    }`,
    safe: [
      `@Controller('users')
       export class UsersController {
         @UseGuards(AuthGuard)
         @Get()
         findAll() { return this.service.findAll(); }

         @UseGuards(AuthGuard, RolesGuard)
         @Delete(':id')
         remove(@Param('id') id: string) { return this.service.remove(id); }
       }`,
      // Nothing guarded here, so a global guard is the likely explanation and
      // a finding would be noise.
      `@Controller('users')
       export class UsersController {
         @Get()
         findAll() { return this.service.findAll(); }

         @Delete(':id')
         remove(@Param('id') id: string) { return this.service.remove(id); }
       }`,
      `@Controller('users')
       @UseGuards(AuthGuard)
       export class UsersController {
         @Delete(':id')
         remove(@Param('id') id: string) { return this.service.remove(id); }
       }`,
    ],
  },

  {
    rule: 'NEST-PUBLIC',
    file: 'src/admin.controller.ts',
    fire: `@Controller('admin')
    export class AdminController {
      @Public()
      @Delete('purge')
      purge() { return this.service.purge(); }
    }`,
    safe: [
      `@Controller('admin')
       export class AdminController {
         @Delete('purge')
         purge() { return this.service.purge(); }
       }`,
      `@Controller('health')
       export class HealthController {
         @Public()
         @Get()
         check() { return { ok: true }; }
       }`,
    ],
  },

  {
    rule: 'NEST-WHITELIST',
    file: 'src/main.ts',
    fire: `app.useGlobalPipes(new ValidationPipe());`,
    safe: [
      `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));`,
      `app.useGlobalPipes(new ParseIntPipe());`,
    ],
  },

  {
    rule: 'TRPC-PUBLIC',
    file: 'src/router.ts',
    fire: `export const appRouter = router({
      deleteProject: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => db.project.delete({ where: { id: input.id } })),
      me: protectedProcedure.query(({ ctx }) => ctx.session.user),
    });`,
    safe: [
      `export const appRouter = router({
        deleteProject: protectedProcedure
          .input(z.object({ id: z.string() }))
          .mutation(({ ctx, input }) => db.project.delete({ where: { id: input.id, orgId: ctx.session.orgId } })),
      });`,
      `export const appRouter = router({
        health: publicProcedure.query(() => ({ ok: true })),
        me: protectedProcedure.query(({ ctx }) => ctx.session.user),
      });`,
    ],
  },

  {
    rule: 'TRPC-INPUT',
    file: 'src/router.ts',
    fire: `export const appRouter = router({
      search: protectedProcedure.query(({ input }) => db.item.findMany({ where: { name: input.term } })),
    });`,
    safe: [
      `export const appRouter = router({
        search: protectedProcedure
          .input(z.object({ term: z.string().max(80) }))
          .query(({ input }) => db.item.findMany({ where: { name: input.term } })),
      });`,
      `export const appRouter = router({
        me: protectedProcedure.query(({ ctx }) => ctx.session.user),
      });`,
    ],
  },
];
