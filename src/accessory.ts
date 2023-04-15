import { Service, Characteristic, PlatformAccessory } from 'homebridge';

import { vbusServer } from './vbusServer';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

export class vBusTemperatureSensor {
    private service: Service;
    private tempCharacteristic: Characteristic;
    private accessory: PlatformAccessory;

    constructor(
        private readonly server: vbusServer,
        private data,
        private config,
    ) {
        const uuid = this.server.platform.api.hap.uuid.generate(data.name + data.type + data.accessoryID + data.serverID);

        const acc = this.server.getAccessory(uuid);
        if (acc) {
            this.accessory = acc;
        } else {
            this.accessory = new this.server.platform.api.platformAccessory(data.name, uuid);
            this.accessory.context.device = {
                serverID: data.serverID,
                accessoryID: data.accessoryID,
                name: config?.name || data.name,
                type: config?.type || data.type,
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
        let temp = Number(val);

        if (temp < -270) {
            temp = -270;
        } else if (temp > 100) {
            temp = 100;
        }

        if (this.tempCharacteristic.value !== temp) {
            this.server.log.debug('Server %s - temperature sensor %s new value:',
                this.data.serverID, this.accessory.displayName, temp);

            this.tempCharacteristic.updateValue(temp);
        }
    }
}

export class vBusFan {
    private service: Service;
    private onCharacteristic: Characteristic;
    private activeCharacteristic: Characteristic;
    private rotationCharacteristic: Characteristic;
    private accessory: PlatformAccessory;
    private value;

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
        private config,
    ) {
        const uuid = this.server.platform.api.hap.uuid.generate(data.name + data.type + data.accessoryID + data.serverID);

        const acc = this.server.getAccessory(uuid);
        if (acc) {
            this.accessory = acc;
        } else {
            this.accessory = new this.server.platform.api.platformAccessory(data.name, uuid);
            this.accessory.context.device = {
                serverID: data.serverID,
                accessoryID: data.accessoryID,
                name: config?.name || data.name,
                type: config?.type || data.type,
            };
            this.server.platform.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.accessory]);
        }

        this.accessory.getService(this.server.platform.Service.AccessoryInformation)!
            .setCharacteristic(this.server.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
            .setCharacteristic(this.server.platform.Characteristic.Model, 'Default-Model')
            .setCharacteristic(this.server.platform.Characteristic.SerialNumber, data.accessoryID);

        this.service = this.accessory.getService(this.server.platform.Service.Fan)
        || this.accessory.addService(this.server.platform.Service.Fan);

        this.onCharacteristic = this.service.getCharacteristic(this.server.platform.Characteristic.On);
        this.activeCharacteristic = this.service.getCharacteristic(this.server.platform.Characteristic.Active);
        this.rotationCharacteristic = this.service.getCharacteristic(this.server.platform.Characteristic.RotationSpeed);

        this.updateData(data.value);

        server.on(data.accessoryID, this.updateData.bind(this));
    }

    updateData(data) {
        let val = Number(data);
        if (val !== this.value)
        {
            this.server.log.debug('Server %s - pump outlat %s new value:',
                this.data.serverID, this.accessory.displayName, val);

            this.onCharacteristic.updateValue(val > 0);
            this.activeCharacteristic.updateValue((val > 0) ? this.server.platform.api.hap.Characteristic.Active.ACTIVE : this.server.platform.api.hap.Characteristic.Active.INACTIVE);
            this.rotationCharacteristic.updateValue(val);

            this.value = val;
        }
    }
}
