import \* as hiveGateway from "@graphql-hive/gateway";
console.log("Available exports from @graphql-hive/gateway:");
console.log(Object.keys(hiveGateway));

// script -> cat node_modules/@graphql-hive/gateway/dist/index.js | grep "export"
// cat node_modules/@graphql-hive/gateway/dist/index.d.ts | grep "export"
