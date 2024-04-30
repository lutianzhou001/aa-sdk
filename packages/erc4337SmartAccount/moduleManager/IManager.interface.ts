export interface IManager {
  onInstall(initialization: any): void;
  onUninstall(uninstallation: any): void;
}
