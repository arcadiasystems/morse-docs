> Source: https://docs.morsecms.xyz/sdk-client-setup.html · Full docs: https://docs.morsecms.xyz/llms-full.txt
> Feedback: if these docs are stale, missing, or confusing, open an issue at https://github.com/arcadiasystems/morse-dcms/issues/new?labels=docs-feedback

# SDK Setup

> Install `morse-sdk`, wire a wallet adapter (server or browser), pick a Walrus access pattern, and learn how to narrow errors.

## Compatibility

`@arcadiasystems/morse-sdk` is built and tested against specific minor versions of its Mysten substrate. Newer or older versions are not validated and may produce runtime errors. The peer-dependency ranges in `package.json` enforce these bounds.

| Package | Version | Required |
| --- | --- | --- |
| `@arcadiasystems/morse-sdk` | 0.8.x | (this package) |
| `@mysten/sui` | >=2.16.2 <2.17.0 | Yes: types, gRPC client, keypairs |
| `@mysten/walrus` | >=1.1.6 <1.2.0 | Yes: default Walrus adapters (read + write) |
| `@mysten/seal` | >=1.1.3 <1.2.0 | Yes: encryption |

> **WARNING: Pin to the verified minor version**
>
> Mysten packages may ship breaking changes within the same major version. When a new version like `@mysten/walrus@1.2.0` is released, `morse-sdk` needs a coordinated bump and re-verification. Use `bun add @arcadiasystems/morse-sdk@~0.8.0` to lock to patch-level updates only.

The verified matrix is also exported programmatically as `TESTED_SUBSTRATE`, a frozen record of the tested `@mysten/sui`, `@mysten/seal`, and `@mysten/walrus` versions plus `verifiedOn` and `suiNetwork`. Log it during initialization or compare it against bundler-resolved versions in CI:

```typescript
import { TESTED_SUBSTRATE } from "@arcadiasystems/morse-sdk";

console.log(TESTED_SUBSTRATE["@mysten/walrus"]);  // "1.1.6"
```

## Runtime requirements

ESM-only (`"type": "module"`). CommonJS `require` is not supported.

| Runtime | Supported | Notes |
| --- | --- | --- |
| Bun | ≥ 1.2.0 | Primary development runtime. End-to-end test scripts use Bun. |
| Node | ≥ 18.0 | Uses ES2022 (private fields, `Error.cause`), `TextEncoder`, `crypto.getRandomValues`, `BigInt`. |
| Browser | Evergreen | Chrome / Edge / Firefox / Safari recent stable. Vite, Webpack, esbuild bundlers all handle the SDK with zero polyfills. |

The SDK works in both Node and browser environments. It does not depend on Node-specific APIs like `fs`, `path`, `process`, or `node:crypto`. Some `@mysten/*` packages may need polyfills in the browser. Check their docs if needed, though modern bundlers usually handle this automatically.

## Installing

`@mysten/sui`, `@mysten/walrus`, and `@mysten/seal` are all required peer dependencies. The SDK's main entry imports the default Walrus and Seal adapters, so both packages must be installed even for workflows that never upload or encrypt.

```bash
bun add @arcadiasystems/morse-sdk @mysten/sui@2.16.2 @mysten/walrus@1.1.6 @mysten/seal@1.1.3
```

## morseConfig() shape

`morseConfig({ network })` takes the target network (`"mainnet"`, `"testnet"`, or `"localnet"`) and returns a read-only object with the contract addresses and endpoints the SDK needs. All other fields have built-in defaults but can be overridden for custom deployments. Every SDK function takes this object as its `config` argument.

The returned object contains the following fields:

