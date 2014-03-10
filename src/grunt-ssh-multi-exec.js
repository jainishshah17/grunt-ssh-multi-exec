'use strict';

var fs    = require('fs'),
    async = require('async'),
    ssh   = require('ssh2'),
    log   = console.log;

var init = function() {
    var done = this.async(),
        target = this.target,
        config = this.data,
        hosts = config.hosts,
        username = config.username,
        privateKey = config.privateKey,
        password = config.password,
        commands = config.commands,
        tunnel = new ssh();

    async.parallel([
        function(callback) {
            var host = hosts[0].split(':')[0],
                port = hosts[0].split(':')[1];

            tunnel.on('ready', function() {
                log(('\n\nexecuting command set "' + target + '" against hosts: ' + config.hosts).underline);

                var executeCommand = function(command) {
                    var shellPrefix = (username + '@' + host + ':~$ ').cyan;

                    var input = command.input.toString(),
                        success = command.success || function(){},
                        error = command.error || function(){};

                    log(shellPrefix + (input).yellow);

                    tunnel.exec(input, function(err, stream) {
                        if (err) {
                            throw err;
                        }

                        stream.on('data', function(data, extended) {
                            data = data.toString();
                            if(extended === 'stderr') {
                                log(shellPrefix + data.red);
                                error(data);
                                callback(null, null);
                            } else {
                                log(shellPrefix + data.green);
                                success(data);

                                if(commands.length > 0) {
                                    executeCommand(commands.shift());
                                } else {
                                    callback(null, null);
                                }
                            }
                        });
                    });
                };

                executeCommand(commands.shift());
            });

            tunnel.on('error', function(err) {
                log('Connection error: ' + err);
                done();
            });

            if(privateKey) {
                tunnel.connect({
                    host: host,
                    port: port,
                    username: username,
                    privateKey: fs.readFileSync(privateKey)
                });
            } else {
                tunnel.connect({
                    host: host,
                    port: port,
                    username: username,
                    password: password
                });
            }
        }
    ], function(){
        done();
    });
};

module.exports = function(grunt) {
    grunt.registerMultiTask('ssh-multi-exec', 'Execute series of SSH commands', init);
    return init;
};