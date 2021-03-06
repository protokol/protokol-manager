export interface CoreManagerResponse<T = any> {
  id: string;
  jsonrpc: string;
  result: T;
  error: {
    code: number;
    message: string;
  };
}

export interface InfoCoreVersion {
  currentVersion: string;
  latestVersion: string;
}

export type CoreManagerVersionResponse = CoreManagerResponse<InfoCoreVersion>;

export interface InfoBlockchainHeight {
  height: number;
}

export type CoreManagerBlockchainHeightResponse = CoreManagerResponse<
  InfoBlockchainHeight
>;

export interface InfoCurrentDelegate {
  rank: number;
  username: string;
}

export type CoreManagerCurrentDelegateResponse = CoreManagerResponse<
  InfoCurrentDelegate
>;

export interface LogArchivedItem {
  name: string;
  size: number;
  downloadLink: string;
}

export type CoreManagerLogArchivedResponse = CoreManagerResponse<
  LogArchivedItem[]
>;

export interface InfoCoreStatus {
  processStatus: ProcessStatus;
  syncing: boolean;
}

export type CoreManagerCoreStatusResponse = CoreManagerResponse<InfoCoreStatus>;

export interface InfoNextForgingSlot {
  remainingTime: number;
}

export type CoreManagerNextForgingSlotResponse = CoreManagerResponse<
  InfoNextForgingSlot
>;

export interface InfoLastForgedBlock {
  serialized: string;
  verification: {
    errors: any[];
    containsMultiSignatures: boolean;
    verified: boolean;
  };
  transactions: any[];
  data: {
    id: string;
    idHex: string;
    blockSignature: string;
    generatorPublicKey: string;
    payloadHash: string;
    payloadLength: number;
    reward: string;
    totalFee: string;
    totalAmount: string;
    numberOfTransactions: number;
    previousBlock: string;
    previousBlockHex: string;
    height: number;
    timestamp: number;
    version: number;
  };
}

export type CoreManagerLastForgedBlockResponse = CoreManagerResponse<
  InfoLastForgedBlock
>;

export type ProcessStatus = 'online' | 'offline';

export interface ProcessListItem {
  pid: number;
  name: string;
  pm_id: number;
  monit: {
    memory: number;
    cpu: number;
  };
  status: ProcessStatus;
}

export type CoreManagerProcessListResponse = CoreManagerResponse<
  ProcessListItem[]
>;

export type CoreManagerProcessResponse = CoreManagerResponse<ProcessListItem>;

export type CoreManagerConfigGetEnvResponse = CoreManagerResponse<string>;

export type CoreManagerConfigGetPluginsResponse = CoreManagerResponse<string>;

export interface SnapshotsCreatePayload {
  codec?: string;
  skipCompression?: boolean;
  start?: number;
  end?: number;
}

export interface SnapshotsListItem {
  name: string;
  size: number;
}

export type CoreManagerSnapshotsListResponse = CoreManagerResponse<
  SnapshotsListItem[]
>;

export interface SnapshotsRestorePayload {
  name?: string;
  truncate?: boolean;
  verify?: boolean;
}

export interface LogLogPayload {
  name: string;
  fromLine?: number;
  range?: number;
  showError?: boolean;
}

export interface LogLogResponse {
  totalLines: number;
  lines: string;
}

export type CoreManagerLogLogResponse = CoreManagerResponse<LogLogResponse>;

export interface InfoDiskSpaceItem {
  filesystem: string;
  size: number;
  used: number;
  available: number;
  capacity: number;
  mountpoint: string;
}

export type CoreManagerInfoDiskSpaceResponse = CoreManagerResponse<
  InfoDiskSpaceItem[]
>;
