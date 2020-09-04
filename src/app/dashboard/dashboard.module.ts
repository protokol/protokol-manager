import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardShellComponent } from './components/dashboard-shell/dashboard-shell.component';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import {
  NzAvatarModule,
  NzDropDownModule,
  NzIconModule,
  NzTypographyModule,
} from 'ng-zorro-antd';
import { RouterModule } from '@angular/router';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { NgLetModule } from '@core/directives/ngLet.module';
import { DashboardStatusBarComponent } from '@app/dashboard/components/dashboard-status-bar/dashboard-status-bar.component';
import { NzSpaceModule } from 'ng-zorro-antd/space';

@NgModule({
  declarations: [DashboardStatusBarComponent, DashboardShellComponent],
  imports: [
    CommonModule,
    NzLayoutModule,
    NzMenuModule,
    FormsModule,
    HttpClientModule,
    NzIconModule,
    RouterModule,
    DashboardRoutingModule,
    NzAvatarModule,
    NzDropDownModule,
    NgLetModule,
    NzTypographyModule,
    NzSpaceModule,
  ],
})
export class DashboardModule {}
