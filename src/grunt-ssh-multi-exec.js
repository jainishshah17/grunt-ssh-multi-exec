'use strict';

var fs  = require('fs'),
    ssh = require('ssh2'),
    log = console.log;

var init = function() {
    var done = this.async(),
        target = this.target,
        config = this.data,
        host = config.hosts[0],
        port = config.port,
        username = config.username,
        privateKey = config.privateKey,
        password = config.password,
        commands = config.commands,
        tunnel = new ssh();

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
                    } else {
                        log(shellPrefix + data.green);
                        success(data);

                        if(commands.length > 0) {
                            executeCommand(commands.shift());
                        }
                    }
                });

                stream.on('close', function() {
                    done();
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
};

module.exports = function(grunt) {
    grunt.registerMultiTask('ssh-multi-exec', 'Execute series of SSH commands', init);
    return init;
};