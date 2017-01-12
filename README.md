# Let's Chat - LDAP Plugin

Add LDAP authentication to [Let's Chat](http://sdelements.github.io/lets-chat/).

### Install

```
npm install lets-chat-ldap
```

### Configure

###### Example 1

```yml
auth:
  providers: [ldap]

  ldap:
    connect_settings:
      url: ldap://ldap.example.com
      tlsOptions:
        ca: ca.pem
    bind_options:
      bindDN: uid=letschat,cn=sysusers,cn=accounts,dc=example,dc=com
      bindCredentials: Pa$$word123
    search:
      base: cn=users,cn=accounts,dc=example,dc=com
      opts:
        scope: one # Base search (base), one level search (one) or subtree search (sub)
        filter: (uid={{username}}) # Only {{username}} is available
    field_mappings:
      uid: uid # LDAP unique ID
      username: uid # used for mention (@uid)
      firstName: givenName
      lastName: sn
      displayName: givenName
      email: mail
```

###### Example 2

```yml
auth:
  providers: [ldap]

  ldap:
    connect_settings:
      url: ldap://ldap.example.com:389
    bind_options:
      bindDN: CN=LetsChat,CN=Users,DC=example,DC=com
      bindCredentials: Pa$$word123
    search:
      base: "CN=Users,DC=example,DC=com"
      opts:
        scope: one
        filter: (sAMAccountName={{username}})
    field_mappings:
      uid: sAMAccountName
      firstName: givenName
      lastName: sn
      displayName: givenName
      email: mail
```

##### ENV Variables

It's also possible to configure the plugin using the following environment variables:

```
LCB_AUTH_PROVIDERS
LCB_AUTH_LDAP_CONNECT_SETTINGS_URL
LCB_AUTH_LDAP_CONNECT_SETTINGS_TLS_OPTIONS_CA
LCB_AUTH_LDAP_BIND_OPTIONS_BIND_DN
LCB_AUTH_LDAP_BIND_OPTIONS_BIND_CREDENTIALS
LCB_AUTH_LDAP_SEARCH_BASE
LCB_AUTH_LDAP_SEARCH_OPTS_FILTER
LCB_AUTH_LDAP_SEARCH_OPTS_SCOPE
LCB_AUTH_LDAP_FIELD_MAPPINGS_UID
LCB_AUTH_LDAP_FIELD_MAPPINGS_USERNAME
LCB_AUTH_LDAP_FIELD_MAPPINGS_EMAIL
LCB_AUTH_LDAP_FIELD_MAPPINGS_FIRSTNAME
LCB_AUTH_LDAP_FIELD_MAPPINGS_LASTNAME
LCB_AUTH_LDAP_FIELD_MAPPINGS_DISPLAY_NAME
```
