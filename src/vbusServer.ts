import EventEmitter from 'events';
import { Logger, PlatformAccessory } from 'homebridge';
import { ResolVBusPlatform } from './platform';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { vBusTemperatureSensor, vBusFan } from './accessory';

import {
    HeaderSetConsolidator,
    Specification,
    SerialConnection,
    TcpConnection,
    Connection,
} from 'resol-vbus';

export const connectionClassNames = {
    SerialConnection,
    TcpConnection,
};

export class vbusServer extends EventEmitter {
    public readonly log: Logger;
    private connection : Connection;
    private hsc : HeaderSetConsolidator;
    private specification: Specification;
    private accessoriesInitialized = false;
    private accessories: Map<string, PlatformAccessory> = new Map<string, PlatformAccessory> ();
    public readonly id: string;


    constructor(
        public readonly platform: ResolVBusPlatform,
        config,
    ) {
        super();
        this.id = config?.name + ' (' + (config.connectionOptions?.host || config.connectionOptions?.path) + ')';
        this.log = platform.log;
        this.log.debug('Starting VBus Server:', this.id);

        this.specification = Specification.getDefaultSpecification();

        const ConnectionClass = connectionClassNames[config.connectionClassName];
        this.connection = new ConnectionClass(config.connectionOptions);

        this.hsc = new HeaderSetConsolidator({
            interval: 10 * 1000,
        });

        this.connection.on('packet', (packet) => {
            this.hsc.addHeader(packet);
        });

        this.hsc.on('headerSet', (/*headerSet*/) => {
            this.CheckHeaderSet();
        });

    }

    addAccessory(acc: PlatformAccessory) {
        this.accessories[acc.UUID] = acc;
    }

    async launchFinished() {
        this.log.debug('launchFinished: Starting timer');
        await this.connection.connect();
        this.hsc.startTimer();
    }

    private initializeAccessories(data) {
        this.log.debug('Initializing accessories for', this.id);

        data.forEach(val => {
            if (val.packetFieldSpec?.type?.unit?.unitFamily === 'Temperature') {
                //this.log.debug('data:', val.packetFieldSpec?.type?.unit);

                this.log.debug('%s: Adding temperature sensor: ', this.id, val.name);
                new vBusTemperatureSensor(this, {
                    serverID: this.id,
                    accessoryID: val.id,
                    name: val.name,
                    value: val.rawValue,
                    type: 'temperatureSensor',
                }, {});
            } else if (val.packetFieldSpec?.type?.unit?.unitId === 'Percent') {
                this.log.debug('%s: Adding Fan accessory for pump outlet: ', this.id, val.name);
                new vBusFan(this, {
                    serverID: this.id,
                    accessoryID: val.id,
                    name: val.name,
                    value: val.rawValue,
                    type: 'fan-pump',
                }, {});
            } else {
                this.log.debug('%s: Skipping accessory:', this.id, val.name);

                // if (this.id === 'Solar (10.1.1.21)') {
                //    this.log.debug('data:', val.packetFieldSpec?.type?.unit);
                // }
            }

        });
        for (const [uuid, acc] of this.accessories) {
            this.log.info('%s: Removing unused accessory:', this.id, acc.context.device?.name || uuid);
            this.platform.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [acc]);
        }
    }

    getAccessory(uuid: string) : PlatformAccessory | undefined {
        const acc = this.accessories[uuid];
        if (acc) {
            this.accessories.delete(uuid);
        }

        return acc;
    }

    private CheckHeaderSet() {
        const pffh = this.specification.getPacketFieldsForHeaders(this.hsc.getSortedHeaders());

        if (!pffh.length) {
            this.log.warn('%s: No data from server.', this.id);
            this.log.debug('raw data:', this.hsc.getSortedHeaders());
            return;
        }

        if (!this.accessoriesInitialized) {
            this.accessoriesInitialized = true;
            return this.initializeAccessories(pffh);
        }

        pffh.forEach(val => {
            if (val.packetFieldSpec?.type?.unit?.unitFamily === 'Temperature') {
                this.emit(val.id, val.rawValue);
            } else if (val.packetFieldSpec?.type?.unit?.unitId === 'Percent') {
                this.emit(val.id, val.rawValue);
            }
        });
    }
}
