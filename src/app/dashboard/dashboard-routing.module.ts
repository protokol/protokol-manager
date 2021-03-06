import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardShell } from './dashboard.service';

const routes: Routes = [
  DashboardShell.childRoutes([
    { path: '', pathMatch: 'full', redirectTo: 'peers' },
    {
      path: 'collections',
      loadChildren: () =>
        import('./pages/collections/collections.module').then(
          (m) => m.CollectionsModule
        ),
    },
    {
      path: 'assets',
      loadChildren: () =>
        import('./pages/assets/assets.module').then((m) => m.AssetsModule),
    },
    {
      path: 'transfers',
      loadChildren: () =>
        import('./pages/transfers/transfers.module').then(
          (m) => m.TransfersModule
        ),
    },
    {
      path: 'burns',
      loadChildren: () =>
        import('./pages/burns/burns.module').then((m) => m.BurnsModule),
    },
    {
      path: 'wallets',
      loadChildren: () =>
        import('./pages/wallets/wallets.module').then((m) => m.WalletsModule),
    },
    {
      path: 'profiles',
      loadChildren: () =>
        import('./pages/profiles/profiles.module').then(
          (m) => m.ProfilesModule
        ),
    },
    {
      path: 'nodes',
      loadChildren: () =>
        import('./pages/nodes/nodes.module').then((m) => m.NodesModule),
    },
    {
      path: 'auctions',
      loadChildren: () =>
        import('./pages/auctions/auctions.module').then(
          (m) => m.AuctionsModule
        ),
    },
    {
      path: 'bids',
      loadChildren: () =>
        import('./pages/bids/bids.module').then((m) => m.BidsModule),
    },
    {
      path: 'trades',
      loadChildren: () =>
        import('./pages/trades/trades.module').then((m) => m.TradesModule),
    },
    {
      path: 'peers',
      loadChildren: () =>
        import('./pages/peers/peers.module').then((m) => m.PeersModule),
    },
    {
      path: 'my-nodes',
      loadChildren: () =>
        import('./pages/my-nodes/my-nodes.module').then((m) => m.MyNodesModule),
    },
    {
      path: 'guardian',
      loadChildren: () =>
        import('./pages/guardian/guardian.module').then(
          (m) => m.GuardianModule
        ),
    },
    { path: '**', redirectTo: 'peers' },
  ]),
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [],
})
export class DashboardRoutingModule {}
