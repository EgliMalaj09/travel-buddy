// Beta server on Azure (KAN-61). Creates everything in ONE resource group in an EU region:
//   PostgreSQL (database), Storage (photo files), Container Apps (the API), Static Web App (back office), logs.
// Sized for the Azure free account (decisions/features/18-ship-part-1.md, S-a): free for 12 months, then the
// database and storage start to cost money. Nothing here runs until the owner deploys it by hand
// (docs/COMMANDS.md, "Beta server (KAN-61)"). Secrets are passed in when deploying, never written in this file.

targetScope = 'resourceGroup'

@description('EU region for everything. West Europe (Netherlands) by default.')
param location string = 'westeurope'

@description('Short name used in every resource name.')
@maxLength(12)
param prefix string = 'travelbeta'

@description('API image made by the "Deploy beta" workflow, for example ghcr.io/<owner>/travel-app-api:<commit>.')
param apiImage string

@description('GitHub user name that can read the image on ghcr.io.')
param registryUser string

@secure()
@description('GitHub token with only read:packages, to pull the private image.')
param registryToken string

@description('Database admin user name.')
param dbAdminUser string = 'travelapp_admin'

@secure()
@description('Database admin password (long, random). Kept only in your password manager.')
param dbAdminPassword string

@secure()
@description('ES256 signing key of the API (PEM). Made once with the command in docs/COMMANDS.md.')
param signingKeyPem string

@description('Mail service (SMTP) for the login codes.')
param emailHost string

param emailUserName string

@secure()
param emailPassword string

@description('Sender address, verified at the mail service.')
param emailFrom string

@secure()
@description('Email of the first back office owner (Admin:OwnerEmails). Personal data: passed in, never committed.')
param adminOwnerEmail string

@description('PowerSync Cloud instance address (https://<id>.powersync.journeyapps.com). Empty until PowerSync is set up.')
param powerSyncUrl string = ''

@description('Extra addresses allowed to reach the database, for example PowerSync Cloud\'s EU addresses.')
param databaseAllowedIps array = []

var suffix = uniqueString(resourceGroup().id)
var tags = { app: 'travel-app', env: 'beta' }

// ---------- Logs (free up to 5 GB a month; capped well below) ----------
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-logs'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: json('0.1') }
  }
}

// ---------- Photo files (private container "media") ----------
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: take('tbeta${suffix}', 24)
  location: location
  tags: tags
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource mediaContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobs
  name: 'media'
  properties: { publicAccess: 'None' }
}

// ---------- Database (PostgreSQL 17, the free-account size) ----------
resource db 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: '${prefix}-db-${suffix}'
  location: location
  tags: tags
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: '17'
    administratorLogin: dbAdminUser
    administratorLoginPassword: dbAdminPassword
    storage: { storageSizeGB: 32, autoGrow: 'Disabled' }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
    network: { publicNetworkAccess: 'Enabled' }
    authConfig: { activeDirectoryAuth: 'Disabled', passwordAuth: 'Enabled' }
  }
}

resource travelDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: db
  name: 'travelapp'
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}

// PowerSync reads changes through logical replication. Takes effect after a database restart (COMMANDS.md).
resource walLevel 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: db
  name: 'wal_level'
  properties: { value: 'logical', source: 'user-override' }
  dependsOn: [travelDb]
}

// 0.0.0.0 = "Azure services" (the API in Container Apps). No other address unless listed.
resource allowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: db
  name: 'allow-azure-services'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
  dependsOn: [walLevel]
}

@batchSize(1)
resource allowExtra 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = [for (ip, i) in databaseAllowedIps: {
  parent: db
  name: 'allow-extra-${i}'
  properties: { startIpAddress: ip, endIpAddress: ip }
  dependsOn: [allowAzure]
}]

// ---------- Back office (static web app, free plan) ----------
resource backoffice 'Microsoft.Web/staticSites@2023-12-01' = {
  name: '${prefix}-backoffice'
  location: location
  tags: tags
  sku: { name: 'Free', tier: 'Free' }
  properties: {}
}

// ---------- The API (Container Apps, scales to zero so it stays inside the free monthly grant) ----------
resource appEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${prefix}-env'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

var dbConnection = 'Host=${db.properties.fullyQualifiedDomainName};Port=5432;Database=travelapp;Username=${dbAdminUser};Password=${dbAdminPassword};SSL Mode=Require'
var blobConnection = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

var apiSecrets = [
  { name: 'db-connection', value: dbConnection }
  { name: 'blob-connection', value: blobConnection }
  { name: 'signing-key', value: signingKeyPem }
  { name: 'email-password', value: emailPassword }
  { name: 'admin-owner-email', value: adminOwnerEmail }
  { name: 'registry-token', value: registryToken }
]

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-api'
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: appEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
      }
      secrets: apiSecrets
      registries: [
        { server: 'ghcr.io', username: registryUser, passwordSecretRef: 'registry-token' }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Beta' }
            { name: 'ConnectionStrings__Database', secretRef: 'db-connection' }
            { name: 'Media__BlobConnectionString', secretRef: 'blob-connection' }
            { name: 'Auth__SigningKeyPem', secretRef: 'signing-key' }
            { name: 'Email__Host', value: emailHost }
            { name: 'Email__UserName', value: emailUserName }
            { name: 'Email__Password', secretRef: 'email-password' }
            { name: 'Email__From', value: emailFrom }
            { name: 'Admin__OwnerEmails__0', secretRef: 'admin-owner-email' }
            { name: 'Admin__AllowedOrigins__0', value: 'https://${backoffice.properties.defaultHostname}' }
            { name: 'Admin__PowerSyncUrl', value: powerSyncUrl }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
  dependsOn: [mediaContainer, allowAzure]
}

output apiUrl string = 'https://${api.properties.configuration.ingress.fqdn}'
output jwksUrl string = 'https://${api.properties.configuration.ingress.fqdn}/.well-known/jwks.json'
output backofficeUrl string = 'https://${backoffice.properties.defaultHostname}'
output backofficeName string = backoffice.name
output apiName string = api.name
output databaseHost string = db.properties.fullyQualifiedDomainName
