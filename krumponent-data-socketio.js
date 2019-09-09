/**
`krumponent-data-socketio`
Component for Sprocket data subscription

@demo demo/index.html 
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import io from '/web_modules/socket.io-client.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

Polymer({
  _template: html`
    <style>
      :host {
        display: none;
      }
    </style>
`,

  is: 'krumponent-data-socketio',

  /**
  * Fired when data is received from Sprocket subscription.
  *
  * @event data-received
  * @param {object} data the data received
  */

  properties: {
    /** Enable console logging for this element */
    log: {
      type: Boolean,
      value: false,
    },
    /** Connect automatically, reconnect on changes */
    auto: {
      type: Boolean,
      value: false,
    },
    /** Sprocket user ID */
    authToken: {
      type: String
    },
    /** Sprocket secret/token */
    authSecret: {
      type: String
    },
    /** Sprocket stream ID (temporarily a single feed per component instance) */
    extraOptions: {
      type: String
    },
    /** Last message/data received from subscription */
    data: {
      type: Object,
      notify: true
    },
    /** socket connection url. defaulted to base url */
    url: {
      type: String,
      value: "//"
      //value: "localhost:9999"
    },
    /** socket connection url. defaulted to base url */
    path: {
      type: String
      //value: ""
    },
    /** purposefully disable connection */
    disabled: {
      type: Boolean,
      value: false,
      reflectToAttribute: true
    },
    _status: {
      type: String,
    }
  },

  observers: [
    '_connectionChanged(url, authToken, authSecret, extraOptions)',
    '_pathChanged(path)',
    '_connectionDisabled(disabled)', //for some reason this is not being triggered when a part of the observer above
    // '_statusChanged(_status)'
  ],

  /** Initiate connection to Sprocket */
  connect: function(){
    
      if(!this._socket && !this.disabled){
        this._log("initializing connection..");

        if(this.authToken && this.authSecret){
          //if auth then pass credentials through socket
          // future // this._socket = io.connect(this._tempaddress, {query: 'token='+this.auth.token});
        } else {
          this._socket = new io.connect(this.url, {path:this.path,  secure: true, rejectUnauthorized: false});
          this._log(this._socket);
        }

        this._socket.on('connect', function () {
            this._status = "connected";
            this._log(this._status);
            this._subscribe();
            this.dispatchEvent(new CustomEvent('socket-connected', {
                bubbles: true,
                composed: true,
                detail: {
                    path: this.path,
                    status: this._status,
                },
            }));
        }.bind(this));

        this._socket.on('reconnect', function () {
            this._status = "connected";
            this._log(this._status);
            this._subscribe();
            this.dispatchEvent(new CustomEvent('socket-reconnected', {
                bubbles: true,
                composed: true,
                detail: {
                    path: this.path,
                    status: this._status,
                },
            }));
        }.bind(this));

        this._socket.on('connect_error', function(err) {
            this._status = "error";
            this._log(this._status);
            this.dispatchEvent(new CustomEvent('socket-connection-error', {
                bubbles: true,
                composed: true,
                detail: {
                    path: this.path,
                    status: this._status,
                    error: err,
                },
            }));
        }.bind(this));

        this._socket.on('connect_timeout', function (err) {
            this._status = "error";
            this._log(this._status, err);
            console.log('error');
            this.dispatchEvent(new CustomEvent('socket-connect-error', {
                bubbles: true,
                composed: true,
                detail: {
                    path: this.path,
                    status: this._status,
                    error: err,
                },
            }));
        }.bind(this));

        this._socket.on('error', function (err) {
            this._status = "error";
            this._log(this._status, err);
            this.dispatchEvent(new CustomEvent('socket-error', {
                bubbles: true,
                composed: true,
                detail: {
                    path: this.path,
                    status: this._status,
                    error: err,
                },
            }));
        }.bind(this));

        this._socket.on('disconnect', function () {
            this._status = "disconnected";
            this._log(this._status);
            this._cleanup();
            this.dispatchEvent(new CustomEvent('socket-disconnected', {
                bubbles: true,
                composed: true,
                detail: {
                    path: this.path,
                    status: this._status,
                },
            }));
        }.bind(this));
      }

  },

  ready: function(){
    if(this.auto){
      setTimeout(function(){this.connect()}.bind(this), 1000);
    }
  },

  detached: function() {
    this._log("detached");
    this.disconnect();
  },

  /** Print log message if logging is enabled */
  _log: function(log){
    if(this.log){
      console.log(log);
    }
  },

  /** Detect subscription changes and trigger reconnect workflow */
  _connectionChanged: function(url, secret, stream, options){
    this._log("connection changed");
    if(this.auto){
      if(this._socket)
        this.disconnect();
      this.connect();
    }
  },

  /** Detect path changes and trigger reconnect workflow */
  _pathChanged: function(path){
    // we shouldn't need this, but the standard multi-observer is not picking up state changes.
    this._connectionChanged();
  },

  /** Detect subscription changes and trigger reconnect workflow */
  _connectionDisabled: function(disabled){
    // we shouldn't need this, but the standard multi-observer is not picking up state changes.
    this._connectionChanged();
  },

  /** Detect connection status changes and handle subscription handshake */
  _statusChanged: function(status){
    if(status + "" == "connected")
      this._subscribe();
    
    if(status + "" == "disconnected")
      this._cleanup();
  },

  /** Initiate connection to Sprocket. Will always be called by detached. */
  disconnect: function(){
      if(this._socket){
        this._log("disconnect");
        this._socket.emit('unsubscribe');
        this._socket.disconnect();
      }
      this._socket = undefined;
  },

  _subscribe: function(){
    //subscribe to feed
    this._log(this._socket);
    this._log("subscription");
    this._socket.emit('subscribe', { token : this.authToken, secret : this.authToken, options : this.extraOptions } );

    this._socket.on("complete", function(message){
      this._log("subscription status - " + JSON.stringify(message));
    }.bind(this));

    this._socket.on("data", function(message){
      this._log(message);
      this.set('data', message);
      this.fire('data-received', message);
    }.bind(this));
    
      
  },

  publish: function(subject, data) {
    if(this._status === "connected" && !(typeof subject === 'undefined')){
      this._log("publishing", subject, data);
      this._socket.emit(subject, data);
    }
  },

  _cleanup: function(){
    this._log("cleanup");
    // kill the listeners
    this._socket.removeAllListeners("complete");
    this._socket.removeAllListeners("data");
    // this._socket = undefined;
  }
});
