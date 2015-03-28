var fs = require('fs'),
    _ = require('lodash'),
    util = require('util'),
    format = util.format,
    log4js = require('log4js'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    ldap = require('ldapjs'),
    LDAPStrategy = require('passport-ldapauth').Strategy,
    logger = log4js.getLogger('lets-chat-ldap');

function Ldap(options, core) {
    logger.info('Initializing');

    this.options = options;
    this.core = core;
    this.key = 'ldap';

    this.setup = this.setup.bind(this);
    this.getLdapStrategy = this.getLdapStrategy.bind(this);
}

Ldap.defaults = {
    connect_settings: {
        url: ''
    },
    bind_options: {
        bindDN: '',
        bindCredentials: ''
    },
    search: {
        base: '',
        opts: {
            scope: 'one',
            filter: '(uid={{username}})'
        }
    },
    field_mappings: {
        uid: 'uid',
        username: 'uid',
        firstName: 'givenName',
        lastName: 'sn',
        displayName: 'givenName',
        email: 'mail',
    }
};

Ldap.key = 'ldap';

Ldap.prototype.setup = function() {
    passport.use(this.getLdapStrategy());
    logger.info('Registered');
};

Ldap.prototype.authenticate = function(req, cb) {
    passport.authenticate('ldapauth', cb)(req);
};

Ldap.prototype.getLdapStrategy = function() {
    return new LDAPStrategy(
        {
            server: {
                url: this.options.connect_settings.url,
                tlsOptions: this.options.connect_settings.tlsOptions,
                adminDn: this.options.bind_options.bindDN,
                adminPassword: this.options.bind_options.bindCredentials,
                searchBase: this.options.search.base,
                searchFilter: this.options.search.opts.filter,
                searchAttributes: this.options.search.opts.attributes,
                searchScope: this.options.search.opts.scope
            },
            usernameField: 'username',
            passwordField: 'password'
        },
        function (user, done) {
            return Ldap.findOrCreateFromLDAP(this.options, this.core, user, done);
        }.bind(this)
    );
};

Ldap.findOrCreateFromLDAP = function(options, core, ldapEntry, callback) {
    var User = mongoose.model('User');
    var ldapUid = ldapEntry[options.field_mappings.uid]

    logger.trace(format('Searching in database for User %s', ldapUid));

    User.findOne({ uid: ldapUid }, function (err, user) {
        if (err) {
            return callback(err);
        }
        if (!user) {
            logger.trace(format('User %s not found in database, creating new one', ldapUid));
            Ldap.createLdapUser(core, options, ldapEntry, callback);
        } else {
            logger.trace(format('User %s found in database', ldapUid));
            return callback(null, user);
        }
    });
};

Ldap.createLdapUser = function(core, options, ldapEntry, callback) {
    var User = mongoose.model('User');
    var field_mappings = options.field_mappings;
    var ldapEmail = ldapEntry[field_mappings.email];
    var email = ldapEmail.toString().split(',')[0];

    var data = {
        uid: ldapEntry[field_mappings.uid],
        username: ldapEntry[field_mappings.username] ||
                  ldapEntry[field_mappings.uid],
        email: email,
        firstName: ldapEntry[field_mappings.firstName],
        lastName: ldapEntry[field_mappings.lastName],
        displayName: ldapEntry[field_mappings.displayName]
    };

    if (!data.displayName) {
        data.displayName = data.firstName + ' ' + data.lastName;
    }
    logger.trace(format('Attempting to add User %s to the database', data.uid));

    core.account.create(options.kerberos ? 'kerberos' : 'ldap',
                        data,
                        function (err, user) {
        if (err) {
            logger.error(err);
            return callback(err);
        }
        return callback(null, user);
    });
};

//LDAP sanitization
Ldap.sanitizeLDAP = function(ldapString) {
    return ldapString.replace(/[*\(\)\\\u0000!&|:~]{1}/g, function (match) {
        var cleanChar = match.charCodeAt(0).toString(16);
        return '\\' + (cleanChar.length === 1 ? '0': '') + cleanChar;
    });
};

// LDAP Authorization for external providers (ie. Kerberos)
Ldap.authorize = function(ldap_options, core, username, done) {
    var tlsOptions = ldap_options.connect_settings.tlsOptions;

    try {
        var options = {
            url: ldap_options.connect_settings.url
        };

        if (tlsOptions && tlsOptions.ca) {
            options.ca = fs.readFileSync(tlsOptions.ca);
        }

        var client = ldap.createClient(options);
        var bindDN = ldap_options.bind_options.bindDN;

        logger.trace(format('Binding to %s', bindDN));

        client.bind(bindDN, ldap_options.bind_options.bindCredentials,
            function (err) {

            if (err) {
                logger.error('Error encounter on bind '+ err);
                return done(err);
            }

            logger.trace('Bind successful');

            var clientOpts = _.clone(ldap_options.search.opts);

            var filter = (clientOpts.filter || '')
                .replace(/{{username}}/g, Ldap.sanitizeLDAP(username));

            clientOpts.filter = filter;

            logger.trace(format('Searching for User %s', username));

            client.search(ldap_options.search.base,
                clientOpts,
                Ldap.getLdapSearchCallback(ldap_options, client, core, username, done));
        });
    } catch (err) {
        logger.error('Error encountered during authorization: ' + err);
        return done(err);
    }
};

Ldap.getLdapSearchCallback = function(options, client, core, username, done) {
    return function(err, res) {
        if (err) {
            logger.error('Error encountered during search: ' + err);
            return done(err);
        }

        var foundUsers = [];

        res.on('searchEntry', function (entry) {
            foundUsers.push(entry.object);
        });

        res.on('error', function (err) {
            if (err) {
                return done(err);
            }
        });

        res.on('end', function (result) {
            if (result.status !== 0) {
                var err = new Error('non-zero status from LDAP search: ' +
                result.status);
                logger.error('Unexpected result status from LDAP search: ' + result.status);
                return done(err);
            }

            logger.trace(format('Search for %s found %d users', username, foundUsers.length));

            switch (foundUsers.length) {
                case 0:
                    return done();
                case 1:
                    Ldap.findOrCreateFromLDAP(options, core, foundUsers[0], done);
                    break;
                default:
                    var error = new Error(format(
                        'unexpected number of matches (%s) for "%s" username',
                        foundUsers.length, username));
                    return done(error);
            }

            if (!options.connect_settings.maxConnections) {
                logger.trace('Unbinding');
                client.unbind();
            }
        });
    };
};

module.exports = Ldap;
