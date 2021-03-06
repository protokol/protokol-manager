import { ProcessListItem } from '@core/interfaces/core-manager.types';

export const MANAGER_PROCESSES_TYPE_NAME = 'manager_processes';

export class LoadManagerProcesses {
  static type = `[${MANAGER_PROCESSES_TYPE_NAME}] LoadManagerProcesses`;

  constructor(public managerUrl?: string) {}
}

export class StartManagerProcess {
  static type = `[${MANAGER_PROCESSES_TYPE_NAME}] StartManagerProcess`;

  constructor(
    public processName: string,
    public args: string,
    public managerUrl?: string
  ) {}
}

export class RestartManagerProcess {
  static type = `[${MANAGER_PROCESSES_TYPE_NAME}] RestartManagerProcess`;

  constructor(public processName: string, public managerUrl?: string) {}
}

export class StopManagerProcess {
  static type = `[${MANAGER_PROCESSES_TYPE_NAME}] StopManagerProcess`;

  constructor(public processName: string, public managerUrl?: string) {}
}

export class SetManagerProcessesByIds {
  static type = `[${MANAGER_PROCESSES_TYPE_NAME}] SetManagerProcessesByIds`;

  constructor(public processes: ProcessListItem[] | ProcessListItem) {}
}