| Field | Type | Description |
| --- | --- | --- |
| `network` | `"mainnet" \| "testnet" \| "localnet"` | Sui network the config targets. |
| `rpcUrl` | `string` | Sui fullnode URL to pass as `baseUrl` when you construct `SuiGrpcClient`. The SDK never reads it itself; its readers and adapters take the client you build. Defaults to the public fullnode for the chosen network; override for a custom node. |
| `packageId` | `PackageId` | Current `published-at` address of the Morse Move package. Used as the target for all transaction calls. |
| `originalPackageId` | `PackageId \| undefined` | Genesis publish address (`original-id`). Sui uses this in `objectType` strings and type filters. Defaults to `packageId` when the package has never been upgraded. |
| `registryId` | `RegistryId` | Sui object ID of the shared `PublicationRegistry`. Required for publication creation and deletion. |
| `sealKeyServers` | `readonly KeyServerConfig[]` | Seal threshold-encryption key servers for the network. Each entry has an `objectId` and `weight`. Used by `DefaultSealAdapter` when no explicit server list is provided. |
| `walrusEndpoints` | `WalrusEndpoints` | Walrus HTTP endpoints. Contains `aggregator` (base URL for reads) and an optional `publisher` (base URL for HTTP-publisher writes). The publisher is intentionally unset by default; supply it explicitly for your operator. |

The options shape is exported as `MorseConfigOptions`, the accepted network names as the `Network` constant, and the per-network public fullnode defaults as `DEFAULT_RPC_URLS` (useful when you need the default endpoint without building a full config).

`PackageId` and `RegistryId` are branded `string` types: compile-time guards that prevent passing one kind of Sui address where another is expected. Cast a raw hex string with the `toPackageId()` / `toRegistryId()` codec helpers.

For quilt-mode collections, the SDK also ships codecs for the 37-byte `QuiltPatchId` (`QUILT_PATCH_ID_LENGTH` = 37): `quiltPatchIdFromString` / `quiltPatchIdToString` convert between the URL-safe base64 string Walrus emits and the branded bytes, and `encodeQuiltPatchId` / `decodeQuiltPatchId` convert between the bytes and their structured parts (`quiltBlobId`, `version`, `startIndex`, `endIndex`; the `QuiltPatchIdParts` type).

## Server setup

`RpcPublicationReader` provides read-only access to publications, collections, and entries via RPC. No keypair required.

To set up a server-side client, create a testnet config, a gRPC client, a `KeypairAdapter` for signing transactions, and an `RpcPublicationReader` for querying on-chain data.

```typescript
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  KeypairAdapter,
  morseConfig,
  RpcPublicationReader,
} from "@arcadiasystems/morse-sdk";

const privateKey = process.env.PRIVATE_KEY!;  // Bech32: "suiprivkey1..."

const config = morseConfig({ network: "testnet" });
const client = new SuiGrpcClient({
  network: "testnet",
  baseUrl: config.rpcUrl,
});
const keypair = Ed25519Keypair.fromSecretKey(privateKey);
const adapter = KeypairAdapter.fromSecretKey(privateKey, client);
const reader = RpcPublicationReader.fromMorseConfig(config, client);
```

`PRIVATE_KEY` must be a Bech32 `suiprivkey1...` string. Export it from your wallet's settings. Hex keys are not supported by `Ed25519Keypair.fromSecretKey`.

## Browser setup

For browser apps, the SDK connects to the user's wallet extension (e.g. Slush, Suiet) instead of `KeypairAdapter`. The private key stays in the wallet and is never exposed to the SDK.

### Providers

To wire the providers, add `SuiClientProvider` and `WalletProvider` to the root of the React component tree. `@mysten/dapp-kit` also requires `@tanstack/react-query` as a peer dependency.

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import "@mysten/dapp-kit/dist/index.css";

const queryClient = new QueryClient();
const networks = { testnet: { url: getFullnodeUrl("testnet") } };

<QueryClientProvider client={queryClient}>
  <SuiClientProvider networks={networks} defaultNetwork="testnet">
    <WalletProvider autoConnect>
      <App />
    </WalletProvider>
  </SuiClientProvider>
