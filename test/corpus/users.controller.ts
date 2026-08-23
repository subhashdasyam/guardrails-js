// A NestJS controller written correctly. Nothing here may fire a rule.
// Near misses on purpose: guards on every mutating route, a validation pipe
// that strips unknown fields, and lookups scoped to the caller's org.

import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { CreateUserDto, UpdateUserDto } from './user.dto';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.service.findAllForOrg(req.user.orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.findOneForOrg(id, req.user.orgId);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: RequestWithUser) {
    return this.service.create(dto, req.user.orgId);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: RequestWithUser) {
    return this.service.updateForOrg(id, dto, req.user.orgId);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.removeForOrg(id, req.user.orgId);
  }
}

export function bootstrapPipes(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
}
