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
    private rotationCharacteristic: Characteristic;
    private accessory: PlatformAccessory;
    private value;

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
        this.rotationCharacteristic = this.service.getCharacteristic(this.server.platform.Characteristic.RotationSpeed);

        this.onCharacteristic.onSet(this.readonlyCharacteristic.bind(this));
        this.rotationCharacteristic.onSet(this.readonlyCharacteristic.bind(this));

        this.updateData(data.value);

        server.on(data.accessoryID, this.updateData.bind(this));
    }

    readonlyCharacteristic() {
        this.value = -1;
        throw new this.server.platform.api.hap.HapStatusError(this.server.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
    }

    updateData(data) {
        const val = Number(data);
        if (val !== this.value) {
            this.server.log.debug('Server %s - pump outlet %s new value:',
                this.data.serverID, this.accessory.displayName, val);

            this.onCharacteristic.updateValue(val > 0);
            this.rotationCharacteristic.updateValue(val);

            this.value = val;
        }
    }
}
