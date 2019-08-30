const NodeMediaServer = require('./node_media_server')
const Events          = require('events')
const ip              = require('ip')

const defaultConfig = {
    // logType: 4,
    relay: {
        ffmpeg: '/usr/local/bin/ffmpeg',
        update_interval: 20000,
        tasks: [{
            app: 'camera',
            mode: 'static',
            name: 'smartbeat',
            edge: '',
            rtsp_transport: 'tcp'
        }]
    },
    rtmp: {
        chunk_size: 100,
        gop_cache: false,
        ping: 60,
        ping_timeout: 30,
        port: 5430, /* choose something available at random */
        onListen: () => {}
    },
    http: {
        allow_origin: '*',
        port: 5432
    }
}


class MediaServer {
    constructor() {
        this.server  = null
        this.url     = null
        this.config  = defaultConfig
        this.running = false
        this.ready   = false
        this.events  = new Events()
    }

    run(url) {
        this.url = url
        if ((this.running === false) || (this.server === null)) {
            this.config = defaultConfig
            this.config.relay.tasks[0].edge = url
            this.config.rtmp.onListen = ()=>{
                console.info(this.proxyUrl())
                console.info(`port ${this.config.rtmp.port}`)
            }

            this.server = new NodeMediaServer(this.config)
            this.__setupEvents()
            this.server.run()
            this.running = true
        }
        else if (this.config.relay.tasks[0].edge !== url) {
            // analytics.info('new camera url')
            // node-media-server has a bug when calling stop()
            // process.kill(process.pid,'SIGTERM')
            this.stop()
            this.config = defaultConfig
            this.config.relay.tasks[0].edge = url

            this.server = new NodeMediaServer(this.config)
            this.__setupEvents()
            this.server.run()
        }
    }

    stop() {
        if (this.server !== null)
            this.server.stop()
    }

    proxyUrl()
    { return `rtmp://${ip.address()}:${this.config.rtmp.port}/camera/smartbeat` }

    on(name, callback)
    { this.events.addListener(name, callback) }

    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - *\
       !!! PRIVATE FUNCTIONS !!!
    \* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */

    __setupEvents() {
        this.server.on('postPublish', (_id, _args) => {
            console.info('StreamServer connected')
            this.events.emit('post')
            this.ready = true
            // CameraConnection.getInstance().resetCameraConnection();
            // monitor.update_proxy_url(this.getProxyUrl());
            // monitor.reset_camera_settings();
            // IoT.getInstance().checkin(); //we want a full checkin in order to upload information like the camera's IP
        });

        this.server.on('donePublish', (_id, _args) => {
            console.info('StreamServer disconnected')
            this.events.emit('done')
            this.ready = false
        });
    }
}


var server = new MediaServer()
server.run('rtsp://10.0.1.4/live0.264')
//setTimeout(() => server.stop() , 2*60*1000)
