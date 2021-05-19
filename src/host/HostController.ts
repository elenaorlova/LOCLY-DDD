import { Controller, Post } from '@nestjs/common';
import { AuthzScope, Identity } from '@rafaelsofizadeh/nestjs-auth/dist';
import { TokenIdentity } from '../auth/entity/Token';
import {
  GetHostDashboardLinksPayload,
  HostDashboardLinks,
  IGetHostDashboardLinks,
} from './application/GetHostDashboardLinks/IGetHostDashboardLinks';

@Controller('host')
export class HostController {
  constructor(private readonly getHostDashboardLinks: IGetHostDashboardLinks) {}

  @Post('dashboard')
  async getHostDashbordLinksController(
    @Identity() hostIdentity: TokenIdentity,
  ): Promise<HostDashboardLinks> {
    const dashboardLinksPayload: GetHostDashboardLinksPayload = {
      hostId: hostIdentity.entityId,
    };
  @AuthzScope(['account/host'])

    const dashboardLinks: HostDashboardLinks = await this.getHostDashboardLinks.execute(
      dashboardLinksPayload,
    );

    return dashboardLinks;
  }
}
