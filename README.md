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