</QueryClientProvider>
```

### useMorse hook

Build the SDK context once per connected account. `WalletStandardSigner.fromAccount` wraps the account's public key and sign callbacks into a Sui `Signer`, so libraries like `@mysten/walrus` and `@mysten/seal` work without the SDK ever touching the user's key.

> **WARNING: gRPC transport required**
>
> The SDK is typed against `SuiGrpcClient` from `@mysten/sui/grpc`, not the JSON-RPC `SuiClient` used by most Sui browser apps. `SuiGrpcClient` works in modern evergreen browsers without a proxy. JSON-RPC fallback is planned but has not shipped yet; environments that block gRPC must proxy through a gRPC-compatible RPC endpoint until then.

```typescript
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSignPersonalMessage,
  useSignTransaction,
} from "@mysten/dapp-kit";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import {
  morseConfig,
  RpcPublicationReader,
  WalletStandardSigner,
} from "@arcadiasystems/morse-sdk";
import { useMemo } from "react";

import { WalletStandardAdapter } from "./WalletStandardAdapter";
// ^ Create this file in your project - see full source below

export function useMorse() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  return useMemo(() => {
    if (!account) return null;
    const config = morseConfig({ network: "testnet" });
    const client = new SuiGrpcClient({
      network: "testnet",
      baseUrl: config.rpcUrl,
    });

    // For @arcadiasystems/morse-sdk ops (createPublication, addEntry, ...).
    const adapter = new WalletStandardAdapter(
      account.address,
      ({ transaction }) => signAndExecute({ transaction }),
      client,
    );

    // For Walrus uploads and Seal SessionKey - both want a Sui `Signer`.
    // Decodes the scheme from the wallet's public key; refuses unsupported accounts.
    const signer = WalletStandardSigner.fromAccount(account, {
      signTransaction: ({ transaction }) => signTransaction({ transaction }),
      signPersonalMessage: ({ message }) => signPersonalMessage({ message }),
    });

    const reader = RpcPublicationReader.fromMorseConfig(config, client);
    return { adapter, signer, reader, config, client };
  }, [account, signAndExecute, signTransaction, signPersonalMessage]);
}
```

The `WalletStandardAdapter` wraps a dapp-kit wallet connection into the adapter interface the SDK expects. It bridges wallet-standard signing to the SDK's `SuiAdapter`, so the SDK can build and execute transactions without ever holding the user's private key. Create a `WalletStandardAdapter.ts` file in your project with the following adapter code:

```walletstandardadapter.ts
import {
  type ObjectReader,
  type SimulationReturnValues,
  type SuiAddress,
  type SuiObjectId,
  type TransactionExecutor,
  TransportError,
  type TxCreatedObject,
  type TxDeletedObject,
  type TxReceipt,
  toSuiAddress,
  toSuiObjectId,
  type WalletAdapter,
} from "@arcadiasystems/morse-sdk";
import type { SuiClientTypes } from "@mysten/sui/client";
import type { Transaction } from "@mysten/sui/transactions";

export type WalletSignAndExecute = (input: {
  transaction: Transaction;
}) => Promise<{ digest: string }>;

export class WalletStandardAdapter implements WalletAdapter {
  readonly address: SuiAddress;

  constructor(
    address: string,
    private readonly signAndExecute: WalletSignAndExecute,
    private readonly client: TransactionExecutor,
  ) {
    this.address = toSuiAddress(address);
  }

  // Execute via wallet extension, then wait for finality and parse effects.
  async signAndExecuteTransaction(
    tx: Transaction,
    signal?: AbortSignal,
  ): Promise<TxReceipt> {
    let digest: string;
    try {
      const result = await this.signAndExecute({ transaction: tx });
      digest = result.digest;
    } catch (cause) {
      throw new TransportError(
        `wallet sign-and-execute failed: ${cause instanceof Error ? cause.message : String(cause)}`,
        { cause },
      );
    }

    const final = await this.client.waitForTransaction({
      digest,
      include: { effects: true, objectTypes: true },
      ...(signal === undefined ? {} : { signal }),
    });

    if (final.$kind === "FailedTransaction") {
      throw new TransportError(
        failedTransactionMessage(final.FailedTransaction),
      );
    }
    return parseTxReceipt(final.Transaction);
  }

