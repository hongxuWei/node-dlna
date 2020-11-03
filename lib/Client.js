const { EventEmitter } = require('events');
const Axios = require('axios');
const xml2js = require('xml2js');
const SSDP_Client = require('node-ssdp').Client;

// SSDP search interval
const SEARCH_INTERVAL = 1000;
// SSDP search duration
const SEARCH_DURATION = 3000;

let intervalTimer = null;
let searchDurationTimer = null;

// clear search timer
const clearTimer = () => {
  if (searchDurationTimer) {
    clearTimeout(searchDurationTimer);
    searchDurationTimer = null;
  }
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}

// device description xml cache
const descriptionCache = {};

// DLAN Client
class Client extends EventEmitter {
  constructor() {
    super();
    this.devices = [];
    this.client = new SSDP_Client();
    this.client.on('response', async(headers, statusCode, rinfo) => {
      if (statusCode === 200) {
        const { LOCATION } = headers;
        if (this.devices.find((d) => d.LOCATION === LOCATION)) {
          return;
        }
        const res = await Axios.default.get(headers.LOCATION, {
          timeout: 3000,
        });
        console.log(await xml2js.parseStringPromise(res.data));
        this.devices.push(headers);
        this.emit('device', headers, statusCode, rinfo);
      }
    });
  }

  // start search devices
  search (type = 'upnp:rootdevice') {
    return new Promise((reslove) => {
      // life cycle -> onStart
      this.emit('search', type);
      intervalTimer = setInterval(() => {
        this.client.search(type);
      }, SEARCH_INTERVAL);
      searchDurationTimer = setTimeout(() => {
        this.stop();
        reslove(this.devices);
      }, SEARCH_DURATION);
    });
  }

  // stop search
  stop () {
    // life cycle -> onStop
    this.emit('stop', this.devices);
    clearTimer();
  }
}

module.exports = Client;
