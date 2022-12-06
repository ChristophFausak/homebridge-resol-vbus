import { Service, Characteristic, PlatformAccessory } from 'homebridge';

import { ResolVBusPlatform } from './platform';
import { vbusServer } from './vbusServer';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import util from "util";

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class vBusAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private accessoryStates = {
    Active: this.platform.api.hap.Characteristic.Active.INACTIVE,
  };

  constructor(
    private readonly platform: ResolVBusPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    this.service = this.accessory.getService(this.platform.Service.Valve) || this.accessory.addService(this.platform.Service.Valve);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.getActive.bind(this))
      .onSet(this.setActive.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.InUse)
      .onGet(this.getInUse.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ValveType)
      .onGet(this.getValveType.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ServiceLabelIndex)
      .onGet(this.getServiceLabelIndex.bind(this));
    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */

    // Example: add two "motion sensor" services to the accessory
    const motionSensorOneService = this.accessory.getService('Valve Sensor') ||
      this.accessory.addService(this.platform.Service.MotionSensor, 'Valve Sensor', 'YourUniqueIdentifier-3');
    const s = this.accessory.getService('Motion Sensor Two Name');
    if (s) {
      this.accessory.removeService(s);
    }

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    let motionDetected = false;
    setInterval(() => {
      // EXAMPLE - inverse the trigger
      motionDetected = !motionDetected;

      // push the new value to HomeKit
      motionSensorOneService.updateCharacteristic(this.platform.Characteristic.MotionDetected, motionDetected);

      this.platform.log.debug('Triggering motionSensorOneService:', motionDetected);
    }, 10000);
  }

  getActive() {
    this.platform.log.debug('Triggered GET Active');

    // set this to a valid value for Active
    const currentValue = this.accessoryStates.Active;

    return currentValue;
  }

  setActive(value) {
    this.platform.log.debug('Triggered SET Active:', value);

    this.accessoryStates.Active = value;
  }

  getInUse() {
    this.platform.log.debug('Triggered GET InUse');

    // set this to a valid value for InUse
    const currentValue = this.platform.Characteristic.InUse.IN_USE;

    return currentValue;
  }


  getValveType() {
    this.platform.log.debug('Triggered GET ValveType');

    // set this to a valid value for ValveType
    const currentValue = this.platform.Characteristic.ValveType.GENERIC_VALVE;

    return currentValue;
  }

  getServiceLabelIndex() {
    this.platform.log.debug('Triggered GET ServiceLabelIndex');

    return 122;
  }
}

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
//    private readonly platform: ResolVBusPlatform,
//    private readonly accessory: PlatformAccessory,
  ) {
 /*   data = {
      serverID: this.id,
      accessoryID: val.id,
      name: val.name,
      value: val.rawValue,
      type: 'temperatureSensor'
  }; */
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

    // set accessory information
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