  // Dry-run the transaction to get return values without executing.
  async simulateTransaction(
    tx: Transaction,
    signal?: AbortSignal,
  ): Promise<SimulationReturnValues> {
    tx.setSenderIfNotSet(this.address);
    const result = await this.client.simulateTransaction({
      transaction: tx,
      include: { effects: true, commandResults: true },
      ...(signal === undefined ? {} : { signal }),
    });
    if (result.$kind === "FailedTransaction") {
      throw new TransportError(
        failedTransactionMessage(result.FailedTransaction),
      );
    }
    const commandResults = result.commandResults ?? [];
    return commandResults.map((cmd) => cmd.returnValues.map((rv) => rv.bcs));
  }
}

// Convert raw transaction effects into the SDK's TxReceipt shape.
function parseTxReceipt(
  tx: SuiClientTypes.Transaction<{ effects: true; objectTypes: true }>,
): TxReceipt {
  const effects = tx.effects;
  if (!effects) {
    throw new TransportError("transaction effects missing despite include flag");
  }
  const objectTypes = tx.objectTypes ?? {};
  return {
    digest: tx.digest,
    gasUsedMist: computeGasUsedMist(effects.gasUsed),
    createdObjects: collectCreated(effects.changedObjects, objectTypes),
    deletedObjects: collectDeleted(effects.changedObjects),
  };
}

// Net gas = computation + storage - rebate (in MIST).
function computeGasUsedMist(gas: SuiClientTypes.GasCostSummary): bigint {
  return (
    BigInt(gas.computationCost) +
    BigInt(gas.storageCost) -
    BigInt(gas.storageRebate)
  );
}

// Filter changed objects for newly created ones and attach their types.
function collectCreated(
  changes: readonly SuiClientTypes.ChangedObject[],
  objectTypes: Record<string, string>,
): TxCreatedObject[] {
  const out: TxCreatedObject[] = [];
  for (const change of changes) {
    if (change.idOperation !== "Created") continue;
    const objectType = objectTypes[change.objectId];
    if (objectType === undefined) continue;
    out.push({ objectId: toSuiObjectId(change.objectId), objectType });
  }
  return out;
}

// Filter changed objects for deleted ones.
function collectDeleted(
  changes: readonly SuiClientTypes.ChangedObject[],
): TxDeletedObject[] {
  const out: TxDeletedObject[] = [];
  for (const change of changes) {
    if (change.idOperation !== "Deleted") continue;
    out.push({ objectId: toSuiObjectId(change.objectId) });
  }
  return out;
}

