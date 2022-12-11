import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { vbusServer, connectionClassNames } from './vbusServer';


export class ResolVBusPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly Servers: Map<string, vbusServer> = new Map<string, vbusServer>();
  private unusedAccessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Initializing platform:', this.config.name);

    const debug= config.debug === true;

    if (!Array.isArray(config.servers)) {
      config.servers = [];
    }

    config.servers.forEach(server => {
      if (!(server.connectionClassName in connectionClassNames)) {
        this.log.error('Server %s: Unnkown connectionClassName %s, skipping initialization.', 
          server.name, server.connectionClassName);
          return;
      }
      const s = new vbusServer(this, server);
      this.Servers.set(s.id, s);
    })

    this.api.on('didFinishLaunching', () => {
      this.discoverDevices();
    });
    this.log.debug('Finished initializing platform:', this.config.name);
  }

  configureAccessory(accessory: PlatformAccessory) {
    const server = this.Servers.get(accessory.context?.device?.serverID);

    if (server) {
      this.log.info('Loading accessory from cache:', accessory.displayName);
      server.addAccessory(accessory);
    } else {
      this.unusedAccessories.push(accessory);
    }
  }

  discoverDevices() {
    this.log.debug('discoverDevices');

    for (const [id, server] of this.Servers) {
      this.log.debug('discoverDevices: signal lauchFinished to:', id);
      server.launchFinished();
    }

    for (const accessory of this.unusedAccessories) {
      this.log.info('Removing accessory with unknown server:', accessory.displayName);
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);  
    }


    this.log.debug('discoverDevices: finished');
  }
}

