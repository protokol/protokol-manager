import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { NodeCryptoConfiguration } from '@arkecosystem/client/dist/resourcesTypes/node';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { Logger } from '@core/services/logger.service';
import { NFTConnection } from '@protokol/nft-client';
import { ApiResponse } from '@arkecosystem/client/dist/interfaces';
import { Pagination } from '@app/@shared/interfaces/table.types';
import { AllCollectionsQuery, Assets } from '@protokol/nft-client/dist/resourcesTypes/base';
import { Collections } from '@protokol/nft-client/dist/resourcesTypes/base';

interface ConnectionOptions {
	timeout?: number;
}

@Injectable()
export class NodeClientService {
	readonly log = new Logger(this.constructor.name);

	static getConnection(
		baseUrl: string,
		{ timeout = 5000 }: ConnectionOptions = {}
	) {
		return new NFTConnection(`${baseUrl}/api`).withOptions({
			timeout: timeout || 5000,
		});
	}

	genericErrorHandler() {
		return (
			tap((response: ApiResponse<any>) => {
				if (response.body.errors) {
					this.log.error('Response contains errors:', response.body.errors);
				}
			}),
			catchError((err) => {
				this.log.error(err);
				return of(null);
			})
		);
	}

	constructor() {}

	getNodeCryptoConfiguration(
		baseUrl: string,
		connectionOptions?: ConnectionOptions
	): Observable<NodeCryptoConfiguration> {
		return from(
			NodeClientService.getConnection(baseUrl, connectionOptions)
				.api('node')
				.crypto()
		).pipe(
			map((response) => response.body.data),
			this.genericErrorHandler()
		);
	}

	getCollection(
		baseUrl: string,
		collectionId: string,
		connectionOptions?: ConnectionOptions
	): Observable<Collections> {
		return from(
			NodeClientService.getConnection(baseUrl, connectionOptions)
				.NFTBaseApi('collections')
				.get(collectionId)
		).pipe(
			map((response) => response.body),
			this.genericErrorHandler()
		);
	}

	getCollections(
		baseUrl: string,
		query: AllCollectionsQuery | {} = {},
		connectionOptions?: ConnectionOptions
	): Observable<Pagination<Collections>> {
		return from(
			NodeClientService.getConnection(baseUrl, connectionOptions)
				.NFTBaseApi('collections')
				.all({
					...query
				})
		).pipe(
			map((response) => response.body),
			this.genericErrorHandler()
		);
	}

	getAsset(
		baseUrl: string,
		assetId: string,
		connectionOptions?: ConnectionOptions
	): Observable<Assets> {
		return from(
			NodeClientService.getConnection(baseUrl, connectionOptions)
				.NFTBaseApi('assets')
				.get(assetId)
		).pipe(
			map((response) => response.body),
			this.genericErrorHandler()
		);
	}

	getAssets(
		baseUrl: string,
		query: AllCollectionsQuery | {} = {},
		connectionOptions?: ConnectionOptions
	): Observable<Pagination<Assets>> {
		return from(
			NodeClientService.getConnection(baseUrl, connectionOptions)
				.NFTBaseApi('assets')
				.all({
					...query
				})
		).pipe(
			map((response) => response.body),
			this.genericErrorHandler()
		);
	}
}