function failedTransactionMessage(
  failed: SuiClientTypes.Transaction<{ effects: true }>,
): string {
  const error = failed.effects?.status?.error;
  if (error) {
    return `transaction failed: ${error.message}`;
  }
  return "transaction failed without effects status";
}
```

Slush, Suiet, and Sui Wallet (Ed25519) are verified. Secp256k1, Secp256r1, and Passkey decoders ship but Walrus + Seal end-to-end behavior is unverified. Fall back to Ed25519 if you see scheme-specific errors. ZkLogin is decoded but unverified; MultiSig is refused with `ConfigurationError` at `fromAccount` time. Wrap the call in try/catch and render unsupported accounts as product copy. 
See the full table in the [SDK README compatibility section](https://github.com/arcadiasystems/morse-dcms/blob/main/morse-sdk/README.md#wallet-scheme-support).

## Picking a Walrus adapter

The SDK ships two Walrus read adapters and two write adapters with different trade-offs. Read and write adapters can be mixed independently; for example, `DefaultWalrusWriteAdapter` (for the `addEntryFromBytes` optimization) with `HttpAggregatorReadAdapter` (for reliable testnet reads).

| Pair | Trust | Transactions (upload + addEntry) | Storage paid by | Browser CORS |
| --- | --- | --- | --- | --- |
| `DefaultWalrusReadAdapter` + `DefaultWalrusWriteAdapter` | Trustless (direct fanout to ~30 storage nodes) | **2** with `addEntryFromBytes`, **3** if split | Consumer wallet (WAL + gas) | Spotty on testnet |
| `HttpAggregatorReadAdapter` + `HttpPublisherWriteAdapter` | Operator-trusted | **1** (publisher uploads server-side; consumer only signs the `addEntry` transaction) | Publisher operator (WAL); consumer pays Sui gas only | Reliable (one endpoint) |

### Default adapter

Best for CLI scripts, server-side dapps, and browser dapps that do not hit testnet CORS gaps. The flow-aware optimization (`addEntryFromBytes`) cuts transactions from 3 to 2.

```typescript
import {
  DefaultWalrusReadAdapter,
  DefaultWalrusWriteAdapter,
} from "@arcadiasystems/morse-sdk";

const walrusReader = DefaultWalrusReadAdapter.fromConfig({
  network: "testnet",
  suiClient: client,
});
const walrusWriter = DefaultWalrusWriteAdapter.fromConfig(
  { network: "testnet", suiClient: client },
  keypair,  // or `signer` in the browser
);
```

### HTTP adapter

Best for browser dapps that need reliable CORS-friendly reads (one endpoint instead of ~30 nodes) and a "publisher pays storage" model where the user only signs the on-chain `addEntry`. Reads go through a trusted operator. To trust-but-verify, pass a `verifyBlobIntegrity` callback (type `WalrusBlobIntegrityCheck`) as a construction option. The adapter invokes it with the fetched bytes and the expected blob ID after every successful blob fetch, and it must throw on a mismatch (rewrapped as `TransportError`). Quilt patch reads are not verified.

```typescript
import {
  HttpAggregatorReadAdapter,
  HttpPublisherWriteAdapter,
} from "@arcadiasystems/morse-sdk";

