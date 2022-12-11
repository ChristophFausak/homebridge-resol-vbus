import { Service, Characteristic, PlatformAccessory } from 'homebridge';

import { ResolVBusPlatform } from './platform';
import { vbusServer } from './vbusServer';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

export class vBusTemperatureSensor {
  private service: Service;
  private tempCharacteristic: Characteristic;
  private accessory: PlatformAccessory;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private accessoryStates = {
    Active: this.server.platform.api.hap.Characteristic.Active.INACTIVE,
  };

  constructor(
    private readonly server: vbusServer,
    private data,
    private config
  ) {
    const uuid = this.server.platform.api.hap.uuid.generate(data.name + data.type + data.accessoryID + data.serverID);

    const acc = this.server.getAccessory(uuid)
    if (acc) {
      this.accessory = acc;
    } else {
      this.accessory = new this.server.platform.api.platformAccessory(data.name, uuid);
      this.accessory.context.device = {
        serverID: data.serverID,
        accessoryID: data.accessoryID,
        name: config?.name || data.name,
        type: config?.type || data.type
      };
      this.server.platform.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.accessory]);
    }

    this.accessory.getService(this.server.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.server.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.server.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.server.platform.Characteristic.SerialNumber, data.accessoryID);

    this.service = this.accessory.getService(this.server.platform.Service.TemperatureSensor) 
      || this.accessory.addService(this.server.platform.Service.TemperatureSensor);

    this.tempCharacteristic = this.service.getCharacteristic(this.server.platform.Characteristic.CurrentTemperature);
    this.updateTemperature(data.value);

    server.on(data.accessoryID, this.updateTemperature.bind(this));
  }

  updateTemperature(val) {
    var temp = Number(val);

    if (temp < -270) {
      temp = -270;
    } else if (temp > 100) {
      temp = 100;
    }

    if (this.tempCharacteristic.value != temp) {
      this.server.log.debug("Server %s - temperature sensor %s new value:", 
      this.data.serverID, this.accessory.displayName, temp);
    
      this.tempCharacteristic.updateValue(temp);
    }
  } 
}
