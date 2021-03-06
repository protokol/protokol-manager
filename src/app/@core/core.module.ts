import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconsProviderModule } from './icons-provider.module';
import { NgxsModule } from '@ngxs/store';
import { ProfilesState } from './store/profiles/profiles.state';
import { environment } from '@env/environment';
import { NgxsStoragePluginModule, StorageOption } from '@ngxs/storage-plugin';
import { WalletService } from './services/wallet.service';
import { NodeClientService } from './services/node-client.service';
import { NetworksState } from '@core/store/network/networks.state';
import { StoreUtilsService } from '@core/store/store-utils.service';
import { HasProfileGuard } from '@core/guards/has-profile.guard';
import { PinsState } from '@core/store/pins/pins.state';
import { Bip38Service } from '@core/services/bip38.service';
import { bip38Factory } from '@core/factory/bip38.factory';
import { CollectionsState } from '@core/store/collections/collections.state';
import { AssetsService } from '@core/services/assets.service';
import { CollectionsService } from '@core/services/collections.service';
import { AjsfWidgetLibraryModule } from '@app/ajsf-widget-library/ajsf-widget-library.module';
import { TransfersService } from '@core/services/transfers.service';
import { BurnsService } from '@core/services/burns.service';
import { WalletsService } from '@core/services/wallets.service';
import { WalletsState } from '@core/store/wallets/wallets.state';
import { AssetsState } from '@core/store/assets/assets.state';
import { AuctionsService } from '@core/services/auctions.service';
import { BidsService } from '@core/services/bids.service';
import { TradesService } from '@core/services/trades.service';
import { NodeManagerService } from '@core/services/node-manager.service';
import { HttpClientModule } from '@angular/common/http';
import { PeersService } from '@core/services/peers.service';
import { NodesState } from '@core/store/nodes/nodes.state';
import { ManagerAuthenticationState } from '@core/store/manager-authentication/manager-authentication.state';
import { CryptoService } from '@core/services/crypto.service';
import { TransactionsService } from '@core/services/transactions.service';
import { PinataService } from '@core/services/pinata.service';
import { ArkCryptoService } from '@core/services/ark-crypto.service';
import { GuardianGroupsService } from '@core/services/guardian-groups.service';
import { GuardianUsersService } from '@core/services/guardian-users.service';
import { BaseService } from '@core/services/base.service';
import { BlockchainService } from '@core/services/blockchain.service';

@NgModule({
  declarations: [],
  imports: [
    NgxsModule.forRoot(
      [
        ProfilesState,
        NetworksState,
        PinsState,
        CollectionsState,
        WalletsState,
        AssetsState,
        NodesState,
        ManagerAuthenticationState,
      ],
      {
        developmentMode: !environment.production,
      }
    ),
    NgxsStoragePluginModule.forRoot({
      key: [
        ProfilesState,
        NetworksState,
        NodesState,
        // Preserve pins for development
        ...(environment.production ? [] : [PinsState]),
      ],
      storage: StorageOption.LocalStorage,
    }),
    CommonModule,
    IconsProviderModule,
    AjsfWidgetLibraryModule,
    HttpClientModule,
  ],
  providers: [
    BaseService,
    ArkCryptoService,
    NodeClientService,
    AssetsService,
    CollectionsService,
    TransfersService,
    BurnsService,
    WalletsService,
    AuctionsService,
    BidsService,
    TradesService,
    WalletService,
    NodeManagerService,
    StoreUtilsService,
    CryptoService,
    HasProfileGuard,
    PeersService,
    TransactionsService,
    PinataService,
    GuardianGroupsService,
    GuardianUsersService,
    BlockchainService,
    {
      provide: Bip38Service,
      useFactory: bip38Factory,
      deps: [ArkCryptoService],
    },
  ],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    // Import guard
    if (parentModule) {
      throw new Error(
        `${parentModule} has already been loaded. Import Core module in the AppModule only.`
      );
    }
  }
}