const walrusReader = HttpAggregatorReadAdapter.fromMorseConfig(config, client, {
  // Optional trust-but-verify: runs after every blob fetch; throw on mismatch.
  verifyBlobIntegrity: async (bytes, expectedBlobId) => {
    // e.g. recompute via WalrusClient.computeBlobMetadata and compare blob IDs
  },
});
const walrusWriter = HttpPublisherWriteAdapter.fromConfig({
  publisherUrl: "https://walrus-testnet-publisher.nami.cloud",
  ownerAddress: account.address,
});
```

> **WARNING: HTTP adapters skip the 2-transaction optimization**
>
> The HTTP adapters are NOT compatible with `addEntryFromBytes` / `addEncryptedEntryFromBytes`. Those functions require `WalrusFlowCapable` for the combined PTB; the publisher-paid path is naturally 1 transaction through `uploadBlob` + `addEntry`. Check any `WalrusWriteAdapter` at runtime with the `isWalrusFlowCapable(walrus)` type guard.

> **WARNING: Use `HttpAggregatorReadAdapter` for reads**
>
> In morse-sdk 0.8.2, `DefaultWalrusReadAdapter.readBlobRef` and `readBlobByObjectId` (direct-node fanout with client-side verification) fail for every blob in a blob collection with `No valid blob metadata could be retrieved from any storage node`, on both plain and encrypted reads: they pass the decimal `blob_id` from the Sui object to Walrus instead of its base64url form. It is a bug, not storage nodes catching up, so waiting does not help. `HttpAggregatorReadAdapter` succeeds against the same blobs: it fetches from a single aggregator endpoint and skips client-side blob verification, so you trust the operator's bytes (pass `verifyBlobIntegrity` to add a check).

## Verifying setup

After completing either the server or browser setup above, confirm your connection works by listing publications owned by your address:

```typescript
const { results } = await reader.listPublicationsOwnedBy(adapter.address);
console.log(`Connected! Found ${results.length} publication(s).`);
```

A successful call confirms the client, config, and RPC endpoint are wired correctly, even if the count is 0. Follow the [SDK Cookbooks](https://docs.morsecms.xyz/sdk-workflows.html) to create your first publication.

## Error handling

Every error thrown by the SDK extends `MorseError`. Each error class carries structured properties, so errors can be handled by type without parsing message strings. All error classes are listed below; the first four are the most common.

| Class | Carries | Thrown when |
| --- | --- | --- |
| `ValidationError` | `field` | Client-side input failed a precondition. |
| `ContractAbortError` | `module`, `abortCode`, `reason` | Move VM aborted (e.g. `ESlugAlreadyExists`, `EPublisherCapRevoked`). |
| `TransportError` | `operation?` | RPC, network, or response-parsing failure. Usually retryable. |
| `UncertifiedBlobError` | `blobObjectId`, `blobId` | `addEntryFromBytes` upload succeeded but the second transaction failed; blob is on Walrus but unattached. |
| `NotFoundError` | `resource`, `identifier` | Object does not exist on-chain. |
| `UnauthorizedError` |  | Client-side auth check failed before submitting the transaction. |
| `SealError` | `code` | Seal authorization or decryption failed. Codes: `no-access`, `decrypt-failed`, `session-expired`, `rate-limited`. |
| `ConfigurationError` |  | SDK config issue, e.g. unsupported network. |
| `UnsupportedWalletSchemeError` | `code`, `publicKeyBytes`, `address`, `walletName?` | `WalletStandardSigner.fromAccount` rejected the account's public key shape or the recovery flow could not derive a matching address. |

To catch and inspect errors by type:

```typescript
import {
  ContractAbortError,
  TransportError,
  UncertifiedBlobError,
  ValidationError,
} from "@arcadiasystems/morse-sdk";

try {
  await quickstart(privateKey);
} catch (err) {
  if (err instanceof UncertifiedBlobError) {
    console.error(
      `uncertified blob ${err.blobObjectId} (id ${err.blobId}); upload succeeded but the entry was not created`,
    );
  } else if (err instanceof ContractAbortError) {
    console.error(`move abort: ${err.module}::${err.reason}`);
  } else if (err instanceof ValidationError) {
    console.error(`bad input on ${err.field}: ${err.message}`);
  } else if (err instanceof TransportError) {
    console.error(`transport: ${err.message}`);
  } else {
    throw err;
  }
}
```

### Formatting errors for UI

For end-user surfaces (toasts, dialogs, banners), `formatUserMessage(err)` translates any thrown value into a `FormattedError`: `{ title, description, cause }`. It accepts `unknown`, so it works directly in a catch block without narrowing first; non-`MorseError` throws fall back to a generic message, and the original error is preserved in `cause`.

```typescript
import { formatUserMessage } from "@arcadiasystems/morse-sdk";

try {
  await addEntryFromBytes(adapter, config, args);
} catch (err) {
  const { title, description } = formatUserMessage(err);
  toast.error(title, { description });  // e.g. "Slug already taken"
}
```

The copy uses the protocol's own terminology ("publication", "entry", "PublisherCap"). To translate into your app's domain (blog → post, gallery → image), narrow on the error class first and write your own message, then fall back to `formatUserMessage` for the rest.

## Next steps

- [SDK: Cookbooks](https://docs.morsecms.xyz/sdk-workflows.html): Create publications, add entries (plain + encrypted), read them back.
- [Quick Start: SDK](https://docs.morsecms.xyz/quick-start-sdk.html): End-to-end script: create a publication, add an entry, and read it back.
