<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

# Homebridge plugin for RESOL VBus Controllers
[![npm version](https://img.shields.io/npm/v/homebridge-resol-vbus?style=flat-square)](https://www.npmjs.com/package/homebridge-resol-vbus)
[![Issues Status](https://img.shields.io/github/issues/ChristophFausak/homebridge-resol-vbus?style=flat-square)](https://github.com/ChristophFausak/homebridge-resol-vbus/issues)
[![License](https://img.shields.io/npm/l/homebridge-resol-vbus.svg)](http://opensource.org/licenses/Apache-2.0)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

This is a plugin for [Homebridge](https://github.com/homebridge/homebridge).
It allows you to connect [RESOL](https://www.resol.de) VBus solar and system controllers.

The plugin uses the library [danielwippermann/resol-vbus](https://github.com/danielwippermann/resol-vbus).

## Installation

To install the plugin, run:

```
sudo npm install -g homebridge-resol-vbus

```

## Configuration

Use the Homebridge UI to configure the plugin

## Changes

### v1.1.0
Pump outlets readonly
Pump outlets without Active characteristic

### v1.0.0
Add pump outlets as fan accessory

### v0.2.0
Currently, the plugin adds only Temperature sensors as accessories.

