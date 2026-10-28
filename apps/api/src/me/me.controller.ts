import { Controller, Get } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

@Controller('me')
export class MeController {
  @Get()
  me(@Session() session: UserSession) {
    const { id, name, email } = session.user;
    return { id, name, email };
  }
}
