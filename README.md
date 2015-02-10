# Let's Chat - LDAP Plugin

Add LDAP authentication to [Let's Chat](http://sdelements.github.io/lets-chat/).

Install:

```
npm install lets-chat-ldap
```

Configure:

```
auth:
  ldap:
    connect_settings:
      url: ldap://example.com
      tlsOptions:
        ca: ca.pem
    server_certs: []
    bind_options:
      bindDN:
      bindCredentials:
    search:
      base:
      opts:
        scope: one
        filter: (uid={{username}})
        attributes: []
    field_mappings:
      uid: uid
      firstName: givenName
      lastName: sn
      displayName: givenName
      email: mail
```
